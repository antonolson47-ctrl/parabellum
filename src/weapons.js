// Weapon definitions + procedural first-person viewmodels (Shayla's tan forearms + green scrub sleeves).
import * as THREE from 'three';
import { canvasTex } from './util.js';
import { T } from './world.js';
export const WEAPONS = {
  pistol: { name: 'TRUSTY 9MM', dmg: 34, rate: 0.19, mag: 17, reserve: Infinity, reload: 1.25, spread: 0.006, pellets: 1, auto: false, sfx: 'pistol', kick: 0.035, range: 70 },
  rifle: { name: '"THE BIRTHDAY ONE"', dmg: 30, rate: 0.095, mag: 30, reserve: 210, reload: 1.7, spread: 0.011, pellets: 1, auto: true, sfx: 'rifle', kick: 0.018, range: 90 },
  shotgun: { name: 'YARD-SALE PUMP', dmg: 17, rate: 0.75, mag: 6, reserve: 42, reload: 0.42, shellReload: true, spread: 0.075, pellets: 10, auto: false, sfx: 'shotgun', kick: 0.09, range: 30 },
  defib: { name: 'DEFIB CANNON', dmg: 95, rate: 0.85, mag: 6, reserve: 24, reload: 2.0, spread: 0.002, pellets: 1, auto: false, sfx: 'defib', kick: 0.06, range: 40, chain: 3 },
};
export const ORDER = ['pistol', 'rifle', 'shotgun', 'defib'];
const mat = {};
function m(k, o) { return mat[k] || (mat[k] = new THREE.MeshStandardMaterial(o)); }
const gun = () => m('gun', { color: 0x2c2e33, roughness: 0.35, metalness: 0.65 });
const gun2 = () => m('gun2', { color: 0x3a3d42, roughness: 0.55, metalness: 0.3 });
const tan = () => m('tanGun', { color: 0xb59a72, roughness: 0.7, metalness: 0.1 });
const skin = () => m('skin', { color: 0xb07a55, roughness: 0.62 });
const scrub = () => m('scrub', { color: 0x2e7d5b, roughness: 0.9 });
const B = (w, h, d, mt, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mt); me.position.set(x, y, z); me.rotation.set(rx, ry, rz); return me; };
const C = (r1, r2, h, mt, x = 0, y = 0, z = 0, rx = Math.PI / 2, seg = 12) => { const me = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), mt); me.position.set(x, y, z); me.rotation.x = rx; return me; };
function hand(left = false) {
  const g = new THREE.Group(); const s = left ? -1 : 1;
  const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.24, 4, 10), skin()); fore.rotation.x = Math.PI / 2; fore.position.set(0, -0.02, 0.17); g.add(fore);
  const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.16, 12, 1, true), scrub()); sleeve.material.side = THREE.DoubleSide; sleeve.rotation.x = Math.PI / 2; sleeve.position.set(0, -0.02, 0.36); g.add(sleeve);
  const palm = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.035, 0.085), skin()); palm.position.set(0, -0.005, 0.02); g.add(palm);
  for (let i = 0; i < 4; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.0095, 0.045, 3, 6), skin()); f.rotation.set(Math.PI / 2 + 0.9, 0, 0); f.position.set(-0.027 + i * 0.018, -0.03, -0.025); g.add(f); }
  const th = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.045, 3, 6), skin()); th.rotation.set(Math.PI / 2, 0, s * 0.8); th.position.set(s * -0.042, 0.005, -0.01); g.add(th);
  const watch = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.008, 6, 14), m('watch', { color: 0x111111, roughness: 0.4 })); watch.position.set(0, -0.02, 0.09); if (left) g.add(watch);
  return g;
}
function flashTex() { return mat.flashT || (mat.flashT = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 30); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(.3, 'rgba(255,200,90,.9)'); g.addColorStop(1, 'rgba(255,120,20,0)'); x.fillStyle = g; x.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283, r = i % 2 ? 12 : 31; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.fill(); })); }
function muzzleFlash() { const sp = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), new THREE.MeshBasicMaterial({ map: flashTex(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); sp.visible = false; const sp2 = sp.clone(); sp2.rotation.y = Math.PI / 2; sp2.scale.set(0.6, 1.6, 1); const g = new THREE.Group(); g.add(sp, sp2); g.userData.parts = [sp, sp2]; return g; }
export function buildViewmodels() {
  const VM = {};
  // pistol
  { const g = new THREE.Group(); const slide = B(0.032, 0.034, 0.19, gun(), 0, 0.03, -0.06); g.add(slide); g.add(B(0.03, 0.026, 0.16, gun2(), 0, 0.005, -0.05)); g.add(B(0.03, 0.1, 0.045, gun2(), 0, -0.045, 0.01, -0.25));
    g.add(B(0.006, 0.008, 0.008, gun(), 0, 0.05, -0.145)); g.add(B(0.016, 0.008, 0.008, gun(), 0, 0.05, 0.025)); g.add(C(0.006, 0.006, 0.02, m('bore', { color: 0x050505 }), 0, 0.03, -0.155));
    const tg = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.003, 4, 10, Math.PI), gun2()); tg.rotation.set(0, Math.PI / 2, Math.PI); tg.position.set(0, -0.008, -0.02); g.add(tg);
    const h = hand(); h.position.set(0, -0.05, 0.03); h.rotation.x = -0.25; g.add(h); const h2 = hand(true); h2.position.set(-0.035, -0.06, 0.04); h2.rotation.set(-0.2, 0.45, 0.35); g.add(h2);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.03, -0.17); g.add(mz); const fl = muzzleFlash(); mz.add(fl); g.userData = { muzzle: mz, flash: fl, slide, base: new THREE.Vector3(0.16, -0.185, -0.43) }; VM.pistol = g; }
  // rifle (tan)
  { const g = new THREE.Group(); g.add(B(0.045, 0.06, 0.3, tan(), 0, 0.01, -0.05)); g.add(B(0.05, 0.055, 0.25, tan(), 0, 0.012, -0.3)); g.add(C(0.009, 0.009, 0.2, gun(), 0, 0.015, -0.5)); g.add(C(0.016, 0.016, 0.05, gun(), 0, 0.015, -0.6));
    g.add(B(0.032, 0.13, 0.05, gun(), 0, -0.07, -0.08, 0.25)); g.add(B(0.03, 0.09, 0.04, tan(), 0, -0.05, 0.06, -0.3)); g.add(B(0.04, 0.06, 0.2, tan(), 0, -0.005, 0.24)); g.add(B(0.012, 0.012, 0.32, gun(), 0, 0.048, -0.18));
    const sight = C(0.017, 0.017, 0.07, gun(), 0, 0.075, -0.06); g.add(sight); const dot = new THREE.Mesh(new THREE.CircleGeometry(0.004, 8), m('dot', { color: 0xff0000, emissive: 0xff2020, emissiveIntensity: 3 })); dot.position.set(0, 0.075, -0.024); dot.rotation.y = Math.PI; g.add(dot);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.015, 16), m('lensv', { color: 0x223344, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.35 })); lens.position.set(0, 0.075, -0.026); g.add(lens);
    const h = hand(); h.position.set(0, -0.06, 0.06); h.rotation.x = -0.3; g.add(h); const h2 = hand(true); h2.position.set(-0.02, -0.03, -0.3); h2.rotation.set(-0.1, 0.3, 0.6); g.add(h2);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.015, -0.63); g.add(mz); const fl = muzzleFlash(); fl.scale.setScalar(1.4); mz.add(fl); g.userData = { muzzle: mz, flash: fl, base: new THREE.Vector3(0.13, -0.15, -0.3) }; VM.rifle = g; }
  // shotgun
  { const wood = m('woodg', { map: T.wood('#7a4a2a'), roughness: 0.6 }); const g = new THREE.Group(); g.add(B(0.045, 0.06, 0.2, gun(), 0, 0.01, -0.02)); g.add(C(0.013, 0.013, 0.52, gun(), 0, 0.03, -0.36)); g.add(C(0.012, 0.012, 0.44, gun2(), 0, 0.0, -0.32));
    const pump = C(0.024, 0.024, 0.14, wood, 0, 0.0, -0.3); g.add(pump); g.add(B(0.04, 0.07, 0.26, wood, 0, -0.03, 0.2, 0.18)); g.add(B(0.03, 0.08, 0.04, wood, 0, -0.04, 0.06, -0.3));
    const h = hand(); h.position.set(0, -0.06, 0.07); h.rotation.x = -0.3; g.add(h); const h2 = hand(true); h2.position.set(-0.01, -0.035, -0.3); h2.rotation.set(-0.1, 0.25, 0.6); g.add(h2);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.03, -0.63); g.add(mz); const fl = muzzleFlash(); fl.scale.setScalar(2); mz.add(fl); g.userData = { muzzle: mz, flash: fl, pump, h2, base: new THREE.Vector3(0.13, -0.15, -0.3) }; VM.shotgun = g; }
  // defib cannon
  { const g = new THREE.Group(); const yel = m('defy', { color: 0xf2c230, roughness: 0.5 }); const gry = m('defg', { color: 0x3a3f45, roughness: 0.5, metalness: 0.3 });
    g.add(B(0.11, 0.1, 0.26, yel, 0, 0.0, -0.08)); g.add(B(0.09, 0.08, 0.06, gry, 0, 0.005, -0.23));
    const scr = canvasTex(128, 64, (x) => { x.fillStyle = '#031'; x.fillRect(0, 0, 128, 64); x.strokeStyle = '#3f8'; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 32); for (let i = 0; i < 128; i += 4) x.lineTo(i, 32 + (i % 32 === 16 ? -22 : i % 32 === 20 ? 18 : 0)); x.stroke(); x.fillStyle = '#ff5'; x.font = 'bold 16px sans-serif'; x.fillText('360J', 80, 18); });
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.04), new THREE.MeshStandardMaterial({ map: scr, emissiveMap: scr, emissive: 0xffffff, emissiveIntensity: 1.2 })); sc.position.set(0, 0.051, -0.06); sc.rotation.x = -Math.PI / 2; g.add(sc);
    for (const sx of [-1, 1]) { const p = C(0.026, 0.026, 0.02, gry, sx * 0.032, 0.005, -0.27); g.add(p); const coil = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.004, 5, 12), m('coil', { color: 0xb87333, metalness: 1, roughness: 0.3 })); coil.position.set(sx * 0.032, 0.005, -0.285); g.add(coil); }
    g.add(B(0.035, 0.1, 0.045, gry, 0, -0.08, 0.02, -0.25));
    const h = hand(); h.position.set(0, -0.08, 0.06); h.rotation.x = -0.25; g.add(h); const h2 = hand(true); h2.position.set(-0.07, -0.02, -0.12); h2.rotation.set(0, 0.6, 1.2); g.add(h2);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.005, -0.3); g.add(mz); const fl = muzzleFlash(); fl.scale.setScalar(1.6); fl.userData.parts.forEach(p => p.material = new THREE.MeshBasicMaterial({ map: flashTex(), color: 0x88ddff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); mz.add(fl);
    g.userData = { muzzle: mz, flash: fl, base: new THREE.Vector3(0.14, -0.15, -0.32) }; VM.defib = g; }
  // bedpan (melee, shown during swing)
  { const g = new THREE.Group(); const steel = m('steel', { color: 0xd5d9de, roughness: 0.22, metalness: 0.95 }); const pan = new THREE.Mesh(new THREE.SphereGeometry(0.13, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.6), steel); pan.scale.set(1, 0.35, 1.25); pan.material.side = THREE.DoubleSide; g.add(pan);
    g.add(B(0.05, 0.02, 0.16, steel, 0, 0.0, 0.2)); const h = hand(true); h.position.set(0, -0.02, 0.27); g.add(h); g.userData = { base: new THREE.Vector3(-0.12, -0.12, -0.4) }; VM.bedpan = g; }
  for (const k in VM) VM[k].traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.renderOrder = 10; } });
  return VM;
}
// world-model rifle for Kennedy's hands
export function rifleWorldModel() {
  const g = new THREE.Group(); g.add(B(0.045, 0.06, 0.3, tan(), 0, 0, 0.05)); g.add(B(0.05, 0.055, 0.25, tan(), 0, 0, 0.3)); g.add(C(0.009, 0.009, 0.22, gun(), 0, 0.005, 0.5)); g.add(B(0.032, 0.13, 0.05, gun(), 0, -0.08, 0.08, -0.25)); g.add(B(0.03, 0.09, 0.04, tan(), 0, -0.05, -0.06, 0.3)); g.add(B(0.04, 0.06, 0.22, tan(), 0, -0.01, -0.24)); g.add(C(0.017, 0.017, 0.07, gun(), 0, 0.06, 0.06));
  g.traverse(o => { if (o.isMesh) o.castShadow = true; }); const mz = new THREE.Object3D(); mz.position.set(0, 0.005, 0.62); g.add(mz); g.userData.muzzle = mz; return g;
}
export function pistolWorldModel() { const g = new THREE.Group(); g.add(B(0.03, 0.035, 0.18, gun(), 0, 0.03, 0.06)); g.add(B(0.028, 0.1, 0.045, gun2(), 0, -0.02, 0, 0.25)); const mz = new THREE.Object3D(); mz.position.set(0, 0.03, 0.16); g.add(mz); g.userData.muzzle = mz; return g; }
