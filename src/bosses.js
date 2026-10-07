// Bosses: big zombies with props/specials, the Sourdough Mother (splitting blob), Professor Emeritus (tenure orbs),
// the Kweepie (teleporting doll) and the 30-foot Kweepie Mother.
import * as THREE from 'three';
import { G } from './state.js';
import { E } from './engine.js';
import { Z, Zombie, lob } from './zombies.js';
import { makeKweepie } from './kweepie.js';
import { blood, particle, sparks, gib, mist, decal } from './fx.js';
import { sfx } from './audio.js';
import { bike as bikeModel } from './props.js';
import { rand, angDiff, clamp } from './util.js';
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
function sphereHit(o, d, maxD, c, r) { const oc = tmp2.subVectors(o, c); const b = oc.dot(d), cc = oc.lengthSq() - r * r, h = b * b - cc; if (h < 0) return -1; const t = -b - Math.sqrt(h); return t > 0 && t < maxD ? t : -1; }
// ───────── generic hittable base
class Hittable {
  constructor() { this.alive = true; this.dead = false; this.pos = new THREE.Vector3(); this.scale = 1; this.beh = 'boss'; }
  aimPoint(out) { return out.copy(this.pos).setY(this.aimY || 1.5); }
  bodyPoint(out) { return out.copy(this.pos).setY(this.bodyY || 1.0); }
}
// ───────── Minion (tiny Kweepie doll / dough ball) — hops at you, pops on contact
export class Minion extends Hittable {
  constructor(kind = 'doll') { super(); this.kind = kind; this.mesh = kind === 'doll' ? makeKweepie(0.55, false) : new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 2), doughMat()); if (kind === 'dough') { this.mesh.castShadow = true; } this.alive = false; this.mesh.visible = false; E.scene.add(this.mesh); this.pos = this.mesh.position; this.minion = true; }
  spawn(p, hp = 30) { this.alive = true; this.dead = false; this.hp = this.maxHp = hp * (1 + G.levelIdx * 0.05); this.pos.copy(p); this.mesh.visible = true; this.vy = 0; this.hopT = rand(0, 0.5); this.speed = this.kind === 'doll' ? rand(3.2, 4.2) : rand(1.8, 2.4); this.aimY = this.kind === 'doll' ? 0.45 : 0.5; this.bodyY = 0.35; this.scale = this.kind === 'doll' ? 0.6 : 1; }
  update(dt) {
    if (!this.alive) return; const pl = G.player; const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    this.hopT -= dt; if (this.pos.y <= 0 && this.hopT <= 0) { this.vy = this.kind === 'doll' ? 3.2 : 2; this.hopT = 0.4; if (this.kind === 'doll' && Math.random() < 0.08) sfx('giggle', this.pos, 0.4); }
    this.vy -= 12 * dt; this.pos.y = Math.max(0, this.pos.y + this.vy * dt); if (d > 0.1) { this.pos.x += dx / d * this.speed * dt; this.pos.z += dz / d * this.speed * dt; } this.mesh.rotation.y = Math.atan2(dx, dz);
    if (this.kind === 'dough') { const s = 1 + Math.sin(E.time * 8 + this.pos.x) * 0.08; this.mesh.scale.set(s, 1 / s, s); }
    G.world.collide(this.pos, 0.3, 0.1, 1.0);
    if (d < 0.9) { pl.hurt(this.kind === 'doll' ? 8 : 10, this); this.pop(); }
  }
  hitTest(o, d, maxD) { if (!this.alive) return null; const c = tmp.copy(this.pos).setY(this.pos.y + (this.kind === 'doll' ? 0.35 : 0.45)); const t = sphereHit(o, d, maxD, c, this.kind === 'doll' ? 0.38 : 0.55); return t > 0 ? { dist: t, region: 'chest', target: this, point: o.clone().addScaledVector(d, t) } : null; }
  damage(a, region, point, dir) { if (!this.alive) return false; this.hp -= a; if (point) sparks(point, 3); if (this.hp <= 0) { this.pop(true); return true; } return false; }
  pop(killed) { this.alive = false; this.mesh.visible = false; const c = this.kind === 'doll' ? new THREE.Color(1, 0.95, 0.9) : new THREE.Color(0.95, 0.85, 0.6); for (let i = 0; i < 16; i++) particle(tmp.copy(this.pos).setY(this.pos.y + 0.4), tmp2.set(rand(-3, 3), rand(1, 4), rand(-3, 3)), i % 3 ? c : new THREE.Color(1, 0.5, 0.75), rand(0.03, 0.07), 0.8); sfx(this.kind === 'doll' ? 'hit' : 'splat', this.pos, 0.6); if (killed) G.onMinionKill && G.onMinionKill(this); }
}
let _dm; function doughMat() { return _dm || (_dm = new THREE.MeshStandardMaterial({ color: 0xe8d4a8, roughness: 0.8, flatShading: false })); }
// ───────── Zombie bosses (Chief of Surgery, Concrete Mixer, The Overdue, Road Captain, Professor Emeritus)
export class ZombieBoss {
  constructor(def, at) {
    this.def = def; this.z = new Zombie(def.outfit, 999 + G.levelIdx, false); this.z.reserved = true; Z.list.push(this.z); this.name = def.name;
    const z = this.z, b = z.bones;
    if (def.cap) { const cap = new THREE.Group(); const dome = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8, 0, 6.3, 0, 1.5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 })); const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 14, 1, false, -1.2, 2.4), dome.material); brim.position.set(0, 0, 0.08); brim.scale.set(1, 1, 1.3); cap.add(dome, brim); cap.position.set(0, 0.14, 0.0); b.Head.add(cap); }
    if (def.prop === 'saw') { const saw = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.45), new THREE.MeshStandardMaterial({ color: 0xcfd4d8, metalness: 1, roughness: 0.25 })); saw.position.set(-0.1, 0, 0.18); b.hand_r.add(saw); }
    if (def.books) { const cols = [0x8a2a2a, 0x2a4a8a, 0x2a6a3a, 0x8a6a2a, 0x5a2a6a]; for (let i = 0; i < 14; i++) { const bk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.13), new THREE.MeshStandardMaterial({ color: cols[i % 5], roughness: 0.8 })); const bone = [b.spine_03, b.spine_02, b.upperarm_l, b.upperarm_r, b.spine_01, b.thigh_l, b.thigh_r][i % 7]; bk.position.set(rand(-.12, .12), rand(-.1, .1), rand(.08, .16)); bk.rotation.set(rand(-1, 1), rand(-1, 1), rand(-1, 1)); bone.add(bk); } }
    if (def.bike) { this.bike = bikeModel(null, 0, 0, 0); E.scene.add(this.bike); this.bike.scale.setScalar(1.25); this.bikePhase = true; }
    if (G.levelIdx >= 0) z.spawn(new THREE.Vector3(at.x, 0, at.z), 'boss', { hp: def.hp, scale: def.scale, boss: def, name: def.name });
    this.alive = true; this.maxHp = z.maxHp; z.root.visible = true;
    if (def.kind === 'professor') { this.orbs = []; for (let i = 0; i < 3; i++) { const o = new Orb(this, i); this.orbs.push(o); Z.hittables.push(o); } this.z.invuln = true; }
    if (this.bike) { this.z.hold = true; this.z.ch.play('Sitting_Idle_Loop', 0); this.chargeT = 2; }
    // make zombie damage respect invulnerability
    const orig = z.damage.bind(z); z.damage = (a, r, p, d, s) => { if (z.invuln) { if (p) sparks(p, 5); return false; } return orig(a, r, p, d, s); };
  }
  get hp() { return this.z.hp; } get dead() { return this.z.dead; } get pos() { return this.z.pos; }
  update(dt) {
    const z = this.z; if (z.dead) { this.alive = false; if (this.bike) this.bike.visible = false; return; }
    if (this.orbs) { for (const o of this.orbs) o.update(dt); if (z.invuln && this.orbs.every(o => !o.alive)) { z.invuln = false; G.onTenureDenied && G.onTenureDenied(); } }
    if (this.bike && this.bikePhase) {
      // ride: charge at Shayla, overshoot, turn, repeat. Damage on contact.
      const pl = G.player; this.chargeT -= dt; const dx = pl.pos.x - z.pos.x, dz = pl.pos.z - z.pos.z, d = Math.hypot(dx, dz);
      if (this.chargeT <= 0 && !this.dash) { this.dash = { x: dx / d, z: dz / d, t: 2.2 }; sfx('engine', z.pos); }
      if (this.dash) { z.pos.x += this.dash.x * 11 * dt; z.pos.z += this.dash.z * 11 * dt; this.dash.t -= dt; z.yaw = Math.atan2(this.dash.x, this.dash.z); if (d < 1.6 && !this.dash.hit) { this.dash.hit = true; pl.hurt(24, z); } if (this.dash.t <= 0) { this.dash = null; this.chargeT = 1.4; } }
      else { z.yaw += angDiff(z.yaw, Math.atan2(dx, dz)) * dt * 3; }
      G.world.collide(z.pos, 0.6, 0.1, 1.6); z.root.rotation.y = z.yaw; z.pos.y = 0.55; z.ch.mixer.update(dt);
      this.bike.position.set(z.pos.x, 0, z.pos.z); this.bike.rotation.y = z.yaw;
      if (z.hp < z.maxHp * 0.5) { this.bikePhase = false; z.pos.y = 0; sfx('explode', z.pos); for (let i = 0; i < 30; i++) particle(tmp.copy(z.pos).setY(0.6), tmp2.set(rand(-4, 4), rand(1, 6), rand(-4, 4)), new THREE.Color(1, rand(.3, .8), 0.1), rand(0.05, 0.12), 0.9, 6); this.bike.rotation.z = 1.4; z.hold = false; z.charge = 0; z.playLoop(); G.onBossPhase && G.onBossPhase('The bike is toast. Now he\'s just pissed.'); }
      return;
    }
    // zombie AI does the rest (charge/spit flags via def)
  }
  hitTest() { return null; } // the Zombie in Z.list handles hits
}
class Orb extends Hittable {
  constructor(boss, i) { super(); this.boss = boss; this.i = i; this.hp = 160; this.maxHp = 160; this.mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0xffaa00, emissiveIntensity: 2, roughness: 0.3 })); E.scene.add(this.mesh); this.pos = this.mesh.position; this.minion = true; this.aimY = 0; }
  update(dt) { if (!this.alive) return; const z = this.boss.z; const a = E.time * 1.4 + this.i * 2.094; this.pos.set(z.pos.x + Math.cos(a) * 2.4, 2.2 + Math.sin(E.time * 2 + this.i) * 0.5, z.pos.z + Math.sin(a) * 2.4); this.mesh.rotation.y += dt * 3; }
  aimPoint(out) { return out.copy(this.pos); } bodyPoint(out) { return out.copy(this.pos); }
  hitTest(o, d, maxD) { if (!this.alive) return null; const t = sphereHit(o, d, maxD, this.pos, 0.42); return t > 0 ? { dist: t, region: 'head', target: this, point: o.clone().addScaledVector(d, t) } : null; }
  damage(a, r, p) { if (!this.alive) return false; this.hp -= a; sparks(this.pos, 6); if (this.hp <= 0) { this.alive = false; this.dead = true; this.mesh.visible = false; sfx('explode', this.pos, 0.5); for (let i = 0; i < 20; i++) particle(this.pos, tmp2.set(rand(-3, 3), rand(-1, 3), rand(-3, 3)), new THREE.Color(1, 0.8, 0.2), 0.06, 0.6, 2); return true; } return false; }
}
// ───────── Sourdough Mother
export class SourdoughBoss extends Hittable {
  constructor(def, at) {
    super(); this.def = def; this.name = def.name; this.maxHp = this.hp = def.hp * (1 + G.levelIdx * 0.1); this.r = 2.3;
    const g = new THREE.IcosahedronGeometry(1, 4); this.base = g.attributes.position.array.slice(); this.mesh = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xe8d0a0, roughness: 0.75 })); this.mesh.castShadow = true;
    // face
    const eyeM = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 }); for (const sx of [-1, 1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), eyeM); e.position.set(sx * 0.32, 0.25, 0.93); this.mesh.add(e); } const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 14, Math.PI), new THREE.MeshStandardMaterial({ color: 0x5a1a0a })); mouth.position.set(0, -0.15, 0.92); mouth.rotation.z = Math.PI; this.mesh.add(mouth);
    E.scene.add(this.mesh); this.pos = this.mesh.position; this.pos.set(at.x, 0, at.z); this.splits = 0; this.minis = []; this.aimY = 3; this.bodyY = 2.2; this.scale = 2;
  }
  update(dt) {
    if (!this.alive) return; const pl = G.player; const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    const sp = 1.3 + (1 - this.hp / this.maxHp) * 1.2; if (d > this.r) { this.pos.x += dx / d * sp * dt; this.pos.z += dz / d * sp * dt; } G.world.collide(this.pos, this.r * 0.8, 0.1, 2);
    const s = this.r; this.mesh.scale.set(s * (1 + Math.sin(E.time * 3) * 0.05), s * (1 - Math.sin(E.time * 3) * 0.05), s); this.pos.y = s * 0.85; this.mesh.rotation.y = Math.atan2(dx, dz);
    const p = this.mesh.geometry.attributes.position, b = this.base; for (let i = 0; i < p.count; i++) { const x = b[i * 3], y = b[i * 3 + 1], z = b[i * 3 + 2]; const n = 1 + Math.sin(x * 5 + E.time * 2) * Math.sin(y * 4 + E.time * 1.7) * 0.07; p.setXYZ(i, x * n, y * n, z * n); } p.needsUpdate = true; if (E.frame % 4 === 0) this.mesh.geometry.computeVertexNormals();
    if (d < this.r + 0.45 && d > 0.01) { const k = (this.r + 0.45 - d) / d; pl.pos.x += dx * k; pl.pos.z += dz * k; }
    if (d < this.r + 0.6) { this.touchT = (this.touchT || 0) - dt; if (this.touchT <= 0) { this.touchT = 0.8; pl.hurt(18, this); } }
    const th = [0.75, 0.5, 0.25]; if (this.splits < 3 && this.hp < this.maxHp * th[this.splits]) { this.splits++; this.r *= 0.88; sfx('splat', this.pos); G.onBossPhase && G.onBossPhase('It SPLIT. Of course it fucking split.'); for (let i = 0; i < 3; i++) G.spawnMinion('dough', tmp.set(this.pos.x + rand(-3, 3), 0, this.pos.z + rand(-3, 3)), 140); }
  }
  hitTest(o, d, maxD) { if (!this.alive) return null; const t = sphereHit(o, d, maxD, tmp.copy(this.pos), this.r * 0.95); return t > 0 ? { dist: t, region: 'chest', target: this, point: o.clone().addScaledVector(d, t) } : null; }
  damage(a, region, point, dir) { if (!this.alive) return false; this.hp -= a; if (point) for (let i = 0; i < 4; i++) particle(point, tmp2.set(rand(-2, 2), rand(0, 3), rand(-2, 2)), new THREE.Color(0.95, 0.85, 0.6), 0.06, 0.6); if (this.hp <= 0) { this.die(); return true; } return false; }
  die() { this.alive = false; this.dead = true; sfx('explode', this.pos); for (let i = 0; i < 60; i++) particle(tmp.copy(this.pos), tmp2.set(rand(-6, 6), rand(0, 7), rand(-6, 6)), new THREE.Color(0.95, 0.85, 0.6), rand(0.06, 0.14), 1.2); this.mesh.visible = false; G.onBossDead && G.onBossDead(this); }
}
// ───────── The Kweepie (phase 1, Wilson Park): teleports, giggles, throws mini dolls
export class KweepieBoss extends Hittable {
  constructor(def, at) { super(); this.def = def; this.name = def.name; this.maxHp = this.hp = def.hp * (1 + G.levelIdx * 0.05); this.h = def.height; this.mesh = makeKweepie(this.h, true); E.scene.add(this.mesh); this.pos = this.mesh.position; this.pos.set(at.x, 0, at.z); this.tpT = 4; this.throwT = 2.5; this.aimY = this.h * 0.72; this.bodyY = this.h * 0.35; this.scale = this.h / 1.2; }
  update(dt) {
    if (!this.alive) return; const pl = G.player; const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z; this.mesh.rotation.y = Math.atan2(dx, dz); this.mesh.position.y = Math.abs(Math.sin(E.time * 3)) * 0.15;
    const ud = this.mesh.userData; if (ud['arm1']) { ud['arm1'].rotation.x = -0.4 + Math.sin(E.time * 6) * 0.5; ud['arm-1'].rotation.x = -0.4 - Math.sin(E.time * 6) * 0.5; }
    this.tpT -= dt; this.throwT -= dt;
    if (this.tpT <= 0) { this.tpT = rand(4, 6) * (0.6 + this.hp / this.maxHp * 0.4); this.puff(); for (let k = 0; k < 20; k++) { const a = rand(0, 6.28), r = rand(7, 12); const x = pl.pos.x + Math.cos(a) * r, z = pl.pos.z + Math.sin(a) * r; if (G.world.isOpen(x, z) && Math.abs(x) < 31 && Math.abs(z) < 31) { this.pos.x = x; this.pos.z = z; break; } } this.puff(); sfx('giggle', this.pos, 1); G.onKweepieTeleport && G.onKweepieTeleport(); }
    if (this.throwT <= 0) { this.throwT = rand(2.2, 3.5) * (0.5 + this.hp / this.maxHp * 0.5); const n = this.hp < this.maxHp * 0.5 ? 3 : 2; for (let i = 0; i < n; i++) G.spawnMinion('doll', tmp.set(this.pos.x + rand(-1, 1), 0, this.pos.z + rand(-1, 1)), 30); }
  }
  aimPoint(out) { return out.copy(this.pos).setY(this.pos.y + this.h * 0.72); } bodyPoint(out) { return out.copy(this.pos).setY(this.pos.y + this.h * 0.35); }
  puff() { for (let i = 0; i < 26; i++) particle(tmp.copy(this.pos).setY(rand(0.3, this.h)), tmp2.set(rand(-3, 3), rand(0, 3), rand(-3, 3)), new THREE.Color(1, 0.55, 0.8), rand(0.06, 0.12), 0.8, 1); }
  hitTest(o, d, maxD) {
    if (!this.alive) return null; const hc = tmp.copy(this.pos).setY(this.pos.y + this.h * 0.72); let t = sphereHit(o, d, maxD, hc, this.h * 0.2); if (t > 0) return { dist: t, region: 'head', target: this, point: o.clone().addScaledVector(d, t) };
    t = sphereHit(o, d, maxD, tmp.copy(this.pos).setY(this.pos.y + this.h * 0.3), this.h * 0.27); return t > 0 ? { dist: t, region: 'chest', target: this, point: o.clone().addScaledVector(d, t) } : null;
  }
  damage(a, region, point) { if (!this.alive) return false; this.hp -= a * (region === 'head' ? 1.6 : 1); if (point) { sparks(point, 4); for (let i = 0; i < 3; i++) particle(point, tmp2.set(rand(-2, 2), rand(0, 2), rand(-2, 2)), new THREE.Color(1, 0.95, 0.9), 0.05, 0.6); } if (this.hp <= 0) { this.alive = false; this.dead = true; this.puff(); this.mesh.visible = false; sfx('explode', this.pos); G.onBossDead && G.onBossDead(this); return true; } return false; }
}
// ───────── The Kweepie Mother (finale): 30-foot doll beyond the overlook. Phases: swarm → bottle barrage → frenzy.
export class MotherBoss extends KweepieBoss {
  constructor(def, at) { super(def, at); this.phase = 1; this.tpT = 1e9; this.throwT = 3; this.lobT = 4; this.mesh.position.y = -0.5; this.mesh.traverse(o => { if (o.isPointLight) { o.intensity = 3; o.distance = 14; } }); }
  update(dt) {
    if (!this.alive) return; const pl = G.player; const dx = pl.pos.x - this.pos.x, dz = pl.pos.z - this.pos.z; this.mesh.rotation.y = Math.atan2(dx, dz) * 0.5; this.mesh.position.y = -0.5 + Math.sin(E.time * 0.8) * 0.4; this.mesh.rotation.z = Math.sin(E.time * 0.6) * 0.05;
    const ud = this.mesh.userData; if (ud['arm1']) { ud['arm1'].rotation.x = -0.4 + Math.sin(E.time * 1.5) * 0.6; ud['arm-1'].rotation.x = -0.4 - Math.sin(E.time * 1.5) * 0.6; }
    const f = this.hp / this.maxHp; const ph = f > 0.66 ? 1 : f > 0.33 ? 2 : 3; if (ph !== this.phase) { this.phase = ph; sfx('roar', null, 1); sfx('giggle', null, 1); G.onBossPhase && G.onBossPhase(ph === 2 ? 'Phase two! She\'s throwing shit now!' : 'FINAL PHASE! The sun\'s coming up, keep shooting!'); }
    this.throwT -= dt; if (this.throwT <= 0) { this.throwT = ph === 3 ? 3 : 5; const n = ph === 3 ? 5 : 4; for (let i = 0; i < n; i++) G.spawnMinion('doll', tmp.set(rand(-12, 12), 0, -27 + rand(0, 3)), 30); sfx('giggle', null, 0.8); }
    if (ph >= 2) { this.lobT -= dt; if (this.lobT <= 0) { this.lobT = ph === 3 ? 1.6 : 2.6; lob(tmp.copy(this.pos).setY(this.h * 0.6), pl.pos, 'acid', 16 + this.phase * 2); } }
    G.setSunrise && G.setSunrise(1 - f);
  }
}
export function makeBoss(def, at) {
  if (def.kind === 'sourdough') return new SourdoughBoss(def, at);
  if (def.kind === 'kweepie') return new KweepieBoss(def, at);
  if (def.kind === 'mother') return new MotherBoss(def, at);
  return new ZombieBoss(def, at);
}
