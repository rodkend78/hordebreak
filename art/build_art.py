"""Build every model, export the game data, render preview sheets."""
import base64, json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy
import kit, models
from kit import collect, pack, preview_object, setup_scene, add_camera, add_ground

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'out')
os.makedirs(OUT, exist_ok=True)
MODE = sys.argv[1] if len(sys.argv) > 1 else 'all'

manifest = {}
blob = bytearray()
stats = []

def export(name, model, recs):
    vb, ib, vc, ic, ext = pack(model, recs)
    manifest[name] = [vc, ic, round(ext, 5), len(blob)]
    blob.extend(vb); blob.extend(ib)
    stats.append((name, vc, ic // 3, len(vb) + len(ib)))

built = {}  # name -> (model, recs, meshes) at LOD 0 for previews

# Enemies (and far-away versions of the crowd types).
for name, (fn, tint, scale) in models.ENEMIES.items():
    kit.set_lod(0)
    m = fn(); recs, meshes = collect(m)
    export(name, m, recs); built[name] = (m, recs, meshes)
    if name in models.LOD_ENEMIES:
        kit.set_lod(1)
        m1 = fn(); r1, _ = collect(m1, rays=24)
        export(name + '_far', m1, r1)
kit.set_lod(0)
# Troopers: body per rank, arms+gun per weapon (baked standing against a body).
bodies = []
for t in range(6):
    m = models.trooper(t); recs, meshes = collect(m)
    export(m.name, m, recs); built[m.name] = (m, recs, meshes); bodies.append(recs)
for w in models.WEAPONS:
    m = models.weapon(w); recs, meshes = collect(m, extra_occluders=[bodies[1]])
    export(m.name, m, recs); built[m.name] = (m, recs, meshes)
for fn in (models.rocket, models.crate, models.jet):
    m = fn(); recs, meshes = collect(m)
    export(m.name, m, recs); built[m.name] = (m, recs, meshes)

open(os.path.join(OUT, 'models.bin'), 'wb').write(bytes(blob))
open(os.path.join(OUT, 'models.json'), 'w').write(json.dumps(manifest, separators=(',', ':')))
for s in stats: print('%-12s verts %5d tris %5d bytes %6d' % s)
print('TOTAL bytes', len(blob), 'base64', len(base64.b64encode(bytes(blob))))

if MODE == 'export':
    sys.exit(0)

def place(name, tint, loc, rot_z=0.0, scale=1.0):
    m, recs, meshes = built[name]
    # previews need fresh mesh datablocks per placement
    r2, me2 = collect(m, extra_occluders=[bodies[1]] if name.startswith('w_') else ())
    return preview_object(m, r2, me2, tint=tint, loc=loc, rot_z=rot_z, scale=scale)

def sheet(path, items, eye, target, res=(1600, 800), lens=50, samples=20):
    sc = setup_scene(res=res, samples=samples)
    add_ground(sc)
    for it in items: place(*it)
    add_camera(sc, eye, target, lens=lens)
    sc.render.filepath = path
    bpy.ops.render.render(write_still=True)

if MODE in ('all', 'horde'):
    items = []
    xs = {'grunt': -5.0, 'runner': -3.7, 'shield': -2.35, 'bomber': -0.95, 'spitter': 0.45, 'brute': 2.1, 'giant': 4.8}
    for n, x in xs.items():
        fn, tint, sc_ = models.ENEMIES[n]
        items.append((n, tint, (x, 0, 0), 0.0, sc_))
    # close-up front 3/4, then the in-game angle
    sheet(os.path.join(OUT, 'sheet_horde_front.png'), items, (2.2, -10.8, 2.6), (0.1, 0, 1.0), lens=36)
    sheet(os.path.join(OUT, 'sheet_horde_game.png'), items, (0.5, -6.0, 8.5), (0.3, 0.6, 0.6), lens=34)
if MODE in ('all', 'boss'):
    fn, tint, sc_ = models.ENEMIES['boss']
    sheet(os.path.join(OUT, 'sheet_boss.png'), [('boss', tint, (0, 0, 0), 0.0, 1.0), ('boss', tint, (2.6, 0, 0), math.pi * 0.8, 1.0)], (1.3, -5.2, 2.2), (1.3, 0, 0.95), res=(1400, 800), lens=40)
if MODE in ('all', 'squad'):
    items = []
    for i, (iname, tint) in enumerate(models.INFANTRY):
        x = (i - 2.5) * 1.15
        w = models.WEAPONS[i % 7]
        # troopers are modelled facing -Y like everything else
        items.append(('inf%d' % i, tint, (x, 0, 0), 0.0, 1.0))
        items.append(('w_' + w, tint, (x, 0, 0), 0.0, 1.0))
    items.append(('inf1', models.INFANTRY[1][1], (4.1, 0, 0), 0.0, 1.0)); items.append(('w_plasma', models.INFANTRY[1][1], (4.1, 0, 0), 0.0, 1.0))
    sheet(os.path.join(OUT, 'sheet_squad_front.png'), items, (2.2, -7.2, 2.6), (0.6, 0, 0.72), lens=46)
    # in game the squad is seen from behind and above
    sheet(os.path.join(OUT, 'sheet_squad_game.png'), items, (0.5, 4.6, 6.4), (0.5, -0.5, 0.5), lens=40)
if MODE in ('all', 'props'):
    items = [('rocket', (1, 1, 1), (-2, 0, 0.5), 0.6, 2.0), ('crate', (0.18, 0.72, 0.5), (0, 0, 0.65), 0.5, 1.3), ('jet', (1, 1, 1), (3, 0, 0.8), 2.4, 1.0)]
    sheet(os.path.join(OUT, 'sheet_props.png'), items, (0.5, -6.5, 4.2), (0.5, 0, 0.5), res=(1400, 700), lens=40)

if MODE in ('all', 'thumbs'):
    # Armory thumbnails: each weapon in profile, each rank standing with a rifle.
    TH = os.path.join(OUT, 'thumbs'); os.makedirs(TH, exist_ok=True)
    def thumb(name, parts, eye, target, ortho, roll=0):
        sc = setup_scene(res=(168, 168), samples=96, transparent=True)
        sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.8, 0.86, 1.0, 1)
        sc.world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
        for model, tint, occl in parts:
            recs, meshes = collect(model, extra_occluders=occl)
            preview_object(model, recs, meshes, tint=tint)
        cam = add_camera(sc, eye, target, ortho=ortho)
        cam.rotation_euler.rotate_axis('Z', math.radians(roll))  # tilt so a long gun runs corner to corner
        sc.render.image_settings.file_format = 'WEBP'
        sc.render.image_settings.color_mode = 'RGBA'
        sc.render.image_settings.quality = 82
        sc.render.filepath = os.path.join(TH, name + '.webp')
        bpy.ops.render.render(write_still=True)
    for w in models.WEAPONS:
        m = models.weapon(w, arms=False)
        # centre along the barrel, height, length
        cy, cz, L = {'rifle': (-0.42, 0.79, 1.08), 'smg': (-0.31, 0.76, 0.82), 'shotgun': (-0.41, 0.79, 1.18), 'mg': (-0.45, 0.78, 1.22),
                     'rail': (-0.44, 0.79, 1.16), 'rocket': (-0.21, 0.99, 1.26), 'plasma': (-0.34, 0.78, 0.9)}[w]
        thumb(w, [(m, (1, 1, 1), ())], (4.2, cy - 1.0, cz + 1.1), (0.17, cy, cz), L * 1.04, roll=-28)
    for i, (iname, tint) in enumerate(models.INFANTRY):
        body = models.trooper(i)
        brecs, _ = collect(body)
        arms = models.weapon('rifle')
        thumb(iname, [(body, tint, ()), (arms, tint, [brecs])], (-2.4, -4.2, 2.6), (0.0, -0.1, 0.76), 1.5)
