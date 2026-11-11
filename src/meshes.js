// The 3D models. Characters, weapons and props are authored in Blender
// (art/models.py) and shipped as packed binary in models.js; the two shapes
// used for scenery and debris are still built here in code.
//
// A vertex is 12 numbers: position (3), normal (3), colour (3), tint (1),
// glow (1), bone (1).
//   tint 1  -> the colour is multiplied by the colour of the instance being
//              drawn (so one grunt mesh serves every shade of grunt)
//   glow    -> ignores lighting (eyes, fuses, emblems)
//   bone    -> which bone of the model's skeleton carries this vertex. The
//              walk and attack animations move the bones; the graphics card
//              moves each vertex with its bone (see decodeAnim)
// Colours already carry ambient occlusion and painted edge highlights baked
// in Blender; they run up to 1.3 so a highlight can outshine its base colour.
//
// Enemies face +z (toward the camera). Troopers face -z (up the road).

const { MODEL_INDEX, MODEL_DATA, ANIM_INDEX, ANIM_DATA } = __m["src/models.js"];
const VERT_SIZE = 12;
const REC = 15; // bytes per packed vertex
const COLOR_RANGE = 1.3;

// Box centred at the origin; tx/tz taper the top, tilt and roll lean it.
function boxVerts(sx, sy, sz, col, tint, o = {}) {
  const v = [];
  const tx = o.tx ?? 1;
  const tz = o.tz ?? 1;
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const raw = [
    [-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz],
    [-hx * tx, hy, -hz * tz], [hx * tx, hy, -hz * tz], [hx * tx, hy, hz * tz], [-hx * tx, hy, hz * tz],
  ];
  const ct = Math.cos(o.tilt || 0), st = Math.sin(o.tilt || 0);
  const cr = Math.cos(o.roll || 0), sr = Math.sin(o.roll || 0);
  const c = raw.map(([x, y, z]) => {
    const y1 = y * ct - z * st;
    const z1 = y * st + z * ct;
    return [x * cr - y1 * sr + (o.cx || 0), x * sr + y1 * cr + (o.cy || 0), z1 + (o.cz || 0)];
  });
  const quads = [[3, 2, 6, 7], [1, 0, 4, 5], [2, 1, 5, 6], [0, 3, 7, 4], [7, 6, 5, 4], [0, 1, 2, 3]];
  for (const q of quads) {
    const a = c[q[0]], b = c[q[1]], d = c[q[2]];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    for (const i of [0, 1, 2, 0, 2, 3]) v.push(c[q[i]][0], c[q[i]][1], c[q[i]][2], nx, ny, nz, col[0], col[1], col[2], tint, 0, 0);
  }
  return v;
}

// A jagged lump for flying debris.
function chunk() {
  return boxVerts(1, 0.8, 0.9, [1, 1, 1], 1, { tx: 0.55, tz: 0.7, roll: 0.3 })
    .concat(boxVerts(0.6, 0.6, 0.6, [0.8, 0.8, 0.8], 1, { tx: 0.4, tilt: 0.6, cx: 0.2, cy: 0.1, cz: 0.1 }));
}

// Unpack the Blender models into the renderer's vertex layout.
function decodeModels() {
  const bin = atob(MODEL_DATA);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const dv = new DataView(u8.buffer);
  const out = {};
  for (const name in MODEL_INDEX) {
    const [vc, ic, ext, off] = MODEL_INDEX[name];
    const verts = new Float32Array(vc * VERT_SIZE);
    for (let i = 0; i < vc; i++) {
      const o = off + i * REC;
      const k = i * VERT_SIZE;
      for (let j = 0; j < 3; j++) {
        verts[k + j] = (dv.getInt16(o + j * 2, true) / 32767) * ext;
        verts[k + 3 + j] = dv.getInt8(o + 6 + j) / 127;
        verts[k + 6 + j] = (u8[o + 9 + j] / 255) * COLOR_RANGE;
      }
      verts[k + 9] = u8[o + 12] / 255;
      verts[k + 10] = u8[o + 13] / 255;
      verts[k + 11] = u8[o + 14];
    }
    const idx = new Uint16Array(ic);
    const io = off + vc * REC;
    for (let i = 0; i < ic; i++) idx[i] = dv.getUint16(io + i * 2, true);
    out[name] = { verts, idx };
  }
  return out;
}

// Unpack the animations into a table the graphics card can look up: one row
// per frame, three cells per bone holding that bone's 3x4 matrix. Row 0 is the
// rest pose, used by everything that does not animate.
function decodeAnim() {
  const bin = atob(ANIM_DATA);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  const dv = new DataView(u8.buffer);
  const width = ANIM_INDEX.bones * 3;
  const height = ANIM_INDEX.rows;
  const data = new Float32Array(width * height * 4);
  for (let i = 0; i < width * height; i += 3) {
    data[i * 4] = 1;
    data[(i + 1) * 4 + 1] = 1;
    data[(i + 2) * 4 + 2] = 1;
  }
  let p = 0;
  for (const rig of Object.values(ANIM_INDEX.rigs)) {
    for (const clip of Object.values(rig.clips)) {
      for (let f = 0; f < clip[1]; f++) {
        for (let b = 0; b < rig.n; b++) {
          let w = dv.getInt16(p, true), x = dv.getInt16(p + 2, true), y = dv.getInt16(p + 4, true), z = dv.getInt16(p + 6, true);
          const l = Math.hypot(w, x, y, z) || 1;
          w /= l; x /= l; y /= l; z /= l;
          const o = ((clip[0] + f) * width + b * 3) * 4;
          data[o] = 1 - 2 * (y * y + z * z); data[o + 1] = 2 * (x * y - w * z); data[o + 2] = 2 * (x * z + w * y);
          data[o + 4] = 2 * (x * y + w * z); data[o + 5] = 1 - 2 * (x * x + z * z); data[o + 6] = 2 * (y * z - w * x);
          data[o + 8] = 2 * (x * z - w * y); data[o + 9] = 2 * (y * z + w * x); data[o + 10] = 1 - 2 * (x * x + y * y);
          for (let k = 0; k < 3; k++) data[o + k * 4 + 3] = dv.getInt16(p + 8 + k * 2, true) / 4096;
          p += 14;
        }
      }
    }
  }
  return { width, height, data, rigs: ANIM_INDEX.rigs, mesh: ANIM_INDEX.mesh };
}

function buildMeshes() {
  return {
    box: { verts: new Float32Array(boxVerts(1, 1, 1, [1, 1, 1], 1)) },
    chunk: { verts: new Float32Array(chunk()) },
    ...decodeModels(),
  };
}

return { VERT_SIZE, buildMeshes, decodeAnim };
