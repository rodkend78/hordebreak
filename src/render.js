// Draws the battle in 3D with plain WebGL2 (no libraries).
//
// Two kinds of thing are drawn, each many at a time (instancing):
//   meshes  - solid 3D models (made in Blender, see meshes.js), lit per pixel: sun, sky, a rim
//             highlight, and two moving lights (muzzle flash, latest explosion).
//             Legs and arms are animated on the graphics card.
//   sprites - flat shapes with a soft procedural falloff: shadows under every
//             figure, splats and scorch marks on the road, tracers, muzzle
//             flashes, fireballs, shockwave rings, smoke. No image files.
// Text (gate values, barrier strength, squad size) goes on a 2D canvas on top.
//
// The simulation uses z = distance ahead of the squad. On screen that is "up
// the road", which in GL is -z, so world z is negated when drawing.

const { ROAD_HALF, INFANTRY, byId, fmt } = __m["src/data.js"];
const { buildMeshes, VERT_SIZE } = __m["src/meshes.js"];
const { ENEMY_LOOK, FAR_Z, FAR_MESH, WEAPON_LOOK, GATE_COLORS, HAZARD_COLORS, bossColor, BOSS_SCALE, squadMeshes, enemySize, enemyShade, squadSlot } = __m["src/look.js"];
const MESH_VERT = `#version 300 es
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNor;
layout(location=2) in vec4 aCol;   // rgb, tint
layout(location=3) in vec3 aAnim;  // swing, pivot height, glow
layout(location=4) in vec3 iPos;
layout(location=5) in vec3 iScale;
layout(location=6) in vec4 iColor; // rgb, yaw
layout(location=7) in vec4 iFx;    // glow, flash, walk phase, pitch
layout(location=8) in vec2 iMisc;  // walk speed, alpha
uniform mat4 uVP;
uniform float uTime;
uniform vec2 uFog;
out vec3 vCol;
out vec3 vNor;
out vec3 vPos;
out float vFog;
out vec3 vFx;
vec3 rotX(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x, v.y * c - v.z * s, v.y * s + v.z * c); }
vec3 rotY(vec3 v, float a) { float c = cos(a), s = sin(a); return vec3(v.x * c + v.z * s, v.y, -v.x * s + v.z * c); }
void main() {
  vec3 p = aPos;
  vec3 n = aNor;
  if (aAnim.x != 0.0 && iMisc.x > 0.0) {
    float a = aAnim.x * sin(uTime * iMisc.x + iFx.z);
    p.y -= aAnim.y; p = rotX(p, a); p.y += aAnim.y;
    n = rotX(n, a);
  }
  p *= iScale;
  p = rotY(rotX(p, iFx.w), iColor.a);
  n = rotY(rotX(n, iFx.w), iColor.a);
  vec3 w = p + iPos;
  gl_Position = uVP * vec4(w, 1.0);
  vCol = mix(aCol.rgb, aCol.rgb * iColor.rgb, aCol.a);
  vNor = n;
  vPos = w;
  vFog = clamp((gl_Position.w - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  vFx = vec3(max(iFx.x, aAnim.z), iFx.y, iMisc.y);
}`;

const MESH_FRAG = `#version 300 es
precision highp float;
in vec3 vCol;
in vec3 vNor;
in vec3 vPos;
in float vFog;
in vec3 vFx;
uniform vec3 uFogCol;
uniform vec3 uEye;
uniform float uAlpha;
uniform vec3 uLightPos[2];
uniform vec4 uLightCol[2];
out vec4 o;
void main() {
  vec3 n = normalize(vNor);
  vec3 L = normalize(vec3(-0.4, 0.8, 0.45));
  vec3 V = normalize(uEye - vPos);
  float diff = max(dot(n, L), 0.0);
  vec3 amb = mix(vec3(0.40, 0.42, 0.58), vec3(0.72, 0.80, 0.96), n.y * 0.5 + 0.5);
  float rim = pow(1.0 - max(dot(n, V), 0.0), 3.0);
  float spec = pow(max(dot(n, normalize(L + V)), 0.0), 26.0);
  vec3 lit = vCol * (amb * 0.62 + vec3(1.0, 0.95, 0.86) * diff * 0.56) + rim * 0.14 * vec3(0.75, 0.88, 1.0) + spec * 0.12;
  for (int i = 0; i < 2; i++) {
    vec3 d = uLightPos[i] - vPos;
    float att = uLightCol[i].a / (1.0 + dot(d, d) * 0.3);
    lit += vCol * uLightCol[i].rgb * att * (0.35 + 0.65 * max(dot(n, normalize(d)), 0.0));
  }
  vec3 c = mix(lit, vCol * 1.35, vFx.x);
  c = mix(c, vec3(1.0), clamp(vFx.y, 0.0, 1.0) * 0.85);
  c = mix(c, uFogCol, vFog * vFog);
  o = vec4(c, uAlpha * vFx.z);
}`;

const SPRITE_VERT = `#version 300 es
layout(location=0) in vec2 aCorner;
layout(location=1) in vec3 iPos;
layout(location=2) in vec4 iShape;  // half width, half height, rotation, shape
layout(location=3) in vec4 iColor;  // rgb, alpha
layout(location=4) in float iFlat;  // 1 = lies on the road, 0 = faces the camera
uniform mat4 uVP;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec2 uFog;
out vec2 vUV;
out vec4 vCol;
out float vShape;
out float vFog;
void main() {
  float c = cos(iShape.z), s = sin(iShape.z);
  vec2 q = aCorner * iShape.xy;
  q = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
  vec3 ax = mix(uRight, vec3(1.0, 0.0, 0.0), iFlat);
  vec3 ay = mix(uUp, vec3(0.0, 0.0, -1.0), iFlat);
  gl_Position = uVP * vec4(iPos + ax * q.x + ay * q.y, 1.0);
  vUV = aCorner;
  vCol = iColor;
  vShape = iShape.w;
  vFog = clamp((gl_Position.w - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
}`;

// Shapes: 0 glow, 1 ring, 2 soft blob, 3 streak (bright head at +v), 4 star flash.
const SPRITE_FRAG = `#version 300 es
precision highp float;
in vec2 vUV;
in vec4 vCol;
in float vShape;
in float vFog;
uniform vec3 uFogCol;
uniform float uAdd;
out vec4 o;
void main() {
  float d = length(vUV);
  vec3 c = vCol.rgb;
  float a;
  if (vShape < 0.5) {
    float f = max(0.0, 1.0 - d);
    a = f * f;
    c = mix(c, vec3(1.0), smoothstep(0.5, 0.0, d) * 0.85);
  } else if (vShape < 1.5) {
    a = smoothstep(0.2, 0.0, abs(d - 0.78)) * step(d, 1.0);
    c = mix(c, vec3(1.0), a * 0.4);
  } else if (vShape < 2.5) {
    a = smoothstep(1.0, 0.3, d);
  } else if (vShape < 3.5) {
    float across = max(0.0, 1.0 - abs(vUV.x));
    float along = smoothstep(-1.0, 0.75, vUV.y) * smoothstep(1.0, 0.86, vUV.y);
    a = across * across * along;
    c = mix(c, vec3(1.0), across * across * smoothstep(0.1, 0.9, vUV.y) * 0.9);
  } else {
    float f = max(0.0, 1.0 - d);
    float star = 1.0 / (1.0 + 70.0 * abs(vUV.x * vUV.y));
    a = star * pow(f, 1.3) + pow(max(0.0, 1.0 - d * 1.9), 2.0);
    c = mix(c, vec3(1.0), clamp(a, 0.0, 1.0) * 0.75);
  }
  a *= vCol.a;
  float fog = vFog * vFog;
  if (uAdd > 0.5) a *= 1.0 - fog; else c = mix(c, uFogCol, fog);
  o = vec4(c, a);
}`;

const SKY = [0.62, 0.8, 0.9];
const STRIDE = 16; // floats per mesh instance
const SPRITE_STRIDE = 12;
const WHITE = [1, 1, 1];
const SHADOW = [0.02, 0.03, 0.08];
// A mid-dark deck, so tracers, flashes and fire show up against it.
const ROAD = [0.4, 0.43, 0.54];

// ---- tiny matrix helpers (column-major) ----
function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const m = new Float32Array(16);
  m[0] = f / aspect;
  m[5] = f;
  m[10] = (far + near) / (near - far);
  m[11] = -1;
  m[14] = (2 * far * near) / (near - far);
  return m;
}
function lookAt(e, c, up) {
  let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
  let l = Math.hypot(zx, zy, zz);
  zx /= l; zy /= l; zz /= l;
  let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
  l = Math.hypot(xx, xy, xz);
  xx /= l; xy /= l; xz /= l;
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  const m = new Float32Array(16);
  m[0] = xx; m[1] = yx; m[2] = zx;
  m[4] = xy; m[5] = yy; m[6] = zy;
  m[8] = xz; m[9] = yz; m[10] = zz;
  m[12] = -(xx * e[0] + xy * e[1] + xz * e[2]);
  m[13] = -(yx * e[0] + yy * e[1] + yz * e[2]);
  m[14] = -(zx * e[0] + zy * e[1] + zz * e[2]);
  m[15] = 1;
  return m;
}
function mul(a, b) {
  const o = new Float32Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}

function gateLabel(g) {
  if (g.kind === 'add') return (g.val >= 0 ? '+' : '−') + Math.abs(g.val);
  if (g.kind === 'mul') return '×' + g.val;
  if (g.kind === 'rate') return 'RATE +' + Math.round((g.val - 1) * 100) + '%';
  return 'DMG +' + Math.round((g.val - 1) * 100) + '%';
}

const CRATE_LABEL = { rate: 'RATE', dmg: 'DMG', squad: 'TROOPS', multi: 'BARREL' };

function program(gl, vs, fs) {
  const sh = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  return prog;
}

// One mesh, drawn many times.
class Batch {
  constructor(gl, mesh, cap) {
    this.gl = gl;
    this.cap = cap;
    this.n = 0;
    this.data = new Float32Array(cap * STRIDE);
    this.vcount = mesh.verts.length / VERT_SIZE;
    this.icount = mesh.idx ? mesh.idx.length : 0;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, mesh.verts, gl.STATIC_DRAW);
    if (mesh.idx) {
      // Shared corners: the Blender models are drawn through an index list.
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
    }
    const vb = VERT_SIZE * 4;
    [[0, 3, 0], [1, 3, 12], [2, 4, 24], [3, 3, 40]].forEach(([loc, size, off]) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, vb, off);
    });
    this.ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ib);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    [[4, 3, 0], [5, 3, 12], [6, 4, 24], [7, 4, 40], [8, 2, 56]].forEach(([loc, size, off]) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, off);
      gl.vertexAttribDivisor(loc, 1);
    });
    gl.bindVertexArray(null);
  }
  // world position (x, y, z-ahead), scale, colour, yaw, then optional extras
  add(x, y, z, sx, sy, sz, col, yaw = 0, glow = 0, flash = 0, phase = 0, pitch = 0, walk = 0, alpha = 1) {
    if (this.n >= this.cap) return;
    const d = this.data;
    const o = this.n++ * STRIDE;
    d[o] = x; d[o + 1] = y; d[o + 2] = -z;
    d[o + 3] = sx; d[o + 4] = sy; d[o + 5] = sz;
    d[o + 6] = col[0]; d[o + 7] = col[1]; d[o + 8] = col[2]; d[o + 9] = yaw;
    d[o + 10] = glow; d[o + 11] = flash; d[o + 12] = phase; d[o + 13] = pitch;
    d[o + 14] = walk; d[o + 15] = alpha;
  }
  flush() {
    const gl = this.gl;
    if (!this.n) return;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ib);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.n * STRIDE);
    if (this.icount) gl.drawElementsInstanced(gl.TRIANGLES, this.icount, gl.UNSIGNED_SHORT, 0, this.n);
    else gl.drawArraysInstanced(gl.TRIANGLES, 0, this.vcount, this.n);
    this.n = 0;
  }
}

// Flat procedural shapes, drawn many times.
class SpriteBatch {
  constructor(gl, cap) {
    this.gl = gl;
    this.cap = cap;
    this.n = 0;
    this.data = new Float32Array(cap * SPRITE_STRIDE);
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 8, 0);
    this.ib = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ib);
    gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    [[1, 3, 0], [2, 4, 12], [3, 4, 28], [4, 1, 44]].forEach(([loc, size, off]) => {
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, SPRITE_STRIDE * 4, off);
      gl.vertexAttribDivisor(loc, 1);
    });
    gl.bindVertexArray(null);
  }
  // w and h are half sizes
  add(x, y, z, w, h, rot, shape, col, alpha, flat) {
    if (this.n >= this.cap || alpha <= 0.003) return;
    const d = this.data;
    const o = this.n++ * SPRITE_STRIDE;
    d[o] = x; d[o + 1] = y; d[o + 2] = -z;
    d[o + 3] = w; d[o + 4] = h; d[o + 5] = rot; d[o + 6] = shape;
    d[o + 7] = col[0]; d[o + 8] = col[1]; d[o + 9] = col[2]; d[o + 10] = alpha;
    d[o + 11] = flat;
  }
  flush() {
    const gl = this.gl;
    if (!this.n) return;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.ib);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.n * SPRITE_STRIDE);
    gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.n);
    this.n = 0;
  }
}

class Renderer {
  constructor(glCanvas, labelCanvas) {
    this.canvas = glCanvas;
    this.labels = labelCanvas;
    this.ctx = labelCanvas.getContext('2d');
    const gl = glCanvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('WebGL2 is not available in this browser.');
    this.gl = gl;
    this.prog = program(gl, MESH_VERT, MESH_FRAG);
    this.sprog = program(gl, SPRITE_VERT, SPRITE_FRAG);
    const loc = (p, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(p, n)]));
    this.u = loc(this.prog, ['uVP', 'uTime', 'uFog', 'uFogCol', 'uEye', 'uAlpha', 'uLightPos', 'uLightCol']);
    this.su = loc(this.sprog, ['uVP', 'uRight', 'uUp', 'uFog', 'uFogCol', 'uAdd']);
    const m = buildMeshes();
    // How many of each model can be on screen at once.
    const caps = {
      box: 1400, chunk: 460, grunt: 900, grunt_far: 900, runner: 500, runner_far: 500, shield: 320, shield_far: 320,
      bomber: 200, bomber_far: 200, spitter: 60, spitter_far: 60, brute: 160, brute_far: 160, giant: 24, boss: 2,
      rocket: 140, crate: 12, jet: 4,
    };
    this.b = {};
    for (const name in m) this.b[name] = new Batch(gl, m[name], caps[name] || 110);
    this.solid = Object.values(this.b);
    this.glass = new Batch(gl, m.box, 240);
    this.under = new SpriteBatch(gl, 2600); // shadows, splats, smoke
    this.glow = new SpriteBatch(gl, 2200); // everything that adds light
    this.vp = new Float32Array(16);
    this.eye = [0, 10, 10];
    this.right = [1, 0, 0];
    this.up = [0, 1, 0];
    this.w = 1;
    this.h = 1;
    this.dpr = 1;
    this.pxPerUnit = 1;
    this.maxDpr = 2; // main.js lowers this if the device cannot keep up
    this.farZ = FAR_Z; // ...and then pulls the lighter far-off models closer
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(this.maxDpr, window.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(rect.width * dpr));
    const h = Math.max(2, Math.round(rect.height * dpr));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h; this.dpr = dpr;
    this.canvas.width = w; this.canvas.height = h;
    this.labels.width = w; this.labels.height = h;
  }

  camera(camX, shake) {
    const aspect = this.w / this.h;
    const fovy = (aspect < 0.8 ? 60 : 46) * (Math.PI / 180);
    let H = 13.5, D = 9.5;
    const need = ROAD_HALF + 0.3;
    const half = Math.hypot(H, D) * Math.tan(fovy / 2) * aspect;
    const s = Math.max(1, need / half);
    H *= s; D *= s;
    const eye = [camX * 0.35 + shake[0], H + shake[1], D];
    const tgt = [camX * 0.2, 0, -(8 + 4 * s)];
    const view = lookAt(eye, tgt, [0, 1, 0]);
    const proj = perspective(fovy, aspect, 0.5, 160);
    this.vp = mul(proj, view);
    this.eye = eye;
    this.right = [view[0], view[4], view[8]];
    this.up = [view[1], view[5], view[9]];
    this.pxPerUnit = this.h / 2 / Math.tan(fovy / 2);
  }

  // World point -> screen pixels (and how big one world unit is there).
  project(x, y, z) {
    const m = this.vp;
    const rz = -z;
    const cw = m[3] * x + m[7] * y + m[11] * rz + m[15];
    if (cw <= 0.1) return null;
    const cx = (m[0] * x + m[4] * y + m[8] * rz + m[12]) / cw;
    const cy = (m[1] * x + m[5] * y + m[9] * rz + m[13]) / cw;
    return { x: (cx * 0.5 + 0.5) * this.w, y: (1 - (cy * 0.5 + 0.5)) * this.h, s: this.pxPerUnit / cw };
  }

  text(str, p, size, fill, stroke = 'rgba(10,16,34,0.85)') {
    const c = this.ctx;
    c.font = `700 ${Math.round(size)}px "Chakra Petch", "Trebuchet MS", system-ui, sans-serif`;
    c.lineWidth = Math.max(2, size * 0.18);
    c.strokeStyle = stroke;
    c.strokeText(str, p.x, p.y);
    c.fillStyle = fill;
    c.fillText(str, p.x, p.y);
  }

  shadow(x, z, r, a = 0.34) {
    this.under.add(x, 0.02, z, r, r * 0.85, 0, 2, SHADOW, a, 1);
  }

  drawWorld(sim) {
    const b = this.b;
    const p = sim.p;
    b.box.add(0, -0.3, 40, ROAD_HALF * 2 + 0.2, 0.6, 130, ROAD);
    for (let k = 0; k < 20; k++) {
      const z = k * 6 - (p % 6) - 8;
      b.box.add(0, 0.005, z, ROAD_HALF * 2, 0.02, 0.14, [0.6, 0.63, 0.74]);
    }
    for (const side of [-1, 1]) {
      const x = side * (ROAD_HALF + 0.45);
      b.box.add(x, 0.15, 40, 0.7, 0.9, 130, [0.17, 0.23, 0.42]);
      for (let k = 0; k < 14; k++) {
        const z = k * 9 - (p % 9) - 8;
        b.box.add(x, 1.0, z, 0.36, 1.7, 0.36, [0.22, 0.29, 0.52]);
        b.box.add(x, 1.95, z, 0.46, 0.2, 0.46, [1.0, 0.6, 0.15], 0, 0.9);
        this.glow.add(x, 2.0, z, 0.7, 0.7, 0, 0, [1.0, 0.6, 0.15], 0.5, 0);
      }
      b.box.add(x, 1.45, 40, 0.14, 0.14, 130, [0.3, 0.38, 0.62]);
    }
    // Sea far below, with piers sliding past.
    b.box.add(0, -9, 50, 400, 0.2, 260, [0.1, 0.42, 0.52]);
    for (let k = 0; k < 4; k++) {
      const z = k * 36 - (p % 36) - 6;
      b.box.add(0, -5, z, ROAD_HALF * 2 + 3.2, 9, 3, [0.14, 0.19, 0.36]);
    }
    if (!sim.L.boss) {
      const fz = sim.L.length - p;
      if (fz < 90 && fz > -6) {
        for (let i = 0; i < 20; i++) {
          for (let j = 0; j < 2; j++) {
            const dark = (i + j) % 2 === 0;
            b.box.add(-ROAD_HALF + 0.25 + i * 0.5, 0.012, fz + j * 0.5, 0.5, 0.02, 0.5, dark ? [0.1, 0.12, 0.18] : [0.98, 0.98, 1]);
          }
        }
      }
    }
  }

  drawStatics(sim, time, tags) {
    const b = this.b;
    const p = sim.p;
    for (const g of sim.gates) {
      const z = g.s - p;
      if (g.used || z > 74 || z < -1) continue;
      const locked = g.bar >= 0 && sim.barriers[g.bar].alive;
      const key = locked ? 'locked' : g.kind === 'add' && g.val < 0 ? 'neg' : g.kind;
      const col = GATE_COLORS[key];
      const w = g.x1 - g.x0;
      const mid = (g.x0 + g.x1) / 2;
      const hgt = g.lane ? 1.5 : 2.3;
      b.box.add(g.x0 + 0.07, hgt / 2, z, 0.14, hgt, 0.14, col);
      b.box.add(g.x1 - 0.07, hgt / 2, z, 0.14, hgt, 0.14, col);
      b.box.add(mid, hgt + 0.06, z, w, 0.14, 0.14, col, 0, 0.5);
      this.glass.add(mid, hgt / 2, z, w - 0.28, hgt, 0.06, col, 0, 0.6);
      if (!locked) this.glow.add(mid, 0.04, z, w * 0.6, 0.9, 0, 0, col, 0.3, 1); // pool of light on the road
      tags.push({ x: mid, y: hgt * 0.55, z, str: gateLabel(g), size: g.lane ? 0.62 : g.kind === 'add' || g.kind === 'mul' ? 1.0 : 0.56, fill: locked ? '#d5d9e4' : '#ffffff' });
    }
    for (const bar of sim.barriers) {
      const z = bar.s - p;
      if (!bar.alive || z > 74 || z < -1) continue;
      const w = bar.x1 - bar.x0;
      const mid = (bar.x0 + bar.x1) / 2;
      const f = bar.flash > 0 ? 0.6 : 0;
      bar.flash = 0;
      b.box.add(mid, 0.6, z, w, 1.2, 0.5, [0.25, 0.27, 0.33], 0, 0, f);
      for (let i = 0; i < 4; i++) b.box.add(bar.x0 + ((i + 0.5) / 4) * w, 1.14, z, w / 8, 0.14, 0.54, [1.0, 0.8, 0.1], 0, 0.6);
      this.shadow(mid, z, w * 0.6, 0.3);
      tags.push({ x: mid, y: 0.62, z: z - 0.3, str: fmt(Math.ceil(bar.hp)), size: 0.72, fill: '#ffe27a' });
    }
    for (const c of sim.crates) {
      const z = c.s - p;
      if (!c.alive || z > 74 || z < -1) continue;
      const f = c.flash > 0 ? 0.6 : 0;
      c.flash = 0;
      const spin = time * 0.8;
      const y = 0.85 + Math.sin(time * 3) * 0.08;
      b.crate.add(c.x, y, z, 1.34, 1.34, 1.34, [0.18, 0.72, 0.5], spin, 0, f);
      this.shadow(c.x, z, 1.1, 0.3);
      this.glow.add(c.x, y, z, 1.8, 1.8, 0, 0, [0.4, 1, 0.7], 0.25 + 0.1 * Math.sin(time * 5), 0);
      tags.push({ x: c.x, y: 2.1, z, str: CRATE_LABEL[c.kind], size: 0.5, fill: '#b9ffd9' });
      tags.push({ x: c.x, y: 0.8, z: z - 0.7, str: fmt(Math.ceil(c.hp)), size: 0.5, fill: '#ffffff' });
    }
  }

  drawHorde(sim, fx, time) {
    const b = this.b;
    for (const e of sim.enemies) {
      if (e.hp <= 0 || e.z > 80) continue;
      const lk = ENEMY_LOOK[e.type];
      const size = lk.s * enemySize(e.phase);
      // Two footfalls per stride, in step with the leg swing done in the shader.
      const bob = Math.abs(Math.sin(time * lk.walk + e.phase)) * 0.07 * size;
      const hit = e.flash > 0 ? e.flash : 0;
      const pulse = e.type === 'bomber' ? 0.25 + 0.25 * Math.sin(time * 16 + e.phase) : 0;
      // Lean back when shot; weave a little while walking. Far-off bodies use a lighter model.
      const batch = e.z > this.farZ && FAR_MESH[lk.mesh] ? b[lk.mesh + '_far'] : b[lk.mesh];
      batch.add(e.x, bob, e.z, size, size, size, enemyShade(lk.col, e.phase), Math.sin(time * lk.walk * 0.5 + e.phase) * 0.14, 0, Math.max(hit, pulse), e.phase, -hit * 0.3, lk.walk);
      if (e.type === 'spitter') this.glow.add(e.x, 1.1 * size + bob, e.z + 0.1, 0.75, 0.75, 0, 0, [0.5, 1, 0.25], 0.3 + 0.12 * Math.sin(time * 5 + e.phase), 0);
      this.shadow(e.x, e.z, e.r * 1.25 * (1 - bob));
      if (e.type === 'bomber') this.glow.add(e.x, 1.32 * size + bob, e.z, 0.3, 0.3, 0, 0, [1, 0.7, 0.2], 0.6 + 0.4 * Math.sin(time * 30 + e.phase), 0);
    }
    const boss = sim.boss;
    const bd = fx.bossDeath;
    if (boss && boss.z < 85 && (boss.hp > 0 || (bd && !bd.done))) {
      const dying = boss.hp <= 0;
      const x = dying ? bd.x + (Math.random() - 0.5) * 0.3 : boss.x;
      const z = dying ? bd.z : boss.z;
      const stomp = dying ? 0 : Math.abs(Math.sin(time * 2.4)) * 0.2;
      const flash = dying ? 0.35 + 0.35 * Math.sin(time * 40) : boss.flash > 0 ? boss.flash * 0.7 : 0;
      b.boss.add(x, stomp, z, BOSS_SCALE, BOSS_SCALE, BOSS_SCALE, bossColor(sim.L.n), Math.sin(time * 1.2) * 0.1, 0, flash, 0, dying ? -bd.t * 0.25 : -flash * 0.08, dying ? 0 : 2.4);
      this.shadow(x, z, 3.4, 0.42);
      this.glow.add(x, 3.0, z - 1.0, 1.6, 1.6, 0, 0, [1, 0.5, 0.15], 0.5 + 0.2 * Math.sin(time * 6), 0); // chest core
    }
    const sq = squadMeshes(sim.lo);
    for (const c of fx.corpses) {
      const fade = c.landed ? Math.max(0.45, 1 - c.rest * 1.2) : 1;
      const col = [c.col[0] * fade, c.col[1] * fade, c.col[2] * fade];
      const y = c.y + 0.12 * c.s * Math.min(1, Math.abs(c.pitch));
      // A fallen trooper is two models: the body and the arms that still hold the gun.
      for (const mesh of c.mesh === 'soldier' ? [sq.body, sq.arms] : [c.mesh]) {
        b[mesh].add(c.x, y, c.z, c.s, c.s, c.s, col, c.yaw, 0, c.flash, c.phase, c.pitch, 0);
      }
      if (c.y > -0.2) this.shadow(c.x, c.z, 0.5 * c.s, 0.3 * Math.max(0, 1 - c.y * 0.4) * (c.landed ? Math.max(0, 1 - c.rest * 2) : 1));
    }
  }

  drawSquad(sim, fx, time) {
    const inf = byId(INFANTRY, sim.lo.infantry);
    const sq = squadMeshes(sim.lo);
    const body = this.b[sq.body];
    const arms = this.b[sq.arms];
    const nVis = Math.min(sim.count, 60);
    const lean = Math.max(-0.35, Math.min(0.35, (sim.targetX - sim.x) * 0.25));
    for (let i = 0; i < nVis; i++) {
      const s = squadSlot(sim, i, nVis);
      const ph = i * 1.7;
      const bob = Math.abs(Math.sin(time * 9 + ph)) * 0.05;
      // Each volley kicks the troopers back a touch.
      body.add(s.x, bob, s.z - fx.recoil * 0.06, 0.92, 0.92, 0.92, inf.color, lean, 0, fx.squadFlash, ph, fx.recoil * 0.1, 9);
      arms.add(s.x, bob, s.z - fx.recoil * 0.06, 0.92, 0.92, 0.92, inf.color, lean, 0, fx.squadFlash, ph, fx.recoil * 0.1, 9);
      this.shadow(s.x, s.z, 0.42, 0.3);
    }
  }

  drawBullets(sim, time) {
    const wl = WEAPON_LOOK[sim.lo.weapon] || WEAPON_LOOK.rifle;
    const y = 0.72;
    for (const bu of sim.bullets) {
      const ang = Math.atan2(bu.vx, bu.vz);
      if (wl.rocket) {
        this.b.rocket.add(bu.x, y, bu.z, 1.25, 1.25, 1.25, WHITE, -ang);
        const fl = 0.8 + 0.2 * Math.sin(time * 90 + bu.x * 9);
        this.glow.add(bu.x, y, bu.z - 0.5, 0.42 * fl, 0.42 * fl, 0, 0, wl.col, 1, 0);
        this.glow.add(bu.x, y, bu.z - 0.85, 0.16, 0.5, -ang, 3, [1, 0.8, 0.4], 0.9, 1);
        this.glow.add(bu.x, 0.04, bu.z - 0.3, 1.1, 1.1, 0, 0, wl.col, 0.35, 1); // light on the road
        this.shadow(bu.x, bu.z, 0.2, 0.25);
        continue;
      }
      const half = wl.len / 2;
      this.glow.add(bu.x - Math.sin(ang) * half, y, bu.z - Math.cos(ang) * half, wl.w, half, -ang, 3, wl.col, 1, 1);
      if (wl.orb) {
        const s = wl.orb * (0.85 + 0.15 * Math.sin(time * 40 + bu.z));
        this.glow.add(bu.x, y, bu.z, s, s, 0, 0, wl.col, 1, 0);
        this.glow.add(bu.x, 0.04, bu.z, 0.9, 0.9, 0, 0, wl.col, 0.3, 1);
      } else if (wl.beam) {
        this.glow.add(bu.x, y, bu.z, 0.45, 0.45, 0, 0, wl.col, 1, 0);
      }
    }
  }

  // Ground that is about to be hit. The outline shows where; the fill closes
  // in as the moment approaches, and flickers just before it lands.
  drawHazards(sim, time) {
    for (const h of sim.hazards) {
      const z = h.s - sim.p;
      if (z > 70) continue;
      const col = HAZARD_COLORS[h.kind] || HAZARD_COLORS.slam;
      const k = 1 - Math.max(0, h.t) / h.t0; // 0 when marked, 1 on impact
      const blink = h.t < 0.35 ? 0.65 + 0.35 * Math.sin(time * 50) : 1;
      const w = h.x1 - h.x0;
      const mid = (h.x0 + h.x1) / 2;
      if (h.kind === 'acid') {
        const r = h.zr;
        this.glow.add(mid, 0.05, z, r / 0.78, r / 0.78, 0, 1, col, 0.95 * blink, 1);
        this.glow.add(mid, 0.045, z, r * (0.25 + 0.75 * k), r * (0.25 + 0.75 * k), 0, 2, col, (0.25 + 0.4 * k) * blink, 1);
        this.under.add(mid, 0.03, z, r * 1.05, r * 1.05, 0, 2, [0.02, 0.1, 0.02], 0.35, 1);
      } else {
        const zr = h.zr;
        this.glass.add(mid, 0.035, z, w, 0.03, zr * 2, col, 0, 0.8, 0, 0, 0, 0, (0.3 + 0.5 * k) * blink);
        this.glass.add(mid, 0.05, z + zr - zr * k, w, 0.03, 0.22, [1, 0.9, 0.6], 0, 1, 0, 0, 0, 0, 0.9); // sweep line
        for (const ex of [h.x0, h.x1]) {
          if (Math.abs(ex) < ROAD_HALF - 0.05) this.b.box.add(ex, 0.06, z, 0.12, 0.05, zr * 2, col, 0, 1);
        }
        this.glow.add(mid, 0.06, z, w * 0.5, zr, 0, 0, col, (0.12 + 0.3 * k) * blink, 1);
      }
    }
  }

  drawFx(fx) {
    for (const f of fx.flyers) {
      if (f.delay > 0) continue;
      this.b[f.mesh].add(f.x, f.y, f.z, f.s, f.s, f.s, WHITE, f.yaw || 0, 0, 0, 0, f.pitch || 0, 0);
      if (f.shadow) this.shadow(f.x, f.z, f.shadow, 0.3);
    }
    for (const l of fx.lobs) {
      // An acid blob on its arc from the spitter to the marked ground.
      const u = Math.min(1, l.t / l.fuse);
      const x = l.x0 + (l.x1 - l.x0) * u;
      const z = l.z0 + (l.z1 - l.z0) * u;
      const y = 1.2 * (1 - u) + 0.2 * u + l.h * 4 * u * (1 - u);
      this.glow.add(x, y, z, 0.42, 0.42, 0, 0, HAZARD_COLORS.acid, 1, 0);
      this.glow.add(x, y, z, 0.2, 0.2, 0, 0, [0.95, 1, 0.8], 1, 0);
      this.shadow(x, z, 0.3, 0.25);
    }
    for (const q of fx.chunks) {
      const k = Math.min(1, (q.life / q.max) * 3); // shrink away at the end
      const s = q.s * k;
      this.b[q.mesh].add(q.x, q.y, q.z, s, (q.sy || q.s) * k, (q.sz || q.s) * k, q.col, q.yaw, q.glow, 0, 0, q.pitch, 0);
    }
    for (const s of fx.sprites) {
      const t = 1 - s.life / s.max;
      const ease = 1 - (1 - t) * (1 - t);
      const size = s.s0 + (s.s1 - s.s0) * ease;
      const a = s.a * Math.pow(1 - t, s.pow);
      (s.add ? this.glow : this.under).add(s.x, s.y, s.z, size, s.fixedLen || size * s.ar, s.rot, s.shape, s.col, a, s.flat);
    }
  }

  draw(sim, fx, time) {
    this.resize();
    const gl = this.gl;
    this.camera(sim.x, fx.shake);
    const tags = [];
    this.drawWorld(sim);
    this.drawStatics(sim, time, tags);
    this.drawHorde(sim, fx, time);
    this.drawSquad(sim, fx, time);
    this.drawHazards(sim, time);
    this.drawBullets(sim, time);
    this.drawFx(fx);

    gl.viewport(0, 0, this.w, this.h);
    gl.clearColor(SKY[0], SKY[1], SKY[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.depthMask(true);

    // 1. Solid models.
    gl.useProgram(this.prog);
    gl.uniformMatrix4fv(this.u.uVP, false, this.vp);
    gl.uniform1f(this.u.uTime, time % 3600);
    gl.uniform2f(this.u.uFog, 52, 105);
    gl.uniform3f(this.u.uFogCol, SKY[0], SKY[1], SKY[2]);
    gl.uniform3f(this.u.uEye, this.eye[0], this.eye[1], this.eye[2]);
    gl.uniform1f(this.u.uAlpha, 1);
    const l0 = fx.light0, l1 = fx.light1;
    gl.uniform3fv(this.u.uLightPos, [l0.x, l0.y, -l0.z, l1.x, l1.y, -l1.z]);
    gl.uniform4fv(this.u.uLightCol, [l0.col[0], l0.col[1], l0.col[2], l0.i, l1.col[0], l1.col[1], l1.col[2], l1.i]);
    for (const batch of this.solid) batch.flush();

    // 2. Shadows, splats and smoke, blended over the scene.
    gl.enable(gl.BLEND);
    gl.depthMask(false);
    gl.enable(gl.POLYGON_OFFSET_FILL);
    gl.polygonOffset(-1, -2);
    gl.useProgram(this.sprog);
    gl.uniformMatrix4fv(this.su.uVP, false, this.vp);
    gl.uniform3fv(this.su.uRight, this.right);
    gl.uniform3fv(this.su.uUp, this.up);
    gl.uniform2f(this.su.uFog, 52, 105);
    gl.uniform3f(this.su.uFogCol, SKY[0], SKY[1], SKY[2]);
    gl.uniform1f(this.su.uAdd, 0);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.under.flush();
    gl.disable(gl.POLYGON_OFFSET_FILL);

    // 3. Gate glass.
    gl.useProgram(this.prog);
    gl.uniform1f(this.u.uAlpha, 0.5);
    this.glass.flush();

    // 4. Everything that glows, added on top.
    gl.useProgram(this.sprog);
    gl.uniform1f(this.su.uAdd, 1);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    this.glow.flush();
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);

    this.drawLabels(sim, fx, tags);
  }

  drawLabels(sim, fx, tags) {
    const c = this.ctx;
    c.clearRect(0, 0, this.w, this.h);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    for (const t of tags) {
      const q = this.project(t.x, t.y, t.z);
      if (!q) continue;
      const size = t.size * q.s;
      if (size < 7 * this.dpr) continue;
      this.text(t.str, q, Math.min(size, 70 * this.dpr), t.fill);
    }
    // Squad size.
    if (sim.count > 0) {
      const q = this.project(sim.x, 2.1, -sim.squadR * 0.2);
      if (q) {
        const size = Math.max(15 * this.dpr, 0.85 * q.s);
        const str = String(sim.count);
        c.font = `700 ${Math.round(size)}px "Chakra Petch", "Trebuchet MS", system-ui, sans-serif`;
        const wd = c.measureText(str).width + size * 0.9;
        c.fillStyle = 'rgba(14,30,72,0.82)';
        c.beginPath();
        if (c.roundRect) c.roundRect(q.x - wd / 2, q.y - size * 0.72, wd, size * 1.44, size * 0.72);
        else c.rect(q.x - wd / 2, q.y - size * 0.72, wd, size * 1.44);
        c.fill();
        c.fillStyle = '#eaf4ff';
        c.fillText(str, q.x, q.y + size * 0.04);
      }
    }
    // Floating words (gate pickups, losses).
    for (const f of fx.floats) {
      const q = this.project(f.x, f.y, f.z);
      if (!q) continue;
      c.globalAlpha = Math.min(1, f.life * 2.2);
      this.text(f.str, q, Math.max(14 * this.dpr, f.size * q.s), f.col);
    }
    c.globalAlpha = 1;
  }
}

return { gateLabel, Renderer };
