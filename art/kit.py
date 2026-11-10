"""Hordebreak model kit: build low-poly characters in Blender (bmesh), bake
ambient occlusion into vertex colours, and export them in the game's vertex
format.

Blender coordinates: X right, -Y is the direction the character faces, Z up.
Game coordinates:    x right, y up, enemies face +z, troopers face -z.

Every part carries the attributes the game's vertex shader understands:
  col    base colour
  tint   1 = multiplied by the instance colour in game
  swing  radians the part swings about a hinge at height `pivot` (walk cycle)
  glow   ignores lighting
"""
import math
import random
import struct

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector
from mathutils.bvhtree import BVHTree

LOD = 0


def set_lod(level):
    global LOD
    LOD = level


def _vec2(s):
    return (s, s) if isinstance(s, (int, float)) else tuple(s)


def _vec3(s):
    return (s, s, s) if isinstance(s, (int, float)) else tuple(s)


def _rot(rot):
    return Euler([math.radians(a) for a in rot], 'XYZ').to_matrix().to_4x4()


class Part:
    __slots__ = ('bm', 'col', 'tint', 'swing', 'pivot', 'glow', 'smooth', 'ao')


class Model:
    def __init__(self, name, face=1, ground=True):
        self.name = name
        self.ground = ground
        self.face = face  # 1: faces +z in game (enemies); -1: faces -z (troopers)
        self.parts = []

    # ---- bookkeeping ----
    def _add(self, bm, kw):
        if kw.get('detail') and LOD > 0:
            bm.free()
            return None
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        p = Part()
        p.bm = bm
        p.col = tuple(kw.get('col', (1, 1, 1)))
        p.tint = kw.get('tint', 0)
        p.swing = kw.get('swing', 0)
        p.pivot = kw.get('pivot', 0)
        p.glow = kw.get('glow', 0)
        p.smooth = kw.get('smooth', 40)
        p.ao = kw.get('ao', p.glow < 0.5)
        self.parts.append(p)
        if kw.get('mirror'):
            bm2 = bm.copy()
            bmesh.ops.scale(bm2, vec=(-1, 1, 1), verts=bm2.verts)
            bmesh.ops.recalc_face_normals(bm2, faces=bm2.faces)
            q = Part()
            for k in Part.__slots__:
                setattr(q, k, getattr(p, k))
            q.bm = bm2
            q.swing = -p.swing
            self.parts.append(q)
        return p

    def _bevel(self, bm, amt):
        if amt > 0 and LOD == 0:
            bmesh.ops.bevel(bm, geom=list(bm.edges), offset=amt, offset_type='OFFSET', segments=1, profile=0.5,
                            affect='EDGES', clamp_overlap=True)

    # ---- primitives ----
    def box(self, c, size, rot=(0, 0, 0), taper=(1, 1), shear=(0, 0), bevel=0.025, **kw):
        """Box centred at c. taper scales the top face, shear slides it."""
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1)
        sx, sy, sz = size
        for v in bm.verts:
            top = v.co.z > 0
            v.co.x *= sx * (taper[0] if top else 1)
            v.co.y *= sy * (taper[1] if top else 1)
            v.co.z *= sz
            if top:
                v.co.x += shear[0]
                v.co.y += shear[1]
        self._bevel(bm, bevel)
        bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ _rot(rot), verts=bm.verts)
        return self._add(bm, kw)

    def rbox(self, c, size, round=0.6, rot=(0, 0, 0), taper=(1, 1), shear=(0, 0), cuts=2, **kw):
        """A soft, rounded block: a subdivided cube pushed toward a sphere.
        taper and shear run smoothly from the bottom to the top."""
        bm = bmesh.new()
        bmesh.ops.create_cube(bm, size=1)
        bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=1 if LOD else cuts, use_grid_fill=True)
        sx, sy, sz = size
        for v in bm.verts:
            p = v.co.copy()
            # distance to the cube surface along this direction is 0.5 / max|component|
            sph = p.normalized() * 0.5 * 1.18
            p = p.lerp(sph, round)
            t = min(1.0, max(0.0, p.z + 0.5))
            v.co.x = p.x * sx * (1 + (taper[0] - 1) * t) + shear[0] * t
            v.co.y = p.y * sy * (1 + (taper[1] - 1) * t) + shear[1] * t
            v.co.z = p.z * sz
        bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ _rot(rot), verts=bm.verts)
        kw.setdefault('smooth', 180)
        return self._add(bm, kw)

    def capsule(self, p0, p1, r0, r1=None, seg=8, **kw):
        """A limb with rounded ends. r0/r1 may be (width, depth)."""
        p0 = Vector(p0)
        p1 = Vector(p1)
        w0, d0 = _vec2(r0)
        w1, d1 = _vec2(r0 if r1 is None else r1)
        L = (p1 - p0).length
        n = max(5, seg * 2 // 3) if LOD else seg
        m0, m1 = (w0 + d0) / 2, (w1 + d1) / 2
        rows = [(0.0, -m0 * 0.95), (0.72, -m0 * 0.62), (1.0, 0.0)] if not LOD else [(0.0, -m0 * 0.9), (1.0, 0.0)]
        rows2 = [(1.0, L), (0.72, L + m1 * 0.62), (0.0, L + m1 * 0.95)] if not LOD else [(1.0, L), (0.0, L + m1 * 0.9)]
        bm = bmesh.new()
        rings = []
        for (k, h), (w, d) in [(r, (w0, d0)) for r in rows] + [(r, (w1, d1)) for r in rows2]:
            if k < 1e-5:
                rings.append([bm.verts.new((0, 0, h))])
            else:
                rings.append([bm.verts.new((math.cos(i / n * math.tau) * w * k, math.sin(i / n * math.tau) * d * k, h)) for i in range(n)])
        for a, b in zip(rings, rings[1:]):
            for i in range(n):
                j = (i + 1) % n
                if len(a) == 1:
                    bm.faces.new((a[0], b[j], b[i]))
                elif len(b) == 1:
                    bm.faces.new((a[i], a[j], b[0]))
                else:
                    bm.faces.new((a[i], a[j], b[j], b[i]))
        z = (p1 - p0).normalized()
        ref = Vector((1, 0, 0))
        if abs(z.dot(ref)) > 0.95:
            ref = Vector((0, 1, 0))
        x = (ref - z * ref.dot(z)).normalized()
        y = z.cross(x)
        m = Matrix(((x.x, y.x, z.x, p0.x), (x.y, y.y, z.y, p0.y), (x.z, y.z, z.z, p0.z), (0, 0, 0, 1)))
        bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
        kw.setdefault('smooth', 180)
        return self._add(bm, kw)

    def ball(self, c, r, rot=(0, 0, 0), sub=2, **kw):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=max(1, sub - (1 if LOD else 0)), radius=1)
        rx, ry, rz = _vec3(r)
        bmesh.ops.transform(bm, matrix=Matrix.Translation(c) @ _rot(rot) @ Matrix.Diagonal((rx, ry, rz, 1)), verts=bm.verts)
        kw.setdefault('smooth', 180)
        return self._add(bm, kw)

    def limb(self, p0, p1, s0, s1=None, round=False, seg=8, bevel=0.02, **kw):
        """A tapered bar from p0 to p1. s0/s1 are (width, depth) at each end."""
        p0 = Vector(p0)
        p1 = Vector(p1)
        w0, d0 = _vec2(s0)
        w1, d1 = _vec2(s0 if s1 is None else s1)
        L = (p1 - p0).length
        bm = bmesh.new()
        if round:
            n = max(5, seg * 2 // 3) if LOD else seg
            point = w1 < 1e-4
            bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=n, radius1=1, radius2=0 if point else 1, depth=L)
            for v in bm.verts:
                if v.co.z < 0:
                    v.co.x *= w0 / 2
                    v.co.y *= d0 / 2
                elif not point:
                    v.co.x *= w1 / 2
                    v.co.y *= d1 / 2
                v.co.z += L / 2
            kw.setdefault('smooth', 50)
        else:
            vs = []
            for z, w, d in ((0, w0, d0), (L, w1, d1)):
                for x, y in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                    vs.append(bm.verts.new((x * w / 2, y * d / 2, z)))
            for a, b, c, d in ((0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1), (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0)):
                bm.faces.new((vs[a], vs[b], vs[c], vs[d]))
            self._bevel(bm, bevel)
        z = (p1 - p0).normalized()
        ref = Vector((1, 0, 0))
        if abs(z.dot(ref)) > 0.95:
            ref = Vector((0, 1, 0))
        x = (ref - z * ref.dot(z)).normalized()
        y = z.cross(x)
        m = Matrix(((x.x, y.x, z.x, p0.x), (x.y, y.y, z.y, p0.y), (x.z, y.z, z.z, p0.z), (0, 0, 0, 1)))
        bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
        return self._add(bm, kw)

    def spike(self, base, tip, r, seg=5, **kw):
        return self.limb(base, tip, r, 0, round=True, seg=seg, **kw)

    def prism(self, outline, thick, at=0.0, plane='fu', bevel=0.012, **kw):
        """Extrude a 2D outline.
        plane 'fu': outline is (forward, up), extruded across x (side profiles: guns)
        plane 'xu': outline is (x, up), extruded front to back (plates, shields)
        plane 'xf': outline is (x, forward), extruded vertically (wings, fins)
        `at` is the centre of the extrusion along its axis."""
        bm = bmesh.new()

        def place(a, b, t):
            if plane == 'fu':
                return (t, -a, b)
            if plane == 'xu':
                return (a, -t, b)
            return (a, -b, t)

        lo = [bm.verts.new(place(a, b, at - thick / 2)) for a, b in outline]
        hi = [bm.verts.new(place(a, b, at + thick / 2)) for a, b in outline]
        n = len(outline)
        bm.faces.new(lo)
        bm.faces.new(hi[::-1])
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((lo[i], hi[i], hi[j], lo[j]))
        self._bevel(bm, bevel)
        rot = kw.pop('rot', None)
        if rot:
            piv = Vector(kw.pop('rot_at', (0, 0, 0)))
            bmesh.ops.transform(bm, matrix=Matrix.Translation(piv) @ _rot(rot) @ Matrix.Translation(-piv), verts=bm.verts)
        return self._add(bm, kw)

    def lathe(self, profile, c=(0, 0, 0), axis='u', seg=10, scale=(1, 1), cap=True, **kw):
        """Spin a profile [(radius, height)...] about the vertical axis ('u')
        or the forward axis ('f'). scale squashes the two radial directions."""
        n = max(6, seg * 2 // 3) if LOD else seg
        bm = bmesh.new()
        rings = []
        for r, h in profile:
            if r < 1e-5:
                rings.append([bm.verts.new((0, 0, h))])
            else:
                rings.append([bm.verts.new((math.cos(i / n * math.tau) * r * scale[0], math.sin(i / n * math.tau) * r * scale[1], h)) for i in range(n)])
        for a, b in zip(rings, rings[1:]):
            if len(a) == 1 and len(b) == 1:
                continue
            for i in range(n):
                j = (i + 1) % n
                if len(a) == 1:
                    bm.faces.new((a[0], b[j], b[i]))
                elif len(b) == 1:
                    bm.faces.new((a[i], a[j], b[0]))
                else:
                    bm.faces.new((a[i], a[j], b[j], b[i]))
        if cap and len(rings[0]) > 1:
            bm.faces.new(rings[0][::-1])
        if cap and len(rings[-1]) > 1:
            bm.faces.new(rings[-1])
        m = Matrix.Translation(c)
        if axis == 'f':
            m = m @ Matrix.Rotation(math.radians(90), 4, 'X')  # local +z -> forward (-y)
        bmesh.ops.transform(bm, matrix=m, verts=bm.verts)
        kw.setdefault('smooth', 50)
        return self._add(bm, kw)


# ---------------------------------------------------------------- baking

def _hemisphere(n, rng):
    """Cosine-weighted directions about +z."""
    out = []
    for i in range(n):
        u = (i + rng.random()) / n
        v = rng.random()
        r = math.sqrt(u)
        a = v * math.tau
        out.append((r * math.cos(a), r * math.sin(a), math.sqrt(max(0.0, 1 - u))))
    return out


def collect(model, extra_occluders=(), ao_strength=0.85, ao_dist=0.55, rays=40):
    """Triangulate every part, read Blender's corner normals, bake AO.
    Returns a list of corner records in Blender space."""
    recs = []  # (pos, nor, part)
    meshes = []
    for p in model.parts:
        bm = p.bm.copy()
        bmesh.ops.triangulate(bm, faces=bm.faces)
        thr = math.radians(p.smooth)
        for f in bm.faces:
            f.smooth = True
        for e in bm.edges:
            if len(e.link_faces) == 2:
                e.smooth = e.calc_face_angle(0) <= thr
        me = bpy.data.meshes.new(model.name + '_part')
        bm.to_mesh(me)
        bm.free()
        cn = me.corner_normals
        start = len(recs)
        for poly in me.polygons:
            for li in poly.loop_indices:
                v = me.vertices[me.loops[li].vertex_index].co
                recs.append([Vector(v), Vector(cn[li].vector), p, 1.0])
        meshes.append((me, p, start))

    # Occlusion geometry: this model, any companions, and the ground.
    verts = [r[0] for r in recs]
    tris = [(i, i + 1, i + 2) for i in range(0, len(recs), 3)]
    for other in extra_occluders:
        base = len(verts)
        for r in other:
            verts.append(r[0])
        tris += [(base + i, base + i + 1, base + i + 2) for i in range(0, len(other), 3)]
    g = len(verts)
    gz = 0 if model.ground else -99
    verts += [Vector((-9, -9, gz)), Vector((9, -9, gz)), Vector((9, 9, gz)), Vector((-9, 9, gz))]
    tris += [(g, g + 1, g + 2), (g, g + 2, g + 3)]
    bvh = BVHTree.FromPolygons(verts, tris)

    rng = random.Random(7)
    hemi = _hemisphere(rays, rng)
    cache = {}
    for r in recs:
        pos, nor, p = r[0], r[1], r[2]
        if not p.ao:
            continue
        key = (round(pos.x, 4), round(pos.y, 4), round(pos.z, 4), round(nor.x, 2), round(nor.y, 2), round(nor.z, 2))
        if key in cache:
            r[3] = cache[key]
            continue
        z = nor.normalized()
        ref = Vector((0, 0, 1)) if abs(z.z) < 0.9 else Vector((1, 0, 0))
        x = ref.cross(z).normalized()
        y = z.cross(x)
        origin = pos + z * 0.012
        occ = 0.0
        for hx, hy, hz in hemi:
            d = x * hx + y * hy + z * hz
            hit = bvh.ray_cast(origin, d, ao_dist)
            if hit[0] is not None:
                occ += 1 - hit[3] / ao_dist
        ao = 1 - ao_strength * (occ / rays)
        r[3] = cache[key] = ao
    return recs, meshes


def pack(model, recs):
    """Convert to game space, quantise, de-duplicate. Returns (vertex bytes,
    index bytes, vertex count, index count, position scale)."""
    f = model.face
    ext = 1e-6
    conv = []
    for pos, nor, p, ao in recs:
        if f > 0:
            gp = (pos.x, pos.z, -pos.y)
            gn = (nor.x, nor.z, -nor.y)
        else:
            gp = (pos.x, pos.z, pos.y)
            gn = (nor.x, nor.z, nor.y)
        ext = max(ext, abs(gp[0]), abs(gp[1]), abs(gp[2]))
        # Keep a little of the old feet-to-head gradient: it grounds the figure.
        shade = (ao * (0.86 + 0.14 * min(1.0, max(0.0, gp[1] / 1.1)) if model.ground else ao)) if p.ao else 1.0
        conv.append((gp, gn, p, shade))
    index = {}
    vbytes = bytearray()
    ibytes = bytearray()
    q8 = lambda v: max(0, min(255, int(round(v * 255))))
    for gp, gn, p, shade in conv:
        l = math.sqrt(gn[0] ** 2 + gn[1] ** 2 + gn[2] ** 2) or 1
        rec = struct.pack(
            '<hhhbbbBBBBbBB',
            *(int(round(c / ext * 32767)) for c in gp),
            *(int(round(c / l * 127)) for c in gn),
            q8(p.col[0] * shade), q8(p.col[1] * shade), q8(p.col[2] * shade),
            q8(p.tint), max(-127, min(127, int(round(p.swing * 100)))), max(0, min(255, int(round(p.pivot * 200)))), q8(p.glow),
        )
        i = index.get(rec)
        if i is None:
            i = index[rec] = len(index)
            vbytes += rec
        ibytes += struct.pack('<H', i)
    assert len(index) < 65536, model.name
    return bytes(vbytes), bytes(ibytes), len(index), len(ibytes) // 2, ext


# ---------------------------------------------------------------- preview

def preview_object(model, recs, meshes, tint=(1, 1, 1), loc=(0, 0, 0), rot_z=0.0, scale=1.0):
    """Turn baked parts into Blender objects coloured as the game would."""
    mat = bpy.data.materials.get('hb_vcol')
    if mat is None:
        mat = bpy.data.materials.new('hb_vcol')
        mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        attr = nt.nodes.new('ShaderNodeAttribute')
        attr.attribute_name = 'Col'
        glow = nt.nodes.new('ShaderNodeAttribute')
        glow.attribute_name = 'Glow'
        bsdf.inputs['Roughness'].default_value = 0.62
        nt.links.new(attr.outputs['Color'], bsdf.inputs['Base Color'])
        nt.links.new(glow.outputs['Color'], bsdf.inputs['Emission Color'])
        bsdf.inputs['Emission Strength'].default_value = 0.85
        nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    objs = []
    for me, p, start in meshes:
        ca = me.color_attributes.new('Col', 'FLOAT_COLOR', 'CORNER')
        ga = me.color_attributes.new('Glow', 'FLOAT_COLOR', 'CORNER')
        k = 0
        for poly in me.polygons:
            for li in poly.loop_indices:
                ao = recs[start + k][3]
                k += 1
                c = [p.col[i] * ((1 - p.tint) + p.tint * tint[i]) * ao for i in range(3)]
                ca.data[li].color = (c[0], c[1], c[2], 1)
                g = p.glow
                ga.data[li].color = (c[0] * g, c[1] * g, c[2] * g, 1)
        me.materials.append(mat)
        ob = bpy.data.objects.new(me.name, me)
        bpy.context.scene.collection.objects.link(ob)
        ob.location = loc
        ob.rotation_euler = (0, 0, rot_z)
        ob.scale = (scale, scale, scale)
        objs.append(ob)
    return objs


def setup_scene(res=(1600, 900), samples=24, transparent=False):
    sc = bpy.context.scene
    for ob in list(bpy.data.objects):
        bpy.data.objects.remove(ob, do_unlink=True)
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = samples
    sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.film_transparent = transparent
    sc.view_settings.view_transform = 'Standard'
    w = sc.world or bpy.data.worlds.new('w')
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes['Background']
    bg.inputs[0].default_value = (0.62, 0.74, 0.95, 1)
    bg.inputs[1].default_value = 0.75
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
    sun.data.energy = 3.2
    sun.data.angle = math.radians(8)
    sun.rotation_euler = (math.radians(42), math.radians(-18), math.radians(-25))
    sc.collection.objects.link(sun)
    return sc


def add_camera(sc, eye, target, lens=50, ortho=None):
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam'))
    sc.collection.objects.link(cam)
    cam.location = eye
    d = Vector(target) - Vector(eye)
    cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
    if ortho:
        cam.data.type = 'ORTHO'
        cam.data.ortho_scale = ortho
    else:
        cam.data.lens = lens
    sc.camera = cam
    return cam


def add_ground(sc, col=(0.4, 0.43, 0.54), size=60):
    me = bpy.data.meshes.new('ground')
    me.from_pydata([(-size, -size, 0), (size, -size, 0), (size, size, 0), (-size, size, 0)], [], [(0, 1, 2, 3)])
    mat = bpy.data.materials.new('ground')
    mat.use_nodes = True
    mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*col, 1)
    mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.9
    me.materials.append(mat)
    ob = bpy.data.objects.new('ground', me)
    sc.collection.objects.link(ob)
    return ob
