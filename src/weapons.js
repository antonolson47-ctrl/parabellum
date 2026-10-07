// Weapon definitions + procedural first-person viewmodels (Shayla's tan forearms + green scrub sleeves).
import * as THREE from 'three';
import { canvasTex } from './util.js';
import { T } from './world.js';
export const WEAPONS = {
  pistol: { name: 'TRUSTY 9MM', dmg: 34, rate: 0.19, mag: 17, reserve: Infinity, reload: 1.25, spread: 0.006, pellets: 1, auto: false, sfx: 'pistol', kick: 0.035, range: 70 },
  rifle: { name: '"THE GIFT"', dmg: 30, rate: 0.095, mag: 30, reserve: 210, reload: 1.7, spread: 0.011, pellets: 1, auto: true, sfx: 'rifle', kick: 0.018, range: 90 },
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
// first-person viewmodels, hands and Kennedy's world rifle now live in guns.js (detailed procedural models)
