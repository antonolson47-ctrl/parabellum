// Pooled effects: blood/spark particles, blood decals, gibs, tracers, muzzle flash, arcs.
import * as THREE from 'three';
import { T } from './world.js';
import { rand } from './util.js';
export const FX = {};
const PN = 900;
export function initFX(scene) {
  FX.scene = scene;
  // particles
  const g = new THREE.BufferGeometry(); FX.pp = new Float32Array(PN * 3); FX.pc = new Float32Array(PN * 3); FX.ps = new Float32Array(PN);
  FX.pv = new Float32Array(PN * 3); FX.pl = new Float32Array(PN); FX.pg = new Float32Array(PN); FX.pHead = 0;
  g.setAttribute('position', new THREE.BufferAttribute(FX.pp, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(FX.pc, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('size', new THREE.BufferAttribute(FX.ps, 1).setUsage(THREE.DynamicDrawUsage));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, vertexColors: true, uniforms: { uScale: { value: 400 } },
    vertexShader: `attribute float size; varying vec3 vC; void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * 300. / max(0.2, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vC; void main(){ vec2 d = gl_PointCoord - .5; float r = dot(d,d); if (r > .25) discard; gl_FragColor = vec4(vC * (1.15 - r*2.), 1.); }` });
  FX.points = new THREE.Points(g, m); FX.points.frustumCulled = false; scene.add(FX.points);
  for (let i = 0; i < PN; i++) FX.pp[i * 3 + 1] = -100;
  // decals
  const dm = new THREE.MeshStandardMaterial({ map: T.blood(), transparent: true, depthWrite: false, roughness: 0.25, polygonOffset: true, polygonOffsetFactor: -4 });
  FX.decals = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), dm, 90); FX.decals.count = 0; FX.decalHead = 0; FX.decals.receiveShadow = true; FX.decals.frustumCulled = false; scene.add(FX.decals);
  // gibs
  FX.gibs = []; const gm = new THREE.MeshStandardMaterial({ color: 0x8a2a20, roughness: 0.4 }); const bm = new THREE.MeshStandardMaterial({ color: 0x5a6a4a, roughness: 0.8 });
  const geos = [new THREE.CapsuleGeometry(0.045, 0.22, 3, 6), new THREE.IcosahedronGeometry(0.06, 0), new THREE.CapsuleGeometry(0.035, 0.12, 3, 6), new THREE.IcosahedronGeometry(0.035, 0)];
  for (let i = 0; i < 26; i++) { const gm2 = new THREE.Mesh(geos[i % 4], i % 3 ? gm : bm); gm2.visible = false; gm2.castShadow = true; scene.add(gm2); FX.gibs.push({ m: gm2, v: new THREE.Vector3(), w: new THREE.Vector3(), life: 0 }); }
  FX.gibHead = 0;
  // tracers
  FX.tr = []; const tm = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending });
  const tg = new THREE.BoxGeometry(0.012, 0.012, 1); tg.translate(0, 0, 0.5); // Object3D.lookAt aims +z at the target
  for (let i = 0; i < 12; i++) { const t = new THREE.Mesh(tg, tm); t.visible = false; t.frustumCulled = false; scene.add(t); FX.tr.push({ m: t, life: 0 }); }
  FX.trHead = 0;
  // arcs (defib)
  FX.arcs = []; const am = new THREE.LineBasicMaterial({ color: 0x9fe8ff, transparent: true, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 8; i++) { const ag = new THREE.BufferGeometry(); ag.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3)); const l = new THREE.Line(ag, am); l.visible = false; l.frustumCulled = false; scene.add(l); FX.arcs.push({ l, life: 0 }); }
  FX.arcHead = 0;
  // shared flash light (always in scene to avoid recompiles)
  FX.flash = new THREE.PointLight(0xffc070, 0, 9, 2); scene.add(FX.flash); FX.flashT = 0;
}
const tmp = new THREE.Vector3();
export function particle(p, v, col, size, life, grav = 9.8) {
  const i = FX.pHead; FX.pHead = (FX.pHead + 1) % PN;
  FX.pp[i * 3] = p.x; FX.pp[i * 3 + 1] = p.y; FX.pp[i * 3 + 2] = p.z; FX.pv[i * 3] = v.x; FX.pv[i * 3 + 1] = v.y; FX.pv[i * 3 + 2] = v.z;
  FX.pc[i * 3] = col.r; FX.pc[i * 3 + 1] = col.g; FX.pc[i * 3 + 2] = col.b; FX.ps[i] = size; FX.pl[i] = life; FX.pg[i] = grav;
}
const RED = new THREE.Color(0.5, 0.0, 0.0), RED2 = new THREE.Color(0.75, 0.04, 0.03), CUST = new THREE.Color(1.0, 0.92, 0.6), SPARK = new THREE.Color(1, 0.8, 0.4), DUST = new THREE.Color(0.5, 0.48, 0.44);
export function blood(p, dir, n = 14, spread = 2.5, custard = false) {
  const c = new THREE.Color();
  for (let k = 0; k < n; k++) {
    tmp.set(rand(-1, 1), rand(-0.3, 1.2), rand(-1, 1)).multiplyScalar(spread); if (dir) tmp.addScaledVector(dir, rand(1, 4));
    c.copy(custard && k % 2 ? CUST : (Math.random() < 0.5 ? RED : RED2)); particle(p, tmp, c, rand(0.02, 0.06), rand(0.5, 1.1));
  }
}
export function mist(p, n = 10) { const c = new THREE.Color(); for (let k = 0; k < n; k++) { tmp.set(rand(-1, 1), rand(-0.5, 1), rand(-1, 1)).multiplyScalar(1.2); c.copy(RED2).multiplyScalar(rand(0.6, 1.1)); particle(p, tmp, c, rand(0.06, 0.12), rand(0.25, 0.5), 1); } }
export function sparks(p, n = 6, nrm) { for (let k = 0; k < n; k++) { tmp.set(rand(-1, 1), rand(0, 1.5), rand(-1, 1)).multiplyScalar(2.5); if (nrm) tmp.addScaledVector(nrm, 2); particle(p, tmp, Math.random() < 0.5 ? SPARK : DUST, rand(0.015, 0.035), rand(0.2, 0.5)); } }
export function fountain(p, dir, n = 6) { const c = new THREE.Color(); for (let k = 0; k < n; k++) { tmp.copy(dir).multiplyScalar(rand(2.5, 4.5)).add(new THREE.Vector3(rand(-.6, .6), rand(-.2, .4), rand(-.6, .6))); c.copy(Math.random() < .5 ? RED : RED2); particle(p, tmp, c, rand(0.025, 0.05), rand(0.6, 1.0)); } }
const dq = new THREE.Quaternion(), dm4 = new THREE.Matrix4(), up = new THREE.Vector3(0, 0, 1);
export function decal(p, n, size = 1) {
  const i = FX.decalHead; FX.decalHead = (FX.decalHead + 1) % FX.decals.instanceMatrix.count; FX.decals.count = Math.max(FX.decals.count, i + 1);
  dq.setFromUnitVectors(up, n); const r = new THREE.Quaternion().setFromAxisAngle(up, rand(0, 6.28)); dq.multiply(r);
  tmp.copy(p).addScaledVector(n, 0.012 + i * 0.00005); const s = size * rand(0.7, 1.3); dm4.compose(tmp, dq, new THREE.Vector3(s, s, s)); FX.decals.setMatrixAt(i, dm4); FX.decals.instanceMatrix.needsUpdate = true;
}
export function gib(p, v, scale = 1, color) {
  const g = FX.gibs[FX.gibHead]; FX.gibHead = (FX.gibHead + 1) % FX.gibs.length;
  g.m.visible = true; g.m.position.copy(p); g.m.scale.setScalar(scale); g.v.copy(v); g.w.set(rand(-9, 9), rand(-9, 9), rand(-9, 9)); g.life = 6; g.bounced = 0; return g;
}
export function tracer(from, to) {
  const t = FX.tr[FX.trHead]; FX.trHead = (FX.trHead + 1) % FX.tr.length; t.m.visible = true; t.m.position.copy(from); t.m.lookAt(to); t.m.scale.set(1, 1, from.distanceTo(to)); t.life = 0.06;
}
export function arc(a, b) {
  const A = FX.arcs[FX.arcHead]; FX.arcHead = (FX.arcHead + 1) % FX.arcs.length; const pos = A.l.geometry.attributes.position;
  for (let i = 0; i < 16; i++) { const t = i / 15; tmp.lerpVectors(a, b, t); if (i > 0 && i < 15) tmp.add(new THREE.Vector3(rand(-.18, .18), rand(-.18, .18), rand(-.18, .18))); pos.setXYZ(i, tmp.x, tmp.y, tmp.z); }
  pos.needsUpdate = true; A.l.visible = true; A.life = 0.15;
}
export function muzzle(p, intensity = 6, color = 0xffc070) { FX.flash.position.copy(p); FX.flash.color.set(color); FX.flash.intensity = intensity; FX.flashT = 0.05; }
export function updateFX(dt, world) {
  const P = FX.pp, Vv = FX.pv, L = FX.pl;
  for (let i = 0; i < PN; i++) {
    if (L[i] <= 0) continue; L[i] -= dt;
    Vv[i * 3 + 1] -= FX.pg[i] * dt; P[i * 3] += Vv[i * 3] * dt; P[i * 3 + 1] += Vv[i * 3 + 1] * dt; P[i * 3 + 2] += Vv[i * 3 + 2] * dt;
    if (P[i * 3 + 1] < 0.01) { P[i * 3 + 1] = 0.01; Vv[i * 3] *= 0.3; Vv[i * 3 + 2] *= 0.3; Vv[i * 3 + 1] = 0; L[i] = Math.min(L[i], 0.15); }
    if (L[i] <= 0) P[i * 3 + 1] = -100;
  }
  FX.points.geometry.attributes.position.needsUpdate = true; FX.points.geometry.attributes.color.needsUpdate = true; FX.points.geometry.attributes.size.needsUpdate = true;
  for (const g of FX.gibs) {
    if (g.life <= 0) continue; g.life -= dt; const m = g.m;
    g.v.y -= 9.8 * dt; m.position.addScaledVector(g.v, dt); m.rotation.x += g.w.x * dt; m.rotation.y += g.w.y * dt; m.rotation.z += g.w.z * dt;
    if (m.position.y < 0.05) { m.position.y = 0.05; if (g.v.y < -1) { if (g.bounced++ < 1) decal(new THREE.Vector3(m.position.x, 0, m.position.z), new THREE.Vector3(0, 1, 0), 0.5); } g.v.y = Math.abs(g.v.y) * 0.25; g.v.x *= 0.6; g.v.z *= 0.6; g.w.multiplyScalar(0.6); }
    if (g.life < 1) m.position.y -= dt * 0.1; if (g.life <= 0) m.visible = false;
  }
  for (const t of FX.tr) if (t.life > 0) { t.life -= dt; if (t.life <= 0) t.m.visible = false; }
  for (const a of FX.arcs) if (a.life > 0) { a.life -= dt; if (a.life <= 0) a.l.visible = false; }
  if (FX.flashT > 0) { FX.flashT -= dt; if (FX.flashT <= 0) FX.flash.intensity = 0; }
}
export function clearFX() { FX.decals.count = 0; FX.decalHead = 0; for (let i = 0; i < PN; i++) { FX.pl[i] = 0; FX.pp[i * 3 + 1] = -100; } for (const g of FX.gibs) { g.life = 0; g.m.visible = false; } }
