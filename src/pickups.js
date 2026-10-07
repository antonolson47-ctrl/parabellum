// Pickups: burger bags, soda cases, med kits, ammo boxes, finger bowls.
import * as THREE from 'three';
import { G } from './state.js';
import { canvasTex } from './util.js';
import { sfx } from './audio.js';
import { particle } from './fx.js';
export const P = { list: [] };
let MAT;
function mats() {
  if (MAT) return MAT;
  const bagT = canvasTex(128, 128, (x) => { x.fillStyle = '#c9a26b'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(90,60,30,.15)'; x.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); } x.fillStyle = '#16a59e'; x.fillRect(0, 40, 128, 44); x.fillStyle = '#ffd43b'; x.font = "bold 22px 'Black Ops One'"; x.textAlign = 'center'; x.fillText("FREDDO'S", 64, 70); x.fillStyle = '#fff'; x.font = '600 12px Barlow Condensed'; x.fillText('STEAKBURGERS', 64, 100); });
  const sodaT = canvasTex(128, 64, (x) => { x.fillStyle = '#c8102e'; x.fillRect(0, 0, 128, 64); x.fillStyle = '#fff'; x.font = "italic bold 24px 'Black Ops One'"; x.textAlign = 'center'; x.fillText('Fizz-Ola', 64, 36); x.font = '600 11px Barlow Condensed'; x.fillText('ICE COLD COLA · 12 PACK', 64, 54); x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(8, 44); x.bezierCurveTo(40, 36, 80, 52, 120, 42); x.stroke(); });
  const medT = canvasTex(64, 64, (x) => { x.fillStyle = '#f4f4f4'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#d32'; x.fillRect(24, 10, 16, 44); x.fillRect(10, 24, 44, 16); });
  const ammoT = canvasTex(64, 64, (x) => { x.fillStyle = '#4a5530'; x.fillRect(0, 0, 64, 64); x.fillStyle = '#ffd84a'; x.font = "bold 13px 'Black Ops One'"; x.textAlign = 'center'; x.fillText('AMMO', 32, 38); });
  MAT = { bag: new THREE.MeshStandardMaterial({ map: bagT, roughness: 0.9 }), soda: new THREE.MeshStandardMaterial({ map: sodaT, roughness: 0.5 }), med: new THREE.MeshStandardMaterial({ map: medT, roughness: 0.5 }), ammo: new THREE.MeshStandardMaterial({ map: ammoT, roughness: 0.7 }),
    bowl: new THREE.MeshStandardMaterial({ color: 0xd9d4c8, roughness: 0.4 }), finger: new THREE.MeshStandardMaterial({ color: 0xa8b98d, roughness: 0.6 }), ring: new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.55, depthWrite: false }) };
  return MAT;
}
function model(type) {
  const m = mats(), g = new THREE.Group();
  if (type === 'burger') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.38, 0.2), m.bag); b.position.y = 0.19; g.add(b); const top = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.2), new THREE.MeshStandardMaterial({ color: 0xb08a58 })); top.position.y = 0.4; top.rotation.x = 0.3; g.add(top); }
  else if (type === 'coke') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.2, 0.28), [m.soda, m.soda, new THREE.MeshStandardMaterial({ color: 0xc8102e }), m.soda, m.soda, m.soda]); b.position.y = 0.1; g.add(b); for (let i = 0; i < 2; i++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); c.position.set(-0.08 + i * 0.16, 0.29, 0); g.add(c); const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.015, 12), new THREE.MeshStandardMaterial({ color: 0xc8102e })); lid.position.set(-0.08 + i * 0.16, 0.385, 0); g.add(lid); } }
  else if (type === 'med') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.14), m.med); b.position.y = 0.11; g.add(b); }
  else if (type === 'ammo') { const b = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.2, 0.2), m.ammo); b.position.y = 0.1; g.add(b); }
  else if (type === 'fingers') { const b = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 8, 0, 6.3, Math.PI / 2, Math.PI / 2), m.bowl); b.material.side = THREE.DoubleSide; b.position.y = 0.2; g.add(b); for (let i = 0; i < 7; i++) { const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.02, 0.08, 3, 6), m.finger); f.position.set(Math.cos(i) * 0.08, 0.2, Math.sin(i) * 0.08); f.rotation.set(Math.random() * 3, 0, Math.random() * 3); g.add(f); } }
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 24), m.ring); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring); g.userData.ring = ring;
  g.traverse(o => { if (o.isMesh && o !== ring) o.castShadow = true; });
  return g;
}
export function spawnPickup(type, x, z, value) {
  const g = model(type); g.position.set(x, 0, z); G.world.scene.add(g); const p = { type, value, g, pos: g.position, t: Math.random() * 6, alive: true }; P.list.push(p); return p;
}
export function clearPickups() { for (const p of P.list) G.world.scene.remove(p.g); P.list.length = 0; }
export function updatePickups(dt) {
  const pl = G.player;
  for (const p of P.list) {
    if (!p.alive) continue; p.t += dt; const kid = p.g.children; for (const c of kid) if (c !== p.g.userData.ring) { c.rotation.y += dt * 1.6; }
    p.g.userData.ring.scale.setScalar(1 + Math.sin(p.t * 4) * 0.1);
    let r = 1.25; const k = G.kennedy; let collector = null;
    if (Math.hypot(pl.pos.x - p.pos.x, pl.pos.z - p.pos.z) < r) collector = 'player'; else if (k && k.active && !k.down && (p.type === 'burger' || p.type === 'coke') && Math.hypot(k.pos.x - p.pos.x, k.pos.z - p.pos.z) < r) collector = 'kennedy';
    if (collector && !(p.type === 'med' && pl.hp >= pl.maxHp) && !(p.type === 'ammo' && !G.needsAmmo())) {
      p.alive = false; G.world.scene.remove(p.g); G.onPickup(p, collector);
      for (let i = 0; i < 12; i++) particle(new THREE.Vector3(p.pos.x, 0.4, p.pos.z), new THREE.Vector3((Math.random() - .5) * 2, Math.random() * 3, (Math.random() - .5) * 2), new THREE.Color(1, 0.9, 0.4), 0.04, 0.6, 3);
    }
  }
}
