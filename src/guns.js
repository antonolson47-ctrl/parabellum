// Detailed procedural firearms: PBR materials with procedural normal/roughness maps and edge wear,
// first-person viewmodels with posed hands (Shayla's skin + green scrubs), recoil/slide/bolt/pump/reload animation,
// ejected casings, upgrade variants, Kennedy's world-model rifle and shop icons rendered from the 3D models.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// ───────────────────────────── procedural textures
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function heightField(N, seed, octaves, stretchX = 1, stretchY = 1) {
  const r = rng(seed), h = new Float32Array(N * N);
  for (const [cell, amp] of octaves) {
    const gx = Math.max(1, Math.round(N / cell / stretchX)), gy = Math.max(1, Math.round(N / cell / stretchY)); const g = new Float32Array(gx * gy); for (let i = 0; i < g.length; i++) g[i] = r();
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const fx = x / N * gx, fy = y / N * gy, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0; const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
      const a = g[(y0 % gy) * gx + x0 % gx], b = g[(y0 % gy) * gx + (x0 + 1) % gx], c = g[((y0 + 1) % gy) * gx + x0 % gx], d = g[((y0 + 1) % gy) * gx + (x0 + 1) % gx];
      h[y * N + x] += amp * ((a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy);
    }
  }
  return h;
}
function toNormal(N, h, strength) {
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'); const id = x.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const dx = (h[j * N + (i + 1) % N] - h[j * N + (i - 1 + N) % N]) * strength, dy = (h[((j + 1) % N) * N + i] - h[((j - 1 + N) % N) * N + i]) * strength;
    const l = Math.hypot(dx, dy, 1), o = (j * N + i) * 4; id.data[o] = (-dx / l * 0.5 + 0.5) * 255; id.data[o + 1] = (dy / l * 0.5 + 0.5) * 255; id.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; id.data[o + 3] = 255;
  }
  x.putImageData(id, 0, 0); return cv;
}
const TEX = {};
function tex(key, make, repeat = 1, srgb = false) {
  const k = key + '@' + repeat; if (TEX[k]) return TEX[k];
  const base = TEX[key] || (TEX[key] = (() => { const t = new THREE.CanvasTexture(make()); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; })());
  if (repeat === 1) return base; const t = base.clone(); t.repeat.set(repeat, repeat); t.needsUpdate = true; return (TEX[k] = t);
}
const N = 256;
const mkFine = () => toNormal(N, heightField(N, 11, [[3, 1], [1.5, 0.6]]), 2.2);
const mkStipple = () => toNormal(N, heightField(N, 23, [[6, 1], [3, 0.7], [1.5, 0.3]]), 4.5);
const mkBrushed = () => toNormal(N, heightField(N, 37, [[2, 1], [1, 0.5]], 40, 1), 1.6);
const mkWeave = () => { const h = new Float32Array(N * N); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const a = Math.sin(x / N * Math.PI * 2 * 48), b = Math.sin(y / N * Math.PI * 2 * 48); h[y * N + x] = ((Math.floor(x / N * 48) + Math.floor(y / N * 48)) % 2 ? a : b) * 0.5; } return toNormal(N, h, 1.2); };
const mkSkin = () => toNormal(N, heightField(N, 51, [[4, 0.4], [1.2, 1]]), 1.0);
function mkRough() { // grayscale (G) roughness multiplier with scratches
  const h = heightField(N, 77, [[16, 0.5], [4, 0.35], [1.5, 0.15]]); const cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'); const id = x.createImageData(N, N);
  for (let i = 0; i < N * N; i++) { const v = 0.72 + h[i] * 0.28; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v * 255; id.data[i * 4 + 3] = 255; }
  x.putImageData(id, 0, 0); const r = rng(5); x.strokeStyle = 'rgba(140,140,140,0.55)'; x.lineWidth = 0.7;
  for (let i = 0; i < 70; i++) { const px = r() * N, py = r() * N, a = r() * 6.28, l = 4 + r() * 22; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  return cv;
}
function mkWood() {
  const cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d'); const h = heightField(N, 91, [[64, 1], [8, 0.25]], 1, 6); const id = x.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const t = h[j * N + i] * 9 + j / N * 2; const ring = 0.5 + 0.5 * Math.sin(t * 6.28); const v = 0.55 + ring * 0.45; const o = (j * N + i) * 4; id.data[o] = 112 * v + 20; id.data[o + 1] = 62 * v + 10; id.data[o + 2] = 34 * v + 6; id.data[o + 3] = 255; }
  x.putImageData(id, 0, 0); return cv;
}
function mkPerf() { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); x.fillStyle = '#9a9ea4'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#050505'; for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { x.beginPath(); x.ellipse(16 + i * 32 + (j % 2) * 16, 16 + j * 32, 9, 9, 0, 0, 7); x.fill(); } return cv; }

// ───────────────────────────── materials (MeshStandard + edge-wear shader patch)
const MAT = {};
function wearPatch(m, wc, wr, wm) {
  m.userData.wear = { uWearColor: { value: new THREE.Color(wc) }, uWearRough: { value: wr }, uWearMetal: { value: wm } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, m.userData.wear);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float wear; varying float vWear;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvWear = wear;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vWear; uniform vec3 uWearColor; uniform float uWearRough; uniform float uWearMetal;')
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
#ifdef USE_ROUGHNESSMAP
  float wn = texelRoughness.g;
#else
  float wn = 0.85;
#endif
  float wr = smoothstep(0.32, 0.8, vWear * (wn * 1.25 - 0.1));
  diffuseColor.rgb = mix(diffuseColor.rgb, uWearColor, wr); roughnessFactor = mix(roughnessFactor, uWearRough, wr); metalnessFactor = mix(metalnessFactor, uWearMetal, wr);`);
  };
  m.customProgramCacheKey = () => 'wear1';
  return m;
}
function std(o) { return new THREE.MeshStandardMaterial(o); }
const MATDEF = {
  polymer: () => wearPatch(std({ color: 0x1d1e20, roughness: 0.78, metalness: 0, normalMap: tex('stip', mkStipple, 18), normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex('rough', mkRough, 9) }), 0x45474b, 0.55, 0),
  steel: () => wearPatch(std({ color: 0x24262a, roughness: 0.36, metalness: 0.85, normalMap: tex('fine', mkFine, 16), normalScale: new THREE.Vector2(0.07, 0.07), roughnessMap: tex('rough', mkRough, 9) }), 0xa4a9b0, 0.22, 1),
  bright: () => wearPatch(std({ color: 0x8e939a, roughness: 0.28, metalness: 1, normalMap: tex('fine', mkFine, 16), normalScale: new THREE.Vector2(0.15, 0.15), roughnessMap: tex('rough', mkRough, 9) }), 0xc8ccd2, 0.18, 1),
  blued: () => wearPatch(std({ color: 0x181b22, roughness: 0.3, metalness: 0.9, normalMap: tex('brush', mkBrushed, 4), normalScale: new THREE.Vector2(0.2, 0.2), roughnessMap: tex('rough', mkRough, 6) }), 0x8f949c, 0.2, 1),
  anod: () => wearPatch(std({ color: 0x1a1b1e, roughness: 0.5, metalness: 0.55, normalMap: tex('fine', mkFine, 14), normalScale: new THREE.Vector2(0.3, 0.3), roughnessMap: tex('rough', mkRough, 7) }), 0xbcc1c7, 0.3, 1),
  fde: () => wearPatch(std({ color: 0x9a8160, roughness: 0.74, metalness: 0, normalMap: tex('stip', mkStipple, 16), normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: tex('rough', mkRough, 8) }), 0xc2ab88, 0.6, 0),
  odg: () => wearPatch(std({ color: 0x4a5034, roughness: 0.75, metalness: 0, normalMap: tex('stip', mkStipple, 16), normalScale: new THREE.Vector2(0.45, 0.45), roughnessMap: tex('rough', mkRough, 8) }), 0x7d8460, 0.6, 0),
  redanod: () => wearPatch(std({ color: 0x8e1414, roughness: 0.38, metalness: 0.7, normalMap: tex('fine', mkFine, 14), normalScale: new THREE.Vector2(0.25, 0.25), roughnessMap: tex('rough', mkRough, 7) }), 0xd0d4d8, 0.25, 1),
  wood: () => wearPatch(std({ map: tex('wood', mkWood, 3, true), roughness: 0.5, metalness: 0, normalMap: tex('fine', mkFine, 10), normalScale: new THREE.Vector2(0.15, 0.15), roughnessMap: tex('rough', mkRough, 5) }), 0xc08a58, 0.6, 0),
  rubber: () => std({ color: 0x111112, roughness: 0.95, metalness: 0, normalMap: tex('stip', mkStipple, 20), normalScale: new THREE.Vector2(0.6, 0.6) }),
  dark: () => std({ color: 0x040405, roughness: 0.85, metalness: 0.2 }),
  brass: () => std({ color: 0xcaa24c, roughness: 0.28, metalness: 1, roughnessMap: tex('rough', mkRough, 4) }),
  hullred: () => std({ color: 0x9e1f18, roughness: 0.45, metalness: 0, normalMap: tex('fine', mkFine, 8), normalScale: new THREE.Vector2(0.2, 0.2) }),
  hullorange: () => std({ color: 0xe0581a, roughness: 0.4, metalness: 0, emissive: 0x401000, emissiveIntensity: 1 }),
  glass: () => std({ color: 0x18303e, roughness: 0.04, metalness: 0.9, transparent: true, opacity: 0.55 }),
  dot: () => new THREE.MeshBasicMaterial({ color: 0xff2a1a, toneMapped: false }),
  trit: () => new THREE.MeshBasicMaterial({ color: 0x9dff86, toneMapped: false }),
  white: () => std({ color: 0xf2f2f0, roughness: 0.5 }),
  perf: () => { const t = tex('perf', mkPerf, 1, true).clone(); t.repeat.set(3, 26); t.needsUpdate = true; return std({ map: t, roughness: 0.35, metalness: 0.8, side: THREE.DoubleSide }); },
  red: () => std({ color: 0xb01818, roughness: 0.5 }),
  abs: () => wearPatch(std({ color: 0xc9940f, roughness: 0.5, metalness: 0, normalMap: tex('fine', mkFine, 10), normalScale: new THREE.Vector2(0.15, 0.15), roughnessMap: tex('rough', mkRough, 6) }), 0xf7e3a0, 0.5, 0),
  absgrey: () => wearPatch(std({ color: 0x353a40, roughness: 0.5, metalness: 0.1, normalMap: tex('stip', mkStipple, 14), normalScale: new THREE.Vector2(0.35, 0.35), roughnessMap: tex('rough', mkRough, 6) }), 0x6a7078, 0.45, 0.2),
  copper: () => std({ color: 0xc27a3e, roughness: 0.3, metalness: 1 }),
  glowcyan: () => new THREE.MeshBasicMaterial({ color: 0x66f6ff, toneMapped: false }),
  glowblue: () => new THREE.MeshBasicMaterial({ color: 0x3a7dff, toneMapped: false }),
  ember: () => new THREE.MeshBasicMaterial({ color: 0xff7a22, toneMapped: false }),
  skin: () => std({ color: 0x96603f, roughness: 0.5, emissive: 0x1a0904, metalness: 0, normalMap: tex('skinn', mkSkin, 14), normalScale: new THREE.Vector2(0.18, 0.18) }),
  nail: () => std({ color: 0xc9a08f, roughness: 0.3, metalness: 0 }),
  scrub: () => std({ color: 0x2e7d5b, roughness: 0.92, metalness: 0, normalMap: tex('weave', mkWeave, 6), normalScale: new THREE.Vector2(0.5, 0.5), side: THREE.DoubleSide }),
  scrubdark: () => std({ color: 0x24644a, roughness: 0.95, metalness: 0, side: THREE.DoubleSide }),
  watch: () => std({ color: 0x141414, roughness: 0.6, metalness: 0.1 }),
  watchface: () => std({ color: 0x0c1418, roughness: 0.08, metalness: 0.6 }),
};
let ENV = null;
// reflections for the metals: a small PMREM'd RoomEnvironment, applied only to gun/hand materials (scene lighting untouched)
export function setGunEnv(renderer, RoomEnvironment) { if (ENV) return; const pm = new THREE.PMREMGenerator(renderer); ENV = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose(); for (const k in MAT) applyEnv(k, MAT[k]); }
const ENVI = { steel: 0.9, bright: 1.0, blued: 0.9, anod: 0.7, redanod: 0.8, brass: 1.0, copper: 1.0, glass: 1.2, polymer: 0.35, fde: 0.3, odg: 0.3, wood: 0.35, abs: 0.4, absgrey: 0.4, perf: 0.8, rubber: 0.15, skin: 0.25, nail: 0.4, watchface: 0.8, watch: 0.3, white: 0.3, red: 0.3, hullred: 0.3, hullorange: 0.3, scrub: 0.12, scrubdark: 0.1, dark: 0.1 };
function applyEnv(k, m) { if (ENV && m.isMeshStandardMaterial && ENVI[k] !== undefined) { m.envMap = ENV; m.envMapIntensity = ENVI[k]; m.needsUpdate = true; } return m; }
export function gm(k) { return MAT[k] || (MAT[k] = applyEnv(k, MATDEF[k]())); }

// ───────────────────────────── geometry helpers (all parts merged per material)
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
function place(g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) { _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)); g.applyMatrix4(_m); return g; }
function clean(g, mode) {
  if (g.index) g = g.toNonIndexed(); for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
  const n = g.attributes.normal, w = new Float32Array(n.count);
  if (mode) for (let i = 0; i < n.count; i++) { const x = Math.abs(n.getX(i)), y = Math.abs(n.getY(i)), z = Math.abs(n.getZ(i)); w[i] = mode === 'x' ? 4 * x * Math.hypot(y, z) : mode === 'z' ? 4 * z * Math.hypot(x, y) : Math.min(1, (1 - Math.max(x, y, z)) * 3.2); }
  g.setAttribute('wear', new THREE.BufferAttribute(w, 1)); g.morphAttributes = {}; return g;
}
function shape(pts, holes = []) { const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))); for (const h of holes) s.holes.push(new THREE.Path(h.map(p => new THREE.Vector2(p[0], p[1])))); return s; }
// side profile in (z, y), extruded across x (width), centred on x0
function profX(pts, width, o = {}) {
  const bv = o.bevel ?? 0.0012; const depth = Math.max(0.0005, width - 2 * bv);
  const g = new THREE.ExtrudeGeometry(shape(pts, o.holes || []), { depth, bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelOffset: -bv, bevelSegments: o.seg ?? 2, curveSegments: 4 });
  g.applyMatrix4(_m.set(0, 0, -1, depth / 2 + (o.x || 0), 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1)); return clean(g, 'x');
}
// cross-section in (x, y), extruded along -z from z0 by length
function profZ(pts, z0, length, o = {}) {
  const bv = o.bevel ?? 0.001; const depth = Math.max(0.0005, length - 2 * bv);
  const g = new THREE.ExtrudeGeometry(shape(pts, o.holes || []), { depth, bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelOffset: -bv, bevelSegments: 2, curveSegments: 4 });
  g.applyMatrix4(_m.makeScale(1, 1, -1)); g.applyMatrix4(_m.makeTranslation(0, 0, z0 - bv)); flip(g); return clean(g, 'z');
}
function flip(g) { // reverse triangle winding after a mirroring transform
  if (g.index) { const a = g.index.array; for (let i = 0; i < a.length; i += 3) { const t = a[i + 1]; a[i + 1] = a[i + 2]; a[i + 2] = t; } return g; }
  for (const k in g.attributes) { const at = g.attributes[k], s = at.itemSize, a = at.array; for (let i = 0; i < at.count; i += 3) for (let c = 0; c < s; c++) { const t = a[(i + 1) * s + c]; a[(i + 1) * s + c] = a[(i + 2) * s + c]; a[(i + 2) * s + c] = t; } }
  return g;
}
const box = (w, h, d, x, y, z, rx = 0, ry = 0, rz = 0) => clean(place(new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz), 0);
const rbox = (w, h, d, r, x, y, z, rx = 0, ry = 0, rz = 0) => clean(place(new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)), x, y, z, rx, ry, rz), 'all');
// cylinder along z, from z0 forward (toward -z) by len
const cylZ = (r1, r2, len, x, y, z0, seg = 18, open = false) => clean(place(new THREE.CylinderGeometry(r2, r1, len, seg, 1, open), x, y, z0 - len / 2, -Math.PI / 2), 0);
const cylY = (r, len, x, y, z, seg = 14, rx = 0, rz = 0) => clean(place(new THREE.CylinderGeometry(r, r, len, seg), x, y, z, rx, 0, rz), 0);
const cylX = (r, len, x, y, z, seg = 14) => clean(place(new THREE.CylinderGeometry(r, r, len, seg), x, y, z, 0, 0, Math.PI / 2), 0);
// lathe along z: pts [[r, d]] with d = forward distance from z0
const lathe = (pts, x, y, z0, seg = 20) => clean(place(new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg), x, y, z0, -Math.PI / 2), 0);
const torZ = (R, r, x, y, z, seg = 18) => clean(place(new THREE.TorusGeometry(R, r, 6, seg), x, y, z), 0);
const sph = (r, x, y, z, sx = 1, sy = 1, sz = 1, seg = 10) => clean(place(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.7 | 0)), x, y, z, 0, 0, 0, sx, sy, sz), 0);

class Part { // collects geometries per material and emits one merged mesh per material
  constructor() { this.l = {}; }
  add(mk, ...geos) { (this.l[mk] || (this.l[mk] = [])).push(...geos); return this; }
  build(name) { const g = new THREE.Group(); g.name = name || ''; for (const mk in this.l) { const me = new THREE.Mesh(mergeGeometries(this.l[mk], false), gm(mk)); me.name = mk; g.add(me); } return g; }
}
function rail(P, mk, z0, z1, y, w = 0.021) { // picatinny
  P.add(mk, box(w * 0.8, 0.004, z0 - z1, 0, y + 0.002, (z0 + z1) / 2));
  for (let z = z0 - 0.003; z > z1 + 0.002; z -= 0.01) P.add(mk, profZ([[-w / 2, 0], [w / 2, 0], [w / 2 - 0.002, 0.004], [-w / 2 + 0.002, 0.004]], z, 0.0052, { bevel: 0.0004 }).translate(0, y + 0.004, 0));
}

// ───────────────────────────── hands
// canonical right hand: palm faces -y, fingers along -z, thumb on -x, wrist toward +z. Pose = curls in radians.
const FING = [ // x, z, lengths, radius
  [-0.027, -0.041, [0.044, 0.027, 0.022], 0.0083], [-0.009, -0.045, [0.048, 0.03, 0.024], 0.0086], [0.009, -0.042, [0.045, 0.028, 0.023], 0.0081], [0.026, -0.035, [0.036, 0.022, 0.02], 0.0072]];
function capsule(r, len) { const g = new THREE.CapsuleGeometry(r, Math.max(0.001, len - r * 1.2), 3, 8); g.rotateX(Math.PI / 2); g.translate(0, 0, -len / 2); return g; }
function buildHand(pose, left, opts = {}) {
  const P = new Part(); const root = new THREE.Object3D();
  const addSeg = (obj, r, len, nail) => { obj.updateWorldMatrix(true, false); const m = new THREE.Matrix4().copy(obj.matrixWorld); P.add('skin', clean(capsule(r, len).applyMatrix4(m), 0)); if (nail) P.add('nail', clean(new THREE.SphereGeometry(r * 0.78, 6, 4).scale(0.95, 0.35, 1.25).translate(0, r * 0.62, -len + r * 1.1).applyMatrix4(m), 0)); };
  // palm (slightly tapered rounded block) + thenar pad + knuckle ridge
  P.add('skin', clean(new RoundedBoxGeometry(0.076, 0.026, 0.086, 3, 0.012).translate(0, 0, 0.0), 0));
  P.add('skin', sph(0.022, -0.026, -0.006, 0.012, 1.1, 0.7, 1.4));
  P.add('skin', sph(0.02, 0.022, -0.004, 0.02, 1.2, 0.65, 1.3));
  P.add('skin', clean(new THREE.CapsuleGeometry(0.0105, 0.058, 4, 10).rotateZ(Math.PI / 2).translate(0, 0.003, -0.037), 0));
  const curls = pose.f || [[0.3, 0.3, 0.2], [0.3, 0.3, 0.2], [0.3, 0.3, 0.2], [0.3, 0.3, 0.2]];
  FING.forEach(([fx, fz, L, r], i) => {
    L = L.map(v => v * 0.92); const c = curls[i]; let o = new THREE.Object3D(); o.position.set(fx, 0.002, fz); o.rotation.set(-c[0], (pose.spread || 0) * (1.5 - i) * 0.08, 0); root.add(o);
    for (let s = 0; s < 3; s++) { const rr = r * (1 - s * 0.1); addSeg(o, rr, L[s], s === 2); if (s < 2) { const n = new THREE.Object3D(); n.position.set(0, 0, -L[s] + rr * 0.3); n.rotation.x = -c[s + 1]; o.add(n); o = n; } }
  });
  { const t = pose.t || { yaw: 0.6, pitch: 0.3, roll: 0, c: [0.2, 0.3] }; let o = new THREE.Object3D(); o.position.set(-0.034, -0.006, 0.02); o.rotation.set(t.pitch, t.yaw, t.roll, 'YXZ'); root.add(o);
    const L = [0.04, 0.032, 0.027], R = [0.0112, 0.0101, 0.0092]; for (let s = 0; s < 3; s++) { addSeg(o, R[s], L[s], s === 2); const n = new THREE.Object3D(); n.position.set(0, 0, -L[s] + R[s] * 0.3); n.rotation.x = -(t.c[s] || 0); o.add(n); o = n; } }
  // wrist + forearm (lathe, flattened) and the scrub sleeve: built along +z, then bent at the wrist toward opts.arm
  const handP = P; const A = new Part(); { const P = A;
  const fa = new THREE.LatheGeometry([[0.0, 0.035], [0.024, 0.04], [0.026, 0.06], [0.028, 0.1], [0.034, 0.16], [0.04, 0.23], [0.043, 0.3], [0.044, 0.38], [0.0, 0.39]].map(p => new THREE.Vector2(p[0], p[1])), 18);
  fa.rotateX(Math.PI / 2); fa.scale(1.18, 0.82, 1); P.add('skin', clean(fa, 0));
  if (opts.sleeve !== false) {
    const sl = new THREE.LatheGeometry([[0.05, 0.22], [0.056, 0.27], [0.062, 0.36], [0.066, 0.5]].map(p => new THREE.Vector2(p[0], p[1])), 20); sl.rotateX(Math.PI / 2); sl.scale(1.12, 0.92, 1);
    const pa = sl.attributes.position; for (let i = 0; i < pa.count; i++) { const a = Math.atan2(pa.getY(i), pa.getX(i)); const k = 1 + 0.035 * Math.sin(a * 5 + pa.getZ(i) * 40); pa.setX(i, pa.getX(i) * k); pa.setY(i, pa.getY(i) * k); } sl.computeVertexNormals();
    P.add('scrub', clean(sl, 0)); P.add('scrubdark', clean(new THREE.TorusGeometry(0.0515, 0.0045, 6, 22).scale(1.12, 0.92, 1).translate(0, 0, 0.222), 0));
  }
  if (opts.watch) { P.add('watch', clean(new THREE.TorusGeometry(0.03, 0.0055, 6, 20).scale(1.12, 0.84, 1.6).translate(0, 0, 0.075), 0)); P.add('watch', cylY(0.017, 0.008, 0, 0.026, 0.075)); P.add('watchface', cylY(0.0145, 0.002, 0, 0.0305, 0.075)); }
  }
  const q = new THREE.Quaternion(); if (opts.arm) q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), opts.arm.clone().normalize());
  const am = new THREE.Matrix4().makeTranslation(0, 0, 0.042).multiply(new THREE.Matrix4().makeRotationFromQuaternion(q)).multiply(new THREE.Matrix4().makeTranslation(0, 0, -0.042));
  for (const k in A.l) for (const geo of A.l[k]) { geo.applyMatrix4(am); handP.add(k, geo); }
  const g = P.build('hand');
  if (left) g.children.forEach(me => { me.geometry.applyMatrix4(new THREE.Matrix4().makeScale(-1, 1, 1)); flip(me.geometry); });
  g.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingSphere(); } });
  return g;
}
// grip poses
export const POSE = {
  pistolR: { f: [[1.0, 1.0, 0.6], [1.55, 1.65, 0.9], [1.55, 1.65, 0.9], [1.55, 1.6, 0.9]], t: { yaw: 0.25, pitch: 0.1, roll: 0.5, c: [0.15, 0.25, 0.15] }, spread: 0.2 },
  pistolL: { f: [[1.0, 1.2, 0.6], [1.1, 1.25, 0.6], [1.15, 1.25, 0.6], [1.2, 1.2, 0.6]], t: { yaw: 0.15, pitch: 0.05, roll: 0.5, c: [0.1, 0.15, 0.1] }, spread: 0.1 },
  foregrip: { f: [[0.9, 1.0, 0.6], [1.0, 1.1, 0.6], [1.05, 1.1, 0.6], [1.1, 1.1, 0.6]], t: { yaw: 0.4, pitch: 0.4, roll: 0.3, c: [0.3, 0.4, 0.3] }, spread: 0.3 },
  pump: { f: [[0.95, 1.05, 0.6], [1.05, 1.15, 0.6], [1.1, 1.15, 0.6], [1.15, 1.15, 0.6]], t: { yaw: 0.45, pitch: 0.35, roll: 0.3, c: [0.35, 0.45, 0.3] }, spread: 0.25 },
  handle: { f: [[1.2, 1.3, 0.7], [1.3, 1.35, 0.7], [1.35, 1.35, 0.7], [1.4, 1.3, 0.7]], t: { yaw: 0.2, pitch: 0.2, roll: 0.6, c: [0.4, 0.6, 0.4] }, spread: 0.1 },
  open: { f: [[0.25, 0.3, 0.2], [0.3, 0.35, 0.2], [0.35, 0.35, 0.2], [0.4, 0.35, 0.2]], t: { yaw: 0.7, pitch: 0.3, roll: 0.2, c: [0.15, 0.2, 0.1] }, spread: 0.6 },
};

// ───────────────────────────── guns (local: x right, y up, muzzle toward -z; metres)
function pistolMag(ext, P) { // magazine body along -y (tilted by caller)
  const L = 0.104 + ext * 0.02; P.add('polymer', rbox(0.0205, L, 0.03, 0.002, 0, -L / 2, 0)); P.add('brass', cylZ(0.0045, 0.0045, 0.016, 0, -0.002, 0.008, 12)); P.add('bright', box(0.017, 0.002, 0.026, 0, -0.0055, 0));
  if (ext) P.add('polymer', rbox(0.024, ext * 0.02 + 0.004, 0.034, 0.002, 0, -0.104 - ext * 0.01 + 0.001, 0.001));
  P.add(ext ? 'bright' : 'polymer', rbox(0.026, 0.009, 0.037, 0.003, 0, -L - 0.002, 0.002));
}
const GRIP_A = 0.3;
export function buildPistol(cfg = {}) {
  const root = new THREE.Group(), F = new Part(), S = new Part(), M = new Part();
  const sx = 0.0125;
  S.add('steel', profZ([[-sx, 0], [sx, 0], [sx, 0.021], [sx - 0.0045, 0.0295], [-sx + 0.0045, 0.0295], [-sx, 0.021]], 0.03, 0.187, { bevel: 0.0009 }));
  for (let i = 0; i < 9; i++) for (const sd of [-1, 1]) S.add('dark', box(0.0008, 0.017, 0.001, sd * (sx + 0.00005), 0.0115, 0.0265 - i * 0.0025));
  S.add('dark', box(0.0126, 0.0055, 0.042, 0.0064, 0.0272, -0.026));
  S.add('steel', box(0.0035, 0.006, 0.0055, 0, 0.0322, -0.148)); S.add('white', sph(0.0011, 0, 0.0335, -0.1452, 1, 1, 0.4));
  S.add('steel', box(0.018, 0.003, 0.007, 0, 0.0305, 0.022), box(0.0045, 0.0065, 0.006, -0.0047, 0.0335, 0.022), box(0.0045, 0.0065, 0.006, 0.0047, 0.0335, 0.022));
  S.add('white', sph(0.001, -0.0047, 0.0345, 0.0251, 1, 1, 0.4), sph(0.001, 0.0047, 0.0345, 0.0251, 1, 1, 0.4));
  S.add('dark', box(0.009, 0.0015, 0.002, 0, 0.003, 0.0302));
  // frame (polymer) with integral trigger guard, finger grooves, beavertail and rail
  const fpts = [[0.032, 0.0], [-0.152, 0.0], [-0.152, -0.013], [-0.075, -0.015], [-0.079, -0.022], [-0.075, -0.043], [-0.036, -0.046], [-0.021, -0.042], [-0.019, -0.058], [-0.013, -0.066], [-0.013, -0.078], [-0.007, -0.087], [-0.006, -0.099], [0.0, -0.109], [0.006, -0.124], [0.05, -0.116], [0.04, -0.06], [0.041, -0.03], [0.046, -0.012], [0.038, -0.004]];
  const hole = [[-0.069, -0.018], [-0.067, -0.038], [-0.037, -0.04], [-0.028, -0.035], [-0.028, -0.018]];
  F.add('polymer', profX(fpts, 0.026, { bevel: 0.0018, holes: [hole] }));
  F.add('polymer', profX([[0.034, -0.004], [0.0, -0.004], [-0.005, -0.03], [0.04, -0.03]], 0.0292, { bevel: 0.0012 }));
  for (const z of [-0.14, -0.127, -0.114]) F.add('dark', box(0.02, 0.0012, 0.0045, 0, -0.0134, z));
  F.add('polymer', profX([[-0.045, -0.017], [-0.049, -0.027], [-0.046, -0.036], [-0.042, -0.0362], [-0.044, -0.027], [-0.041, -0.017]], 0.006, { bevel: 0.0008 }));
  F.add('steel', box(0.0016, 0.004, 0.017, -0.0136, -0.0035, -0.034), box(0.0018, 0.003, 0.006, -0.0136, -0.0075, -0.058), box(0.0018, 0.003, 0.006, 0.0136, -0.0075, -0.058));
  F.add('polymer', box(0.002, 0.0065, 0.008, -0.0138, -0.026, -0.024));
  F.add('bright', box(0.0108, 0.0045, 0.03, 0.0028, 0.0262, -0.026));
  F.add('steel', cylZ(0.0062, 0.0062, 0.003, 0, 0.0148, -0.1555, 16)); F.add('dark', cylZ(0.0044, 0.0044, 0.0034, 0, 0.0148, -0.1556, 12)); F.add('bright', cylZ(0.0028, 0.0028, 0.002, 0, 0.004, -0.1555, 10));
  let mz = -0.159;
  if (cfg.comp) { F.add('steel', profZ([[-0.0128, 0.0], [0.0128, 0.0], [0.0128, 0.02], [0.008, 0.0275], [-0.008, 0.0275], [-0.0128, 0.02]], -0.1575, 0.03, { bevel: 0.0008 }));
    for (const z of [-0.166, -0.177]) F.add('dark', box(0.011, 0.0012, 0.0055, 0, 0.0278, z)); F.add('dark', cylZ(0.0045, 0.0045, 0.002, 0, 0.0148, -0.1866, 12)); mz = -0.19; }
  if (cfg.well) F.add('redanod', rbox(0.034, 0.012, 0.058, 0.003, 0, 0, 0).applyMatrix4(new THREE.Matrix4().makeRotationX(-GRIP_A)).translate(0.0, -0.118, 0.03));
  if (cfg.rmr) { const b = 0.0295; S.add('anod', profZ([[-0.0112, 0], [0.0112, 0], [0.0112, 0.012], [0.0078, 0.0172], [-0.0078, 0.0172], [-0.0112, 0.012]], 0.018, 0.028, { bevel: 0.0007, holes: [[[-0.0086, 0.0022], [0.0086, 0.0022], [0.0086, 0.0112], [0.0058, 0.0148], [-0.0058, 0.0148], [-0.0086, 0.0112]]] }).translate(0, b, 0));
    S.add('glass', clean(new THREE.CircleGeometry(0.0085, 16).translate(0, b + 0.0085, -0.007), 0)); S.add('dot', sph(0.0007, 0, b + 0.0083, -0.0065)); S.add('anod', box(0.003, 0.004, 0.006, 0.012, b + 0.007, 0.006)); }
  pistolMag(cfg.ext || 0, M);
  const frame = F.build('frame'), slide = S.build('slide'), mag = M.build('mag');
  mag.position.set(0, -0.018, 0.008); mag.rotation.x = -GRIP_A; root.add(frame, slide, mag);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.0148, mz); root.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.012, 0.027, -0.026); root.add(eject);
  root.userData = { kind: 'pistol', slide, mag, muzzle, eject, magHome: mag.position.clone(), magAxis: new THREE.Vector3(0, -Math.cos(GRIP_A), Math.sin(GRIP_A)) };
  return root;
}
function pmagPts(k) { const s = y => (y < -0.06 ? -0.06 + (y + 0.06) * k : y); return [[-0.097, 0.0], [-0.04, 0.0], [-0.042, -0.06], [-0.049, -0.12], [-0.062, -0.178], [-0.06, -0.19], [-0.122, -0.19], [-0.124, -0.178], [-0.108, -0.12], [-0.1, -0.06]].map(([z, y]) => [z, s(y)]); }
export function buildRifle(cfg = {}) {
  const root = new THREE.Group(), U = new Part(), B = new Part(), CH = new Part(), M = new Part(), O = new Part();
  // upper receiver + rail + forward assist + port
  U.add('anod', profX([[0.09, 0], [0.09, 0.034], [0.084, 0.04], [-0.1, 0.04], [-0.1, 0.0]], 0.026, { bevel: 0.0016 }));
  rail(U, 'anod', 0.088, -0.395, 0.04);
  U.add('anod', cylZ(0.0074, 0.0074, 0.032, 0.0158, 0.026, 0.082, 14), cylZ(0.0068, 0.0068, 0.004, 0.0158, 0.026, 0.086, 14)); U.add('bright', cylZ(0.0056, 0.0056, 0.003, 0.0158, 0.026, 0.0885, 14));
  U.add('dark', box(0.0012, 0.0155, 0.056, 0.0131, 0.019, 0.0)); U.add('anod', box(0.007, 0.011, 0.009, 0.0145, 0.03, 0.04));
  U.add('anod', box(0.0012, 0.014, 0.056, 0.0175, 0.0035, 0.0, 0, 0, -0.55));
  // lower receiver with magwell + guard, controls
  U.add('anod', profX([[0.085, 0], [-0.1, 0], [-0.104, -0.058], [-0.035, -0.058], [-0.034, -0.046], [0.03, -0.046], [0.045, -0.028], [0.085, -0.028]], 0.024, { bevel: 0.0016, holes: [[[-0.03, -0.014], [-0.03, -0.04], [0.025, -0.04], [0.025, -0.014]]] }));
  U.add('anod', profX([[-0.1, -0.044], [-0.106, -0.044], [-0.106, -0.062], [-0.033, -0.062], [-0.033, -0.056], [-0.1, -0.056]], 0.029, { bevel: 0.0012 }));
  U.add('steel', cylX(0.0046, 0.004, 0.0135, -0.015, -0.03), box(0.0016, 0.014, 0.006, -0.0128, -0.013, -0.028), cylX(0.0062, 0.003, -0.0135, -0.016, 0.034), box(0.002, 0.004, 0.016, -0.0148, -0.016, 0.03), cylX(0.0028, 0.0262, 0, -0.01, 0.075), cylX(0.0028, 0.0262, 0, -0.01, -0.09));
  U.add('steel', profX([[-0.004, -0.014], [-0.007, -0.026], [-0.003, -0.036], [0.001, -0.036], [-0.002, -0.026], [0.001, -0.014]], 0.005, { bevel: 0.0007 }));
  // pistol grip (stippled polymer)
  U.add(cfg.bump ? 'odg' : 'fde', profX([[0.028, -0.028], [0.062, -0.028], [0.098, -0.125], [0.09, -0.134], [0.058, -0.134], [0.05, -0.122], [0.032, -0.06], [0.026, -0.04]], 0.027, { bevel: 0.003 }));
  // buffer tube + castle nut + stock
  U.add('anod', cylZ(0.0145, 0.0145, 0.17, 0, -0.011, 0.255, 18), lathe([[0.0, 0], [0.018, 0], [0.018, 0.008], [0.0, 0.008]], 0, -0.011, 0.093, 12));
  if (cfg.bump) { U.add('odg', profX([[0.15, 0.018], [0.335, 0.026], [0.34, -0.122], [0.31, -0.13], [0.26, -0.07], [0.17, -0.06], [0.15, -0.032]], 0.044, { bevel: 0.005 })); U.add('odg', rbox(0.016, 0.014, 0.05, 0.004, 0.022, -0.035, 0.09)); U.add('rubber', profX([[0.335, 0.026], [0.347, 0.026], [0.352, -0.124], [0.34, -0.124]], 0.046, { bevel: 0.002 })); }
  else { U.add('fde', profX([[0.17, 0.008], [0.325, 0.02], [0.33, -0.11], [0.305, -0.118], [0.27, -0.055], [0.2, -0.035], [0.17, -0.03]], 0.036, { bevel: 0.004, holes: [[[0.23, -0.004], [0.3, 0.004], [0.3, -0.03], [0.24, -0.026]]] })); U.add('rubber', profX([[0.325, 0.02], [0.337, 0.02], [0.342, -0.112], [0.33, -0.112]], 0.038, { bevel: 0.002 })); }
  // handguard (octagonal, M-LOK) + barrel + muzzle device
  U.add('anod', clean(place(new THREE.CylinderGeometry(0.0252, 0.0252, 0.295, 8, 1, false), 0, 0.016, -0.2475, -Math.PI / 2, Math.PI / 8, 0), 'all'));
  for (let i = 0; i < 6; i++) { const z = -0.128 - i * 0.043; U.add('dark', box(0.0008, 0.0072, 0.031, 0.0234, 0.016, z), box(0.0008, 0.0072, 0.031, -0.0234, 0.016, z), box(0.0072, 0.0008, 0.031, 0, 0.016 - 0.0234, z)); }
  U.add('anod', lathe([[0.012, 0], [0.026, 0], [0.026, 0.006], [0.012, 0.006]], 0, 0.016, -0.392, 16));
  U.add('steel', cylZ(0.0084, 0.0084, 0.088, 0, 0.016, -0.396, 16));
  let mz = -0.53;
  if ((cfg.match || 0) >= 3) { U.add('anod', cylZ(0.0185, 0.0185, 0.17, 0, 0.016, -0.48, 22), lathe([[0.019, 0], [0.0195, 0.004], [0.0195, 0.014], [0.019, 0.018]], 0, 0.016, -0.48, 22), lathe([[0.019, 0], [0.0195, 0.006], [0.012, 0.009], [0.004, 0.01]], 0, 0.016, -0.65, 22)); U.add('dark', cylZ(0.004, 0.004, 0.002, 0, 0.016, -0.6595, 10)); mz = -0.665; }
  else if ((cfg.match || 0) >= 1) { U.add('steel', rbox(0.025, 0.023, 0.058, 0.003, 0, 0.016, -0.509)); for (const z of [-0.494, -0.506, -0.518]) U.add('dark', box(0.0008, 0.012, 0.0065, 0.0126, 0.016, z), box(0.0008, 0.012, 0.0065, -0.0126, 0.016, z), box(0.012, 0.0008, 0.0065, 0, 0.0277, z)); U.add('dark', cylZ(0.004, 0.004, 0.002, 0, 0.016, -0.5375, 10)); mz = -0.54; }
  else { U.add('steel', lathe([[0.0085, 0], [0.0106, 0.004], [0.0106, 0.05], [0.0062, 0.051]], 0, 0.016, -0.482, 18)); for (let a = 0; a < 5; a++) { const an = Math.PI / 2 + (a - 2) * 0.62; U.add('dark', box(0.0013, 0.0034, 0.028, Math.cos(an) * 0.0103, 0.016 + Math.sin(an) * 0.0103, -0.513, 0, 0, an)); } U.add('dark', cylZ(0.0045, 0.0045, 0.002, 0, 0.016, -0.531, 10)); }
  // folded BUIS
  U.add('anod', rbox(0.018, 0.008, 0.022, 0.002, 0, 0.0525, 0.07), rbox(0.018, 0.008, 0.022, 0.002, 0, 0.0525, -0.37));
  // red dot optic on a riser
  O.add('anod', rbox(0.026, 0.008, 0.042, 0.002, 0, 0.0525, -0.012), box(0.016, 0.022, 0.03, 0, 0.066, -0.012));
  O.add('anod', lathe([[0.012, 0], [0.0168, 0.002], [0.0168, 0.016], [0.0178, 0.018], [0.0178, 0.05], [0.0168, 0.052], [0.0168, 0.066], [0.012, 0.068]], 0, 0.089, 0.022, 22));
  O.add('anod', cylY(0.0072, 0.012, 0, 0.108, -0.012, 14), cylX(0.0072, 0.012, 0.022, 0.089, -0.012, 14));
  O.add('glass', clean(new THREE.CircleGeometry(0.0125, 20).translate(0, 0.089, 0.02), 0), clean(new THREE.CircleGeometry(0.0125, 20).rotateY(Math.PI).translate(0, 0.089, -0.044), 0));
  O.add('dot', sph(0.0009, 0, 0.089, -0.03));
  // bolt carrier (visible in port) + charging handle
  B.add('bright', box(0.0012, 0.011, 0.03, 0.0135, 0.019, -0.006)); B.add('dark', box(0.0013, 0.003, 0.006, 0.0136, 0.022, 0.002));
  CH.add('anod', box(0.012, 0.006, 0.02, 0, 0.0365, 0.096), rbox(0.046, 0.006, 0.009, 0.002, 0, 0.0365, 0.104));
  // magazine
  if (cfg.mag === 2) { M.add('polymer', profX([[-0.097, 0.0], [-0.04, 0.0], [-0.043, -0.05], [-0.1, -0.05]], 0.022, { bevel: 0.002 }));
    for (const sx of [-1, 1]) { M.add('polymer', cylX(0.052, 0.036, sx * 0.024, -0.1, -0.07, 28)); M.add('brass', cylX(0.044, 0.002, sx * 0.0425, -0.1, -0.07, 24)); M.add('glass', cylX(0.046, 0.002, sx * 0.0435, -0.1, -0.07, 24)); M.add('polymer', torZ(0.049, 0.0035, 0, 0, 0, 28).rotateY(Math.PI / 2).translate(sx * 0.043, -0.1, -0.07)); } }
  else { const k = cfg.mag === 1 ? 1.32 : 1; M.add('fde', profX(pmagPts(k), 0.022, { bevel: 0.002 })); const fy = -0.06 - 0.13 * k; M.add('fde', profX([[-0.058, fy], [-0.126, fy], [-0.127, fy - 0.01], [-0.057, fy - 0.01]], 0.025, { bevel: 0.0015 }));
    for (let i = 0; i < 3; i++) { const y = -0.1 - i * 0.025 * k; M.add('fde', box(0.024, 0.003, 0.05, 0, y, -0.081 - i * 0.004)); } M.add('brass', cylZ(0.0029, 0.0029, 0.022, 0, -0.002, -0.06, 10)); }
  const up = U.build('upper'), bolt = B.build('bolt'), ch = CH.build('ch'), mag = M.build('mag'), optic = O.build('optic'); root.add(up, bolt, ch, mag, optic);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.016, mz); root.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.015, 0.02, -0.004); root.add(eject);
  root.userData = { kind: 'rifle', bolt, ch, mag, muzzle, eject, magHome: mag.position.clone(), magAxis: new THREE.Vector3(0, -1, 0.12).normalize() };
  return root;
}
function shell(P, hull, x, y, z, vertical = true) { if (vertical) { P.add(hull, cylY(0.0105, 0.05, x, y, z, 12)); P.add('brass', cylY(0.0109, 0.012, x, y - 0.025, z, 12)); } else { P.add(hull, cylZ(0.0105, 0.0105, 0.05, x, y, z, 12)); P.add('brass', cylZ(0.0109, 0.0109, 0.012, x, y, z + 0.012, 12)); } }
export function buildShotgun(cfg = {}) {
  const root = new THREE.Group(), R = new Part(), PU = new Part(); const hull = cfg.dragon ? 'hullorange' : 'hullred';
  R.add('blued', profX([[0.06, -0.004], [0.06, 0.036], [0.052, 0.046], [-0.118, 0.046], [-0.124, 0.04], [-0.124, -0.004]], 0.03, { bevel: 0.002 }));
  R.add('dark', box(0.0012, 0.018, 0.062, 0.0151, 0.024, -0.036), box(0.02, 0.0012, 0.072, 0, -0.0045, -0.042));
  R.add('anod', profX([[0.058, -0.004], [-0.012, -0.004], [-0.012, -0.012], [0.0, -0.04], [0.05, -0.04], [0.058, -0.02]], 0.022, { bevel: 0.0015, holes: [[[0.002, -0.011], [0.009, -0.032], [0.044, -0.032], [0.05, -0.011]]] }));
  R.add('steel', profX([[0.02, -0.008], [0.016, -0.02], [0.021, -0.03], [0.025, -0.03], [0.021, -0.02], [0.025, -0.008]], 0.006, { bevel: 0.0007 }), cylX(0.004, 0.03, 0, -0.008, 0.052));
  R.add('blued', cylZ(0.0105, 0.0105, 0.5, 0, 0.03, -0.122, 20)); R.add('dark', cylZ(0.0085, 0.0085, 0.002, 0, 0.03, -0.6215, 14));
  R.add('blued', box(0.008, 0.0018, 0.49, 0, 0.0428, -0.375)); for (let z = -0.14; z > -0.61; z -= 0.035) R.add('blued', box(0.003, 0.0035, 0.004, 0, 0.0405, z)); R.add('brass', sph(0.0021, 0, 0.0455, -0.614));
  R.add('blued', cylZ(0.0115, 0.0115, 0.42, 0, 0.0, -0.122, 18), cylZ(0.0125, 0.0112, 0.024, 0, 0.0, -0.542, 18), rbox(0.026, 0.05, 0.012, 0.004, 0, 0.016, -0.53));
  R.add('wood', profX([[0.06, 0.04], [0.11, 0.034], [0.355, 0.046], [0.36, -0.095], [0.33, -0.1], [0.13, -0.036], [0.085, -0.04], [0.06, -0.026]], 0.038, { bevel: 0.004 }));
  R.add('rubber', profX([[0.355, 0.046], [0.368, 0.046], [0.373, -0.096], [0.36, -0.1]], 0.04, { bevel: 0.002 }));
  if (cfg.shield) { R.add('perf', clean(place(new THREE.CylinderGeometry(0.0148, 0.0148, 0.3, 14, 1, true, -Math.PI / 2, Math.PI), 0, 0.03, -0.4, -Math.PI / 2), 0)); R.add('blued', box(0.032, 0.004, 0.01, 0, 0.032, -0.27), box(0.032, 0.004, 0.01, 0, 0.032, -0.53)); }
  if (cfg.saddle) { R.add('anod', rbox(0.003, 0.032, 0.1, 0.001, -0.0165, 0.02, -0.044)); for (let i = 0; i < 5; i++) shell(R, hull, -0.0285, 0.022, -0.08 + i * 0.019); }
  if (cfg.dragon) { R.add('ember', torZ(0.0098, 0.0012, 0, 0.03, -0.6222, 16)); shell(R, hull, 0.008, 0.024, -0.036, false); }
  // pump (ridged walnut) + action bars
  const pr = []; for (let i = 0; i <= 13; i++) { const d = i * 0.012; pr.push([i % 2 ? 0.0228 : 0.0212, d]); if (i < 13) pr.push([i % 2 ? 0.0228 : 0.0212, d + 0.006]); } pr.unshift([0.012, 0]); pr.push([0.012, 0.156]);
  const pg = new THREE.LatheGeometry(pr.map(p => new THREE.Vector2(p[0], p[1])), 18); pg.rotateX(-Math.PI / 2); pg.scale(1, 1.12, 1); pg.translate(0, 0.003, -0.16); PU.add('wood', clean(pg, 0));
  PU.add('steel', box(0.002, 0.006, 0.12, 0.0128, 0.003, -0.105), box(0.002, 0.006, 0.12, -0.0128, 0.003, -0.105));
  const rec = R.build('receiver'), pump = PU.build('pump'); root.add(rec, pump);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0.03, -0.625); root.add(muzzle);
  const eject = new THREE.Object3D(); eject.position.set(0.016, 0.024, -0.036); root.add(eject);
  root.userData = { kind: 'shotgun', pump, muzzle, eject };
  return root;
}
let screenTex = null;
function defibScreen() { if (screenTex) return screenTex; const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64; const x = cv.getContext('2d'); x.fillStyle = '#031a10'; x.fillRect(0, 0, 128, 64); x.strokeStyle = '#3f8'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 36); for (let i = 0; i < 128; i += 4) x.lineTo(i, 36 + (i % 32 === 16 ? -22 : i % 32 === 20 ? 16 : 0)); x.stroke(); x.fillStyle = '#ff5'; x.font = 'bold 16px sans-serif'; x.fillText('360J', 82, 17); x.fillStyle = '#f44'; x.fillText('CLEAR', 4, 17); screenTex = new THREE.CanvasTexture(cv); screenTex.colorSpace = THREE.SRGBColorSpace; return screenTex; }
export function buildDefib(cfg = {}) {
  const root = new THREE.Group(), P = new Part(), BAT = new Part();
  P.add('abs', rbox(0.1, 0.085, 0.24, 0.02, 0, 0, -0.08)); P.add('absgrey', rbox(0.104, 0.02, 0.2, 0.008, 0, -0.035, -0.09), rbox(0.092, 0.078, 0.03, 0.01, 0, 0, -0.205));
  P.add('absgrey', profX([[0.02, 0.04], [-0.12, 0.04], [-0.12, 0.072], [0.02, 0.072]], 0.024, { bevel: 0.006, holes: [[[0.005, 0.048], [-0.105, 0.048], [-0.105, 0.062], [0.005, 0.062]]] }));
  P.add('absgrey', profX([[0.0, -0.04], [0.035, -0.04], [0.06, -0.135], [0.034, -0.142], [0.004, -0.07]], 0.03, { bevel: 0.004 }));
  for (const sx of [-1, 1]) { P.add('bright', lathe([[0, 0], [0.024, 0], [0.026, 0.004], [0.026, 0.014], [0.021, 0.018], [0, 0.018]], sx * 0.03, 0, -0.218, 22)); for (let i = 0; i < 4; i++) P.add('copper', torZ(0.0215, 0.0026, sx * 0.03, 0, -0.226 - i * 0.0042, 18)); }
  P.add('red', box(0.002, 0.03, 0.01, 0.0505, 0.005, -0.06), box(0.002, 0.01, 0.03, 0.0505, 0.005, -0.06), box(0.002, 0.03, 0.01, -0.0505, 0.005, -0.06), box(0.002, 0.01, 0.03, -0.0505, 0.005, -0.06));
  P.add('red', cylY(0.008, 0.008, 0.032, 0.045, -0.15));
  const cable = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.04, -0.03, 0.035), new THREE.Vector3(-0.06, -0.08, 0.06), new THREE.Vector3(-0.03, -0.16, 0.04), new THREE.Vector3(0.02, -0.22, 0.09)]), 20, 0.006, 8); P.add('rubber', clean(cable, 0));
  const j = cfg.joules || 0; const caps = [[0.036, 0.046], [0.058, -0.002]];
  for (let i = 0; i < j; i++) for (const sx of [-1, 1]) { const [cx, cy] = caps[i]; P.add('glass', cylZ(0.0095, 0.0095, 0.12, sx * cx, cy, -0.03, 16)); P.add('glowcyan', cylZ(0.0042, 0.0042, 0.114, sx * cx, cy, -0.033, 10)); P.add('absgrey', cylZ(0.0112, 0.0112, 0.008, sx * cx, cy, -0.026, 14), cylZ(0.0112, 0.0112, 0.008, sx * cx, cy, -0.146, 14)); }
  if (cfg.codeblue) { for (const sx of [-1, 1]) P.add('glowblue', torZ(0.029, 0.0028, sx * 0.03, 0, -0.238, 22)); P.add('glowblue', rbox(0.02, 0.012, 0.02, 0.004, 0, 0.078, -0.16)); }
  BAT.add('absgrey', rbox(0.07, 0.03, 0.09, 0.006, 0, -0.055, -0.13)); BAT.add('abs', box(0.05, 0.004, 0.02, 0, -0.07, -0.13));
  const body = P.build('body'), bat = BAT.build('mag');
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.035), new THREE.MeshStandardMaterial({ map: defibScreen(), emissiveMap: defibScreen(), emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.2 })); scr.position.set(0, 0.0435, 0.0); scr.rotation.x = -Math.PI / 2 + 0.25;
  root.add(body, bat, scr);
  const muzzle = new THREE.Object3D(); muzzle.position.set(0, 0, -0.24); root.add(muzzle);
  root.userData = { kind: 'defib', mag: bat, muzzle, magHome: bat.position.clone(), magAxis: new THREE.Vector3(0, -1, 0) };
  return root;
}
export function buildBedpan() {
  const root = new THREE.Group(), P = new Part();
  const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push([0.135 * Math.sin(t * Math.PI / 2) + 0.005, -0.045 * Math.cos(t * Math.PI / 2)]); } pts.push([0.142, 0.002], [0.128, 0.004]);
  const g = new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 28); g.scale(1, 1, 1.25); P.add('bright', clean(g, 0)); P.add('bright', rbox(0.05, 0.012, 0.17, 0.004, 0, 0.0, 0.22));
  root.add(P.build('bedpan')); root.userData = { kind: 'bedpan' }; return root;
}
export function buildGun(kind, cfg = {}) { return kind === 'pistol' ? buildPistol(cfg) : kind === 'rifle' ? buildRifle(cfg) : kind === 'shotgun' ? buildShotgun(cfg) : kind === 'defib' ? buildDefib(cfg) : buildBedpan(); }
export function disposeTree(o) { o.traverse(c => { if (c.isMesh && c.geometry) c.geometry.dispose(); }); }

// ───────────────────────────── first-person viewmodels
const PI = Math.PI;
// hand placement per weapon (gun space): p = palm centre, r = euler (XYZ), pose name
export const RIG = {
  pistol: { base: [0.082, -0.08, -0.255], rot: [0.02, 0.1, 0], R: { p: [0.029, -0.056, 0.034], r: [-0.3, 0.3, -PI / 2], pose: 'pistolR', arm: [0.3, -0.5, 0.8] }, L: { p: [-0.03, -0.072, 0.024], r: [-0.25, -0.35, PI / 2], pose: 'pistolL', arm: [-0.3, -0.5, 0.8] }, lhAway: [-0.07, -0.22, 0.12] },
  akimbo: { base: [0.15, -0.12, -0.3] },
  rifle: { base: [0.115, -0.14, -0.3], R: { p: [0.032, -0.07, 0.072], r: [-0.42, 0.28, -PI / 2], pose: 'pistolR', arm: [0.35, -0.75, 0.55] }, L: { p: [-0.024, -0.02, -0.26], fp: [[1, 0.6, 0], [-0.35, 1, 0]], pose: 'foregrip', arm: [-0.35, -0.4, 0.85] }, lhAway: [-0.05, -0.25, 0.15] },
  shotgun: { base: [0.11, -0.13, -0.28], R: { p: [0.03, -0.035, 0.11], r: [-0.55, 0.28, -PI / 2], pose: 'pistolR', arm: [0.35, -0.75, 0.55] }, L: { p: [-0.024, -0.034, -0.25], fp: [[1, 0.6, 0], [-0.35, 1, 0]], pose: 'pump', arm: [-0.35, -0.4, 0.85] }, lhAway: [0.0, -0.05, 0.17] },
  defib: { base: [0.14, -0.14, -0.34], R: { p: [0.033, -0.082, 0.024], r: [-0.25, 0.3, -PI / 2], pose: 'pistolR', arm: [0.3, -0.6, 0.75] } },
  bedpan: { base: [-0.12, -0.13, -0.4], L: { p: [0.0, -0.012, 0.24], r: [0, 0, PI / 2], pose: 'handle', arm: [-0.3, -0.4, 0.86] } },
};
let flashTexture = null;
function flashTex() {
  if (flashTexture) return flashTexture; const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d');
  const g = x.createRadialGradient(64, 64, 2, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.18, 'rgba(255,230,150,0.95)'); g.addColorStop(0.5, 'rgba(255,150,40,0.55)'); g.addColorStop(1, 'rgba(255,80,0,0)');
  x.fillStyle = g; x.beginPath(); const r = rng(9); for (let i = 0; i < 22; i++) { const a = i / 22 * PI * 2, rr = i % 2 ? 14 + r() * 10 : 40 + r() * 22; x.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } x.closePath(); x.fill();
  flashTexture = new THREE.CanvasTexture(cv); flashTexture.colorSpace = THREE.SRGBColorSpace; return flashTexture;
}
function makeFlash(scale, color = 0xffffff) {
  const m = new THREE.MeshBasicMaterial({ map: flashTex(), color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  const g = new THREE.Group(); const front = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), m); g.add(front);
  for (let i = 0; i < 2; i++) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.17), m); s.rotation.set(PI / 2, 0, i * PI / 2); s.position.z = -0.07; s.rotation.order = 'ZXY'; g.add(s); }
  g.scale.setScalar(scale); g.visible = false; g.renderOrder = 12; return g;
}
const FLASH = { pistol: [0.9, 0xffffff], rifle: [1.2, 0xffffff], shotgun: [1.9, 0xffffff], defib: [1.4, 0x88ddff] };
export function upgradeCfg(kind, up) {
  if (kind === 'pistol') return { comp: up('pistol_dmg') >= 1, ext: up('pistol_mag'), well: up('pistol_rel') >= 1, rmr: up('pistol_sig') >= 1, akimbo: up('pistol_rof') >= 1 };
  if (kind === 'rifle') return { match: up('rifle_dmg'), mag: up('rifle_mag'), bump: up('rifle_sig') >= 1 };
  if (kind === 'shotgun') return { shield: up('shotgun_dmg') >= 1, saddle: up('shotgun_rel') >= 1, dragon: up('shotgun_sig') >= 1 };
  if (kind === 'defib') return { joules: up('defib_dmg'), codeblue: up('defib_sig') >= 1 };
  return {};
}
function handAt(spec, left, watch) {
  const w = new THREE.Group(); w.position.fromArray(spec.p);
  if (spec.fp) { // orient by fingers + palm directions (gun space)
    const F = new THREE.Vector3().fromArray(spec.fp[0]).normalize(), Pn = new THREE.Vector3().fromArray(spec.fp[1]);
    const ez = F.clone().negate(), ey = Pn.clone().sub(F.clone().multiplyScalar(Pn.dot(F))).normalize().negate(), ex = new THREE.Vector3().crossVectors(ey, ez);
    w.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(ex, ey, ez));
  } else w.rotation.set(spec.r[0], spec.r[1], spec.r[2]);
  let arm = null; if (spec.arm) { arm = new THREE.Vector3().fromArray(spec.arm).normalize().applyQuaternion(w.quaternion.clone().invert()); if (left) arm.x = -arm.x; }
  w.add(buildHand(POSE[spec.pose], left, { watch, arm })); return w;
}
function mirrorSpec(s) { return { p: [-s.p[0], s.p[1], s.p[2]], r: [s.r[0], -s.r[1], -s.r[2]], fp: s.fp ? s.fp.map(v => [-v[0], v[1], v[2]]) : null, pose: s.pose, arm: s.arm ? [-s.arm[0], s.arm[1], s.arm[2]] : null }; }
export function createVM(kind) { const vm = new THREE.Group(); vm.name = 'vm_' + kind; vm.userData = { kind, cfgKey: null, base: new THREE.Vector3() }; return vm; }
export function configureVM(vm, cfg = {}) {
  const u = vm.userData, kind = u.kind, key = JSON.stringify(cfg); if (u.cfgKey === key) return false; u.cfgKey = key;
  for (const c of [...vm.children]) { disposeTree(c); vm.remove(c); }
  const R = RIG[kind]; const akimbo = kind === 'pistol' && cfg.akimbo;
  u.base.fromArray(akimbo ? RIG.akimbo.base : R.base);
  const mkSide = (left) => {
    const rig = new THREE.Group(); const gun = buildGun(kind, cfg); rig.add(gun);
    let rh = null, lh = null;
    if (kind === 'bedpan') { lh = handAt(R.L, true, true); rig.add(lh); }
    else if (!left) { rh = handAt(R.R, false, false); rig.add(rh); if (!akimbo && R.L) { lh = handAt(R.L, true, true); rig.add(lh); } }
    else { lh = handAt(mirrorSpec(R.R), true, true); rig.add(lh); }
    let flash = null; if (FLASH[kind]) { flash = makeFlash(FLASH[kind][0], FLASH[kind][1]); gun.userData.muzzle.add(flash); }
    return { rig, gun, rh, lh, flash, lhHome: lh ? lh.position.clone() : null, shotT: 9, flashT: 0 };
  };
  u.sides = [mkSide(false)]; vm.add(u.sides[0].rig);
  if (akimbo) { const s2 = mkSide(true); s2.rig.position.set(-0.27, 0, 0); s2.rig.rotation.y = 0.04; u.sides.push(s2); vm.add(s2.rig); u.sides[0].rig.rotation.y = -0.04; }
  if (R.rot && !akimbo) u.sides[0].rig.rotation.set(R.rot[0], R.rot[1], R.rot[2]);
  for (const s of u.sides) s.rigHome = { p: s.rig.position.clone(), r: s.rig.rotation.clone() };
  u.next = 0; u.muzzle = u.sides[0].gun.userData.muzzle; u.eject = u.sides[0].gun.userData.eject; u.akimbo = akimbo;
  u.lhAway = new THREE.Vector3().fromArray(R.lhAway || [0, -0.2, 0.1]);
  vm.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; if (o.renderOrder < 10) o.renderOrder = 10; } });
  return true;
}
// called when a shot is fired: picks the side (akimbo alternates), kicks off slide/flash timers; returns muzzle/eject objects
export function vmShot(vm) {
  const u = vm.userData; const i = u.akimbo ? u.next : 0; u.next = u.akimbo ? 1 - u.next : 0; const s = u.sides[i];
  s.shotT = 0; s.flashT = 0.05; s.roll = (Math.random() - 0.5); u.muzzle = s.gun.userData.muzzle; u.eject = s.gun.userData.eject;
  if (s.flash) { s.flash.rotation.z = Math.random() * PI * 2; const k = 0.8 + Math.random() * 0.5; s.flash.scale.setScalar(FLASH[u.kind][0] * k); }
  return { muzzle: u.muzzle, eject: u.eject, side: i };
}
const ease = t => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const seg = (p, a, b) => ease((p - a) / (b - a));
const MAGLEN = { pistol: 0.1, rifle: 0.17, defib: 0.05 }; const _v = new THREE.Vector3();
const RECOIL = { pistol: [0.028, 0.012, 0.16, 0.06], rifle: [0.02, 0.004, 0.035, 0.02], shotgun: [0.05, 0.012, 0.12, 0.05], defib: [0.03, 0.008, 0.08, 0.02], bedpan: [0, 0, 0, 0] };
// st: { dt, reloadP (-1 or 0..1), shellP (-1 or 0..1), empty, shellTilt }
export function poseVM(vm, st) {
  const u = vm.userData; if (!u.sides) return; const kind = u.kind, K = RECOIL[kind];
  for (let si = 0; si < u.sides.length; si++) {
    const s = u.sides[si], g = s.gun.userData; s.shotT += st.dt; if (s.flashT > 0) s.flashT -= st.dt; if (s.flash) s.flash.visible = s.flashT > 0;
    const t = s.shotT, rc = t < 0.022 ? t / 0.022 : Math.max(0, 1 - (t - 0.022) / 0.1);
    s.rig.position.copy(s.rigHome.p); s.rig.rotation.copy(s.rigHome.r);
    s.rig.position.z += rc * K[0]; s.rig.position.y += rc * K[1]; s.rig.rotation.x += rc * K[2]; s.rig.rotation.z += rc * K[3] * (s.roll || 0);
    if (s.lh) s.lh.position.copy(s.lhHome);
    const P = st.reloadP; const rel = P >= 0 && kind !== 'shotgun';
    const side = si === 1 ? -1 : 1;
    if (rel) {
      const tilt = seg(P, 0, 0.14) - seg(P, 0.86, 1);
      const tk = kind === 'rifle' ? 0.55 : 1; s.rig.rotation.z += tilt * 0.42 * side * tk; s.rig.rotation.x += tilt * 0.22 * tk; s.rig.position.y += tilt * (kind === 'pistol' ? 0.04 : 0.025); s.rig.position.x -= tilt * 0.02 * side;
      if (g.mag) {
        const out = seg(P, 0.12, 0.27), inn = seg(P, 0.55, 0.74); const d = P < 0.5 ? out * 0.17 : (1 - inn) * 0.17;
        g.mag.position.copy(g.magHome).addScaledVector(g.magAxis, d); g.mag.visible = !(P > 0.28 && P < 0.45);
      }
      if (s.lh && !u.akimbo && kind !== 'bedpan') {
        if (P < 0.42 || !g.mag) { const a = P < 0.5 ? seg(P, 0.14, 0.32) : 1 - seg(P, 0.52, 0.8); s.lh.position.addScaledVector(u.lhAway, a); }
        else { // support hand carries the fresh mag up into the well, then returns to its grip
          const away = s.lhHome.clone().add(u.lhAway), at = g.mag.position.clone().addScaledVector(g.magAxis, MAGLEN[kind] || 0.1).add(_v.set(-0.012, -0.01, 0.0));
          const a = seg(P, 0.42, 0.5), b = seg(P, 0.76, 0.88); s.lh.position.copy(away).lerp(at, a).lerp(s.lhHome, b);
        }
      }
    } else if (g.mag) { g.mag.position.copy(g.magHome); g.mag.visible = true; }
    const rack = rel ? seg(P, 0.8, 0.86) - seg(P, 0.88, 0.95) : 0;
    if (kind === 'pistol') { const locked = st.empty && (P < 0 || P < 0.85); g.slide.position.z = Math.max(locked ? 0.032 : 0, rc * 0.032, rack * 0.032); }
    if (kind === 'rifle') { const locked = st.empty && (P < 0 || P < 0.85); g.bolt.position.z = Math.max(locked ? 0.03 : 0, rc * 0.03, rack * 0.03); g.ch.position.z = rack * 0.055; }
    if (kind === 'shotgun') {
      const pz = seg(t, 0.1, 0.21) * 0.075 - seg(t, 0.25, 0.37) * 0.075; g.pump.position.z = pz; if (s.lh) s.lh.position.z += pz;
      if (st.shellP >= 0) { const q = Math.sin(st.shellP * PI); s.rig.rotation.z += 0.3 * (st.shellTilt || 1); s.rig.rotation.x += 0.12; if (s.lh) s.lh.position.addScaledVector(u.lhAway, q); }
      else if (st.shellTilt) { s.rig.rotation.z += 0.3 * st.shellTilt; s.rig.rotation.x += 0.12 * st.shellTilt; }
    }
  }
}
// ───────────────────────────── ejected casings (world space, instanced)
export class Casings {
  constructor(scene) {
    this.types = {};
    const mk = (name, geo, mat, n = 20) => { const im = new THREE.InstancedMesh(geo, mat, n); im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.frustumCulled = false; im.castShadow = false; scene.add(im); const st = []; for (let i = 0; i < n; i++) { st.push({ life: 0, p: new THREE.Vector3(), v: new THREE.Vector3(), q: new THREE.Quaternion(), w: new THREE.Vector3() }); im.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); } this.types[name] = { im, st, i: 0 }; };
    const c9 = new THREE.CylinderGeometry(0.0049, 0.0049, 0.019, 8); const c556 = new THREE.LatheGeometry([[0, 0], [0.0048, 0], [0.0048, 0.034], [0.003, 0.039], [0.003, 0.045], [0, 0.045]].map(p => new THREE.Vector2(p[0], p[1])), 8); c556.translate(0, -0.022, 0);
    const shellG = mergeGeometries([clean(new THREE.CylinderGeometry(0.0105, 0.0105, 0.05, 10), 0), clean(new THREE.CylinderGeometry(0.0109, 0.0109, 0.012, 10).translate(0, -0.025, 0), 0)].map(g => { g.deleteAttribute('wear'); return g; }), true);
    mk('pistol', c9, gm('brass')); mk('rifle', c556, gm('brass')); mk('shotgun', shellG, [gm('hullred'), gm('brass')], 12); mk('dragon', shellG, [gm('hullorange'), gm('brass')], 12);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._s = new THREE.Vector3(1, 1, 1);
  }
  spawn(type, p, v) { const T = this.types[type]; if (!T) return; const c = T.st[T.i]; T.i = (T.i + 1) % T.st.length; c.life = 2.2; c.p.copy(p); c.v.copy(v); c.q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3)); c.w.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30); c.bounced = 0; }
  update(dt, floorY = 0) {
    for (const k in this.types) { const T = this.types[k]; let dirty = false;
      for (let i = 0; i < T.st.length; i++) { const c = T.st[i]; if (c.life <= 0) continue; dirty = true; c.life -= dt;
        c.v.y -= 9.8 * dt; c.p.addScaledVector(c.v, dt); const r = k === 'pistol' || k === 'rifle' ? 0.005 : 0.011;
        if (c.p.y < floorY + r) { c.p.y = floorY + r; if (Math.abs(c.v.y) > 0.4 && c.bounced < 3) { c.v.y = -c.v.y * 0.35; c.v.x *= 0.6; c.v.z *= 0.6; c.w.multiplyScalar(0.5); c.bounced++; } else { c.v.set(0, 0, 0); c.w.set(0, 0, 0); } }
        this._q.setFromEuler(new THREE.Euler(c.w.x * dt, c.w.y * dt, c.w.z * dt)); c.q.multiply(this._q);
        const sc = c.life > 0 ? (c.life < 0.3 ? c.life / 0.3 : 1) : 0; this._s.setScalar(sc); this._m.compose(c.p, c.q, this._s); T.im.setMatrixAt(i, this._m);
      }
      if (dirty) T.im.instanceMatrix.needsUpdate = true; }
  }
  clear() { for (const k in this.types) { const T = this.types[k]; for (let i = 0; i < T.st.length; i++) { T.st[i].life = 0; T.im.setMatrixAt(i, this._m.makeScale(0, 0, 0)); } T.im.instanceMatrix.needsUpdate = true; } }
}
// ───────────────────────────── Kennedy's rifle (world model: muzzle toward +z, origin at the pistol grip)
export function rifleWorldModel() {
  const w = new THREE.Group(); const m = buildRifle({}); m.rotation.y = PI; m.position.set(0, 0.075, 0.065); w.add(m);
  m.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); w.userData.muzzle = m.userData.muzzle; return w;
}
// ───────────────────────────── shop icons rendered from the models
const ICONS = new Map();
export function gunIcon(renderer, kind, cfg = {}, W = 240, H = 104) {
  const key = kind + JSON.stringify(cfg); if (ICONS.has(key)) return ICONS.get(key);
  const sc = new THREE.Scene(); let gun = buildGun(kind, cfg); if (kind === 'defib') gun.rotation.y = -0.6;
  if (kind === 'pistol' && cfg.akimbo) { const pair = new THREE.Group(), g2 = buildGun(kind, cfg); g2.position.set(-0.06, 0.045, -0.055); pair.add(gun, g2); gun = pair; }
  sc.add(gun);
  sc.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a3430, 2.4)); const k = new THREE.DirectionalLight(0xffffff, 3.4); k.position.set(1.5, 2, 1.2); sc.add(k); const rim = new THREE.DirectionalLight(0xffd0a0, 1.4); rim.position.set(-1, 0.5, -2); sc.add(rim);
  gun.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(gun); const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
  const asp = W / H; const half = Math.max(sz.z / 2 / asp, sz.y / 2) * 1.08 + 0.004; const cam = new THREE.OrthographicCamera(-half * asp, half * asp, half, -half, 0.01, 10);
  cam.position.set(c.x + 1.5, c.y + 0.25, c.z); cam.lookAt(c); cam.up.set(0, 1, 0);
  const s = 2, rt = new THREE.WebGLRenderTarget(W * s, H * s, { samples: 4 }); const prevClear = renderer.getClearColor(new THREE.Color()), prevA = renderer.getClearAlpha();
  renderer.setClearColor(0x000000, 0); renderer.setRenderTarget(rt); renderer.clear(); renderer.render(sc, cam); const px = new Uint8Array(W * s * H * s * 4); renderer.readRenderTargetPixels(rt, 0, 0, W * s, H * s, px); renderer.setRenderTarget(null); renderer.setClearColor(prevClear, prevA); rt.dispose();
  const big = document.createElement('canvas'); big.width = W * s; big.height = H * s; const bx = big.getContext('2d'); const id = bx.createImageData(W * s, H * s); const ww = W * s * 4;
  for (let y = 0; y < H * s; y++) for (let i = 0; i < ww; i += 4) { const o = (H * s - 1 - y) * ww + i, d = y * ww + i; const a = px[o + 3] / 255; for (let ch = 0; ch < 3; ch++) { let v = px[o + ch] / 255 / Math.max(a, 1e-3); v = v / (1 + v * 0.35) * 1.2; id.data[d + ch] = Math.min(255, Math.pow(v, 1 / 2.2) * 255); } id.data[d + 3] = px[o + 3]; }
  bx.putImageData(id, 0, 0); const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(big, 0, 0, W, H);
  disposeTree(gun); const url = cv.toDataURL('image/png'); ICONS.set(key, url); return url;
}
