// Static level geometry (merged per material), colliders, bullet raycasts, nav grid, procedural textures, props & signs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, noiseFill, rand, mulberry } from './util.js';

// ---------- procedural textures ----------
const TEX = {};
function tex(key, f) { return TEX[key] || (TEX[key] = f()); }
export const T = {
  tile: (a = '#d9dcd6', b = '#c3c8c2') => tex('tile' + a + b, () => canvasTex(256, 256, (x, w, h) => { for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * 64, j * 64, 64, 64); } noiseFill(x, 0, 0, 'rgba(0,0,0,0)', 0.06, 3000, 2); x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 2; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * 64, 0); x.lineTo(i * 64, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 64); x.lineTo(256, i * 64); x.stroke(); } }, { repeat: [1, 1] })),
  paint: (c = '#cfd6d2') => tex('paint' + c, () => canvasTex(128, 128, (x, w, h) => { noiseFill(x, w, h, c, 0.05, 1500, 3); }, { repeat: [1, 1] })),
  asphalt: () => tex('asph', () => canvasTex(256, 256, (x, w, h) => { noiseFill(x, w, h, '#3a3b3e', 0.22, 9000, 2); for (let i = 0; i < 6; i++) { x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1.5; x.beginPath(); let px = rand(0, 256), py = rand(0, 256); x.moveTo(px, py); for (let k = 0; k < 6; k++) { px += rand(-30, 30); py += rand(-30, 30); x.lineTo(px, py); } x.stroke(); } }, { repeat: [1, 1] })),
  concrete: (c = '#9a9890') => tex('conc' + c, () => canvasTex(256, 256, (x, w, h) => { noiseFill(x, w, h, c, 0.14, 7000, 3); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.strokeRect(0, 0, 256, 256); }, { repeat: [1, 1] })),
  brick: (c = '#8a3b2a') => tex('brick' + c, () => canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#b8ab98'; x.fillRect(0, 0, w, h); const bw = 64, bh = 24; for (let r = 0; r < 11; r++) for (let k = -1; k < 5; k++) { const ox = (r % 2) * 32; const cc = new THREE.Color(c).offsetHSL(rand(-0.02, 0.02), rand(-0.05, 0.05), rand(-0.07, 0.07)); x.fillStyle = '#' + cc.getHexString(); x.fillRect(k * bw + ox + 2, r * bh + 2, bw - 4, bh - 4); } noiseFill(x, 0, 0, 'rgba(0,0,0,0)', 0.1, 3000, 2); }, { repeat: [1, 1] })),
  wood: (c = '#7a5232') => tex('wood' + c, () => canvasTex(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { const cc = new THREE.Color(c).offsetHSL(0, 0, rand(-0.06, 0.06)); x.fillStyle = '#' + cc.getHexString(); x.fillRect(0, i * 32, w, 32); x.strokeStyle = 'rgba(0,0,0,.35)'; x.strokeRect(0, i * 32, w, 32); for (let k = 0; k < 14; k++) { x.strokeStyle = 'rgba(0,0,0,.12)'; x.beginPath(); const y = i * 32 + rand(3, 29); x.moveTo(0, y); x.bezierCurveTo(80, y + rand(-4, 4), 160, y + rand(-4, 4), 256, y); x.stroke(); } } }, { repeat: [1, 1] })),
  grass: () => tex('grass', () => canvasTex(256, 256, (x, w, h) => { noiseFill(x, w, h, '#3d6a2c', 0.0, 0, 1); for (let i = 0; i < 9000; i++) { x.fillStyle = `hsl(${rand(80, 110)},${rand(35, 55)}%,${rand(18, 38)}%)`; x.fillRect(rand(0, w), rand(0, h), 1.5, rand(2, 6)); } }, { repeat: [1, 1] })),
  dirt: () => tex('dirt', () => canvasTex(256, 256, (x, w, h) => { noiseFill(x, w, h, '#5a4632', 0.25, 9000, 3); }, { repeat: [1, 1] })),
  carpet: (a = '#3a4a6a', b = '#c8a24a') => tex('carp' + a + b, () => canvasTex(128, 128, (x, w, h) => { noiseFill(x, w, h, a, 0.12, 4000, 1.5); x.fillStyle = b; for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { x.globalAlpha = .5; x.beginPath(); x.arc(i * 32 + 16, j * 32 + 16, 4, 0, 7); x.fill(); } x.globalAlpha = 1; }, { repeat: [1, 1] })),
  stone: (c = '#8c8a84') => tex('stone' + c, () => canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#4a4844'; x.fillRect(0, 0, w, h); for (let r = 0; r < 8; r++) for (let k = -1; k < 5; k++) { const cc = new THREE.Color(c).offsetHSL(0, 0, rand(-0.1, 0.08)); x.fillStyle = '#' + cc.getHexString(); const ox = (r % 2) * 30; x.beginPath(); x.roundRect(k * 60 + ox + 3, r * 32 + 3, 54 + rand(-6, 6), 26, 6); x.fill(); } noiseFill(x, 0, 0, 'rgba(0,0,0,0)', 0.12, 4000, 2); }, { repeat: [1, 1] })),
  books: () => tex('books', () => canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#2a1a10'; x.fillRect(0, 0, w, h); for (let s = 0; s < 4; s++) { let px = 2; while (px < 254) { const bw = rand(6, 16), bh = rand(44, 60); x.fillStyle = `hsl(${rand(0, 360)},${rand(25, 60)}%,${rand(20, 50)}%)`; x.fillRect(px, s * 64 + 62 - bh, bw - 1, bh); x.fillStyle = 'rgba(255,230,160,.5)'; x.fillRect(px + 1, s * 64 + 62 - bh + 6, bw - 3, 2); px += bw; } x.fillStyle = '#5a3a20'; x.fillRect(0, s * 64 + 60, w, 4); } }, { repeat: [1, 1] })),
  stripes: (a = '#ffffff', b = '#d8323c') => tex('str' + a + b, () => canvasTex(128, 64, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * 16, 0, 16, h); } }, { repeat: [1, 1] })),
  water: () => tex('water', () => canvasTex(256, 256, (x, w, h) => { noiseFill(x, w, h, '#1d4a5a', 0.15, 3000, 6); }, { repeat: [1, 1] })),
  senior: () => tex('senior', () => canvasTex(512, 512, (x, w, h) => { noiseFill(x, w, h, '#b9b4a8', 0.1, 6000, 2); x.fillStyle = 'rgba(60,55,45,.55)'; x.font = '600 15px Barlow Condensed, sans-serif'; const fn = ['ASHLEY', 'JORDAN', 'TAYLOR', 'MORGAN', 'CASEY', 'RILEY', 'JAMIE', 'AVERY', 'PARKER', 'QUINN', 'REESE', 'HAYDEN', 'DREW', 'BLAKE', 'SKYLER', 'EMERSON'], ln = ['SMITH', 'JONES', 'NGUYEN', 'GARCIA', 'MILLER', 'DAVIS', 'BROWN', 'WILSON', 'MOORE', 'TAYLOR', 'LEE', 'WHITE', 'HARRIS', 'CLARK', 'LEWIS', 'YOUNG']; for (let r = 0; r < 30; r++) for (let c = 0; c < 4; c++) x.fillText(fn[(r * 7 + c * 3) % 16] + ' ' + ['A.', 'B.', 'J.', 'M.', 'R.'][(r + c) % 5] + ' ' + ln[(r * 5 + c * 11) % 16], c * 128 + 4, r * 17 + 14); }, { repeat: [1, 1] })),
  blood: () => tex('blood', () => canvasTex(128, 128, (x, w, h) => { x.clearRect(0, 0, w, h); const g = x.createRadialGradient(64, 64, 4, 64, 64, 60); g.addColorStop(0, 'rgba(110,0,0,.95)'); g.addColorStop(.6, 'rgba(90,0,0,.85)'); g.addColorStop(1, 'rgba(60,0,0,0)'); x.fillStyle = g; for (let i = 0; i < 14; i++) { x.beginPath(); x.arc(64 + rand(-26, 26), 64 + rand(-26, 26), rand(8, 26), 0, 7); x.fill(); } x.fillStyle = 'rgba(100,0,0,.9)'; for (let i = 0; i < 26; i++) { const a = rand(0, 7), d = rand(30, 60); x.beginPath(); x.arc(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, rand(1, 4), 0, 7); x.fill(); } })),
  sky: (top, bot) => tex('sky' + top + bot, () => canvasTex(16, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, w, h); })),
};
const MATS = {};
export function M(key, make) { return MATS[key] || (MATS[key] = make()); }
export const std = (key, o) => M(key, () => new THREE.MeshStandardMaterial(o));
export function texMat(key, t, o = {}) { return M(key, () => new THREE.MeshStandardMaterial({ map: t, roughness: 0.85, ...o })); }
export function clearMats() { for (const k in MATS) { MATS[k].dispose(); delete MATS[k]; } }

// ---------- sign textures ----------
export function signTex(lines, o = {}) {
  const w = o.w || 512, h = o.h || 128;
  return canvasTex(w, h, (x) => {
    x.fillStyle = o.bg || '#111'; x.fillRect(0, 0, w, h);
    if (o.border) { x.strokeStyle = o.border; x.lineWidth = 8; x.strokeRect(6, 6, w - 12, h - 12); }
    const L = Array.isArray(lines) ? lines : [lines]; const n = L.length;
    L.forEach((t, i) => {
      const fs = (o.size || (h * 0.62 / n)) * (i === 0 ? 1 : 0.62); x.font = `${o.weight || ''} ${fs}px ${o.font || "'Black Ops One'"}`; x.textAlign = 'center'; x.textBaseline = 'middle';
      const y = n === 1 ? h / 2 : h * (0.36 + i * 0.4 / (n - 1 || 1)); if (o.glow) { x.shadowColor = o.glow; x.shadowBlur = 18; }
      x.fillStyle = (o.colors && o.colors[i]) || o.fg || '#fff'; let tw = x.measureText(t).width; if (tw > w * 0.92) { x.save(); x.translate(w / 2, y); x.scale(w * 0.92 / tw, 1); x.fillText(t, 0, 0); x.restore(); } else x.fillText(t, w / 2, y);
      x.shadowBlur = 0;
    });
  });
}

// ---------- world builder ----------
function boxGeo(w, h, d, tile) {
  const g = new THREE.BoxGeometry(w, h, d); if (!tile) return g; const uv = g.attributes.uv; const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
  return g;
}
export class World {
  constructor(scene) { this.scene = scene; this.group = new THREE.Group(); scene.add(this.group); this.buckets = new Map(); this.colliders = []; this.updaters = []; this.lights = []; this.bounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 }; this.rng = mulberry(7); }
  addGeo(geo, mat, cast = true, recv = true) { const k = mat.uuid + (cast ? 'c' : '') + (recv ? 'r' : ''); let b = this.buckets.get(k); if (!b) { b = { mat, geos: [], cast, recv }; this.buckets.set(k, b); } b.geos.push(geo); }
  collider(minX, maxX, minZ, maxZ, minY = 0, maxY = 3, kind = 'wall') { const c = { minX, maxX, minZ, maxZ, minY, maxY, kind }; this.colliders.push(c); return c; }
  box(x, y, z, w, h, d, mat, o = {}) {
    const g = boxGeo(w, h, d, o.tile); const m = new THREE.Matrix4(); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0));
    m.compose(new THREE.Vector3(x, y + h / 2, z), q, new THREE.Vector3(1, 1, 1)); g.applyMatrix4(m); this.addGeo(g, mat, o.cast !== false, o.recv !== false);
    if (o.collide !== false) { const ry = o.ry || 0; const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)); const hw = (w * c + d * s) / 2, hd = (w * s + d * c) / 2; this.collider(x - hw, x + hw, z - hd, z + hd, y, y + h, o.kind); }
    return this;
  }
  cyl(x, y, z, rt, rb, h, mat, o = {}) {
    const g = new THREE.CylinderGeometry(rt, rb, h, o.seg || 12, 1, !!o.open); if (o.rx || o.rz) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0)));
    g.translate(x, y + h / 2, z); this.addGeo(g, mat, o.cast !== false, true);
    if (o.collide) { const r = Math.max(rt, rb); this.collider(x - r, x + r, z - r, z + r, y, y + h, o.kind); }
    return this;
  }
  geo(g, mat, o = {}) { this.addGeo(g, mat, o.cast !== false, o.recv !== false); return this; }
  floor(minX, maxX, minZ, maxZ, mat, tile = 2, y = 0) {
    const g = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ); g.rotateX(-Math.PI / 2); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (maxX - minX) / tile, uv.getY(i) * (maxZ - minZ) / tile);
    g.translate((minX + maxX) / 2, y, (minZ + maxZ) / 2); this.addGeo(g, mat, false, true); return this;
  }
  // a wall segment from (x1,z1) to (x2,z2) (axis aligned or not)
  wall(x1, z1, x2, z2, h, mat, o = {}) { const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz), t = o.t || 0.3; const ry = -Math.atan2(dz, dx); return this.box((x1 + x2) / 2, o.y || 0, (z1 + z2) / 2, L + (o.ext ? t : 0), h, t, mat, { ...o, ry, tile: o.tile || 2 }); }
  add(obj, o = {}) { this.group.add(obj); obj.traverse(m => { if (m.isMesh) { m.castShadow = o.cast !== false; m.receiveShadow = true; } }); if (o.collide) { const b = new THREE.Box3().setFromObject(obj); this.collider(b.min.x, b.max.x, b.min.z, b.max.z, b.min.y, b.max.y, o.kind); } return obj; }
  sign(lines, x, y, z, w, h, o = {}) {
    const t = signTex(lines, { w: Math.round(Math.min(1024, 256 * w / h)), h: 256 > 256 * w / h ? 128 : 256 * (o.hres || 0.5), ...o }); t.anisotropy = 8;
    const mat = o.neon ? new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: o.neon, roughness: 0.6 }) : new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 });
    const m = new THREE.Mesh(o.box ? new THREE.BoxGeometry(w, h, o.box) : new THREE.PlaneGeometry(w, h), o.box ? [std('signedge', { color: 0x222222 }), std('signedge', { color: 0x222222 }), std('signedge', { color: 0x222222 }), std('signedge', { color: 0x222222 }), mat, mat] : mat);
    const ry = o.ry || 0; m.position.set(x + Math.sin(ry) * 0.015, y, z + Math.cos(ry) * 0.015); m.rotation.y = ry; this.group.add(m); m.castShadow = !!o.box; return m;
  }
  pointLight(x, y, z, color, intensity, dist, o = {}) { const l = new THREE.PointLight(color, intensity, dist, 1.6); l.position.set(x, y, z); this.group.add(l); this.lights.push(l); if (o.flicker) this.updaters.push((dt, t) => { l.intensity = intensity * (Math.sin(t * 23 + x) > 0.85 || Math.random() < 0.03 ? 0.15 : 1); }); return l; }
  finalize() {
    for (const b of this.buckets.values()) {
      // ensure attribute compatibility (all have position/normal/uv)
      const geos = b.geos.map(g => { const ng = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k); if (!ng.attributes.uv) ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2)); return ng; });
      const merged = mergeGeometries(geos, false); if (!merged) continue; merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, b.mat); mesh.castShadow = b.cast; mesh.receiveShadow = b.recv; mesh.matrixAutoUpdate = false; mesh.updateMatrix(); this.group.add(mesh);
      b.geos.forEach(g => g.dispose());
    }
    this.buckets.clear();
    this.buildNav();
  }
  dispose() { this.scene.remove(this.group); this.group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); const ms = Array.isArray(o.material) ? o.material : [o.material]; ms.forEach(m => { if (!Object.values(MATS).includes(m)) { m.map && m.map.dispose(); m.dispose(); } }); } }); }
  // ---------- collision ----------
  // push a circle (x,z,r) out of colliders whose y-range overlaps [y0,y1]
  collide(p, r, y0 = 0.1, y1 = 1.7) {
    const b = this.bounds; p.x = Math.max(b.minX + r, Math.min(b.maxX - r, p.x)); p.z = Math.max(b.minZ + r, Math.min(b.maxZ - r, p.z));
    for (let it = 0; it < 2; it++) for (const c of this.colliders) {
      if (c.maxY < y0 + 0.35 || c.minY > y1 || c.kind === 'nocol') continue;
      const cx = Math.max(c.minX, Math.min(p.x, c.maxX)), cz = Math.max(c.minZ, Math.min(p.z, c.maxZ)); const dx = p.x - cx, dz = p.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 < r * r) { if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; } else { // inside: push out shortest axis
        const l = p.x - c.minX, rr = c.maxX - p.x, t = p.z - c.minZ, bb = c.maxZ - p.z; const m = Math.min(l, rr, t, bb); if (m === l) p.x = c.minX - r; else if (m === rr) p.x = c.maxX + r; else if (m === t) p.z = c.minZ - r; else p.z = c.maxZ + r; } }
    }
    return p;
  }
  // ray vs colliders -> distance (or Infinity), also returns normal in this.hitN
  raycast(o, d, maxD = 200) {
    let best = maxD; this.hitN = this.hitN || new THREE.Vector3();
    for (const c of this.colliders) {
      if (c.kind === 'nocol' || c.kind === 'low' && false) continue;
      let tmin = 0, tmax = best, nAxis = -1, nSign = 0;
      const ax = [[o.x, d.x, c.minX, c.maxX], [o.y, d.y, c.minY, c.maxY], [o.z, d.z, c.minZ, c.maxZ]]; let ok = true;
      for (let i = 0; i < 3; i++) { const [oo, dd, mn, mx] = ax[i]; if (Math.abs(dd) < 1e-9) { if (oo < mn || oo > mx) { ok = false; break; } continue; } let t1 = (mn - oo) / dd, t2 = (mx - oo) / dd, s = -1; if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; s = 1; } if (t1 > tmin) { tmin = t1; nAxis = i; nSign = s; } if (t2 < tmax) tmax = t2; if (tmin > tmax) { ok = false; break; } }
      if (ok && tmin < best && tmin > 0) { best = tmin; this.hitN.set(nAxis === 0 ? nSign : 0, nAxis === 1 ? nSign : 0, nAxis === 2 ? nSign : 0); }
    }
    // ground plane
    if (d.y < -1e-6) { const tg = -o.y / d.y; if (tg > 0 && tg < best) { best = tg; this.hitN.set(0, 1, 0); } }
    return best;
  }
  los(a, b) { const d = new THREE.Vector3().subVectors(b, a); const L = d.length(); d.divideScalar(L); return this.raycast(a, d, L) >= L - 0.05; }
  // ---------- nav grid (flow field to the player) ----------
  buildNav() {
    const b = this.bounds, cs = this.cell = 0.8; this.gw = Math.ceil((b.maxX - b.minX) / cs); this.gh = Math.ceil((b.maxZ - b.minZ) / cs);
    const n = this.gw * this.gh; this.block = new Uint8Array(n); this.dist = new Uint16Array(n).fill(65535); this.q = new Int32Array(n);
    for (const c of this.colliders) {
      if (c.maxY < 0.5 || c.minY > 1.6 || c.kind === 'nocol') continue; const pad = 0.28;
      const x0 = Math.floor((c.minX - pad - b.minX) / cs), x1 = Math.floor((c.maxX + pad - b.minX) / cs), z0 = Math.floor((c.minZ - pad - b.minZ) / cs), z1 = Math.floor((c.maxZ + pad - b.minZ) / cs);
      for (let i = Math.max(0, x0); i <= Math.min(this.gw - 1, x1); i++) for (let j = Math.max(0, z0); j <= Math.min(this.gh - 1, z1); j++) {
        // only block if the cell center is meaningfully inside
        const cx = b.minX + (i + 0.5) * cs, cz = b.minZ + (j + 0.5) * cs; if (cx > c.minX - pad && cx < c.maxX + pad && cz > c.minZ - pad && cz < c.maxZ + pad) this.block[j * this.gw + i] = 1;
      }
    }
  }
  cellOf(x, z) { const i = Math.floor((x - this.bounds.minX) / this.cell), j = Math.floor((z - this.bounds.minZ) / this.cell); if (i < 0 || j < 0 || i >= this.gw || j >= this.gh) return -1; return j * this.gw + i; }
  flowFrom(x, z) {
    const D = this.dist, B = this.block, W = this.gw, Hh = this.gh, q = this.q; D.fill(65535); let s = this.cellOf(x, z); if (s < 0) return;
    if (B[s]) { // find nearest open cell
      for (let r = 1; r < 4 && B[s]; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { const c = s + dj * W + di; if (c >= 0 && c < D.length && !B[c]) { s = c; dj = r + 1; break; } }
    }
    let h = 0, t = 0; D[s] = 0; q[t++] = s;
    while (h < t) { const c = q[h++], ci = c % W, cj = (c / W) | 0, dn = D[c] + 1; if (dn > 400) continue;
      if (ci > 0 && !B[c - 1] && D[c - 1] > dn) { D[c - 1] = dn; q[t++] = c - 1; }
      if (ci < W - 1 && !B[c + 1] && D[c + 1] > dn) { D[c + 1] = dn; q[t++] = c + 1; }
      if (cj > 0 && !B[c - W] && D[c - W] > dn) { D[c - W] = dn; q[t++] = c - W; }
      if (cj < Hh - 1 && !B[c + W] && D[c + W] > dn) { D[c + W] = dn; q[t++] = c + W; } }
  }
  // direction to step along the flow field from (x,z); writes into out {x,z}; returns false if no path
  flowDir(x, z, out) {
    const c = this.cellOf(x, z); if (c < 0) return false; const W = this.gw, D = this.dist; let best = D[c], bi = -1;
    const ci = c % W, cj = (c / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= W || nj >= this.gh) continue; const n = nj * W + ni; if (this.block[n]) continue; if (di && dj && (this.block[cj * W + ni] || this.block[nj * W + ci])) continue; const v = D[n] + (di && dj ? 0.4 : 0); if (v < best) { best = v; bi = n; } }
    if (bi < 0) return false; const tx = this.bounds.minX + (bi % W + 0.5) * this.cell, tz = this.bounds.minZ + (((bi / W) | 0) + 0.5) * this.cell; const dx = tx - x, dz = tz - z, l = Math.hypot(dx, dz) || 1; out.x = dx / l; out.z = dz / l; return true;
  }
  isOpen(x, z) { const c = this.cellOf(x, z); return c >= 0 && !this.block[c]; }
}
