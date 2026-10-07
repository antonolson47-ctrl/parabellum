// Zombie manager: pooled skinned zombies, shamble AI on a flow field, attacks, hit spheres, dismemberment and head pops.
import * as THREE from 'three';
import { makeZombie } from './chars.js';
import { G } from './state.js';
import { E } from './engine.js';
import { blood, mist, fountain, decal, gib, particle } from './fx.js';
import { sfx } from './audio.js';
import { rand, pick, angDiff, clamp } from './util.js';

export const Z = { list: [], hittables: [], projectiles: [], flowT: 0, groanT: 2 };
const tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), tmpQ2 = new THREE.Quaternion();
const X = new THREE.Vector3(1, 0, 0), Yax = new THREE.Vector3(0, 1, 0), Zax = new THREE.Vector3(0, 0, 1);
const stumpGeo = new THREE.SphereGeometry(1, 8, 6); const stumpMat = new THREE.MeshStandardMaterial({ color: 0x6a0806, roughness: 0.3, emissive: 0x200000 });
const BEH = {
  walker: { hp: 100, speed: [0.75, 1.05], anim: 'Walk_Loop', dmg: 11, scale: 1 },
  runner: { hp: 65, speed: [3.0, 3.8], anim: 'Jog_Fwd_Loop', dmg: 9, scale: 1 },
  brute: { hp: 420, speed: [0.85, 1.0], anim: 'Walk_Loop', dmg: 22, scale: 1.32 },
  spitter: { hp: 90, speed: [0.8, 1.0], anim: 'Walk_Loop', dmg: 10, scale: 1 },
  shusher: { hp: 120, speed: [0.85, 1.1], anim: 'Walk_Loop', dmg: 10, scale: 1 },
  snatcher: { hp: 70, speed: [2.2, 2.6], anim: 'Jog_Fwd_Loop', dmg: 6, scale: 0.95 },
  boss: { hp: 3000, speed: [1.2, 1.2], anim: 'Walk_Loop', dmg: 26, scale: 2.0 },
};
// rotate a bone around an axis given in character-root space (uses last frame's parent matrices: cheap & fine)
function rotBone(bone, rootQinv, axis, ang) {
  bone.parent.getWorldQuaternion(tmpQ); tmpQ.premultiply(rootQinv).invert(); tmpV.copy(axis).applyQuaternion(tmpQ); tmpQ2.setFromAxisAngle(tmpV, ang); bone.quaternion.premultiply(tmpQ2);
}
export class Zombie {
  constructor(outfit, seed, female) {
    this.ch = makeZombie(outfit, seed, female); this.root = this.ch.root; this.outfit = outfit; this.female = female; this.seed = seed;
    this.baseScale = this.root.scale.x; this.U = this.ch.body.material.userData.U; this.alive = false; this.root.visible = false;
    this.pos = this.root.position; this.vel = new THREE.Vector3(); this.yaw = 0; this.bones = this.ch.bone; this.stumps = [];
    this.spheres = []; this.sphT = -1; this.tilt = rand(-0.35, 0.35); this.armA = rand(0.9, 1.35);
    this.rootQinv = new THREE.Quaternion();
    G.world.scene.add(this.root);
  }
  spawn(p, beh, opts = {}) {
    const b = BEH[beh] || BEH.walker; this.beh = beh; this.def = b; const lv = G.levelIdx;
    this.maxHp = this.hp = (opts.hp || b.hp) * (1 + lv * 0.13); this.speed = rand(b.speed[0], b.speed[1]) * (opts.speedMul || 1); this.dmg = (opts.dmg || b.dmg) * (1 + lv * 0.07);
    this.root.scale.setScalar(this.baseScale * (opts.scale || b.scale)); this.scale = this.root.scale.x;
    this.pos.copy(p); this.pos.y = opts.rise ? -1.7 * this.scale : 0; this.rise = opts.rise ? 1 : 0; this.alive = true; this.dead = false; this.deadT = 0; this.root.visible = true;
    this.atkT = rand(0.5, 1.5); this.atkPhase = 0; this.stagger = 0; this.special = rand(2, 5); this.charge = 0; this.losT = 0; this.los = false; this.limp = 1; this.burn = 0;
    this.limbHp = { armL: 45, armR: 45, legL: 70, legR: 70 }; this.severed = {}; this.headless = false; this.carry = 0; this.flee = false; this.bleed = [];
    for (const k in this.bones) { this.bones[k].scale.set(1, 1, 1); }
    for (const s of this.stumps) s.removeFromParent(); this.stumps.length = 0;
    this.U.uBlood.value = rand(0, 0.15); this.U.uFlash.value = 0; this.boss = opts.boss || null; this.name = opts.name;
    this.yaw = Math.atan2(G.player.pos.x - p.x, G.player.pos.z - p.z); this.root.rotation.set(0, this.yaw, 0);
    this.ch.mixer.stopAllAction(); this.ch.cur = null; this.playLoop();
    const a = this.ch.cur; if (a) a.time = rand(0, 1.3);
    this.groan = rand(1, 6);
  }
  playLoop() { const running = this.beh === 'runner' || this.beh === 'snatcher' || this.charge > 0 || this.flee; this.ch.play(running ? (this.charge > 0 ? 'Sprint_Loop' : 'Jog_Fwd_Loop') : 'Walk_Loop', 0.25, { speed: running ? this.speed / 3.4 : this.speed / 1.35 * this.limp }); }
  target() { const k = G.kennedy; const p = G.player; if (k && k.active && !k.down) { const dp = this.pos.distanceToSquared(p.pos), dk = this.pos.distanceToSquared(k.pos); if (dk + 6 < dp) return k; } return p; }
  update(dt, idx) {
    if (!this.alive) return;
    const ch = this.ch; this.U.uFlash.value = Math.max(0, this.U.uFlash.value - dt * 4);
    if (this.dead) { this.deadT += dt; ch.mixer.update(dt); this.updateBleed(dt); if (this.deadT > 4.5) { this.pos.y -= dt * 0.5; if (this.deadT > 7) { this.alive = false; this.root.visible = false; } } return; }
    if (this.burn > 0) { this.burn -= dt; if (Math.random() < dt * 14) particle(tmpV.set(this.pos.x + rand(-.25, .25), rand(0.4, 1.6) * this.scale, this.pos.z + rand(-.25, .25)), tmpV2.set(0, rand(1, 2.5), 0), new THREE.Color(1, rand(.3, .7), 0.1), rand(0.04, 0.08), 0.5, -2); this.damage(28 * dt, 'chest', null, null, 'burn'); if (!this.alive || this.dead) return; }
    if (this.rise > 0) { this.rise -= dt * 0.9; this.pos.y = -1.7 * this.scale * Math.max(0, this.rise); if (Math.random() < 0.3) particle(tmpV.set(this.pos.x + rand(-.4, .4), 0.05, this.pos.z + rand(-.4, .4)), tmpV2.set(rand(-1, 1), rand(1, 3), rand(-1, 1)), new THREE.Color(0.25, 0.2, 0.15), 0.05, 0.6); ch.mixer.update(dt); return; }
    if (this.hold) return;
    const tgt = this.target(); const tp = tgt.pos; const dx = tp.x - this.pos.x, dz = tp.z - this.pos.z; const dist = Math.hypot(dx, dz);
    this.losT -= dt; if (this.losT <= 0) { this.losT = 0.35 + Math.random() * 0.2; tmpV.set(this.pos.x, 1.4, this.pos.z); tmpV2.set(tp.x, 1.4, tp.z); this.los = dist < 14 && G.world.los(tmpV, tmpV2); }
    let mx = 0, mz = 0;
    if (this.flee) { // snatcher running off with your burgers
      mx = -dx / (dist || 1); mz = -dz / (dist || 1); const fd = { x: 0, z: 0 }; if (!G.world.isOpen(this.pos.x + mx * 1.5, this.pos.z + mz * 1.5) && G.world.flowDir(this.pos.x, this.pos.z, fd)) { mx = -fd.x; mz = -fd.z; }
      if (dist > 40) { this.alive = false; this.root.visible = false; return; }
    } else if (this.los || dist < 2) { mx = dx / (dist || 1); mz = dz / (dist || 1); }
    else { const fd = { x: 0, z: 0 }; if (G.world.flowDir(this.pos.x, this.pos.z, fd)) { mx = fd.x; mz = fd.z; } else { mx = dx / (dist || 1); mz = dz / (dist || 1); } }
    // separation
    for (let j = 0; j < Z.list.length; j++) { const o = Z.list[j]; if (o === this || !o.alive || o.dead) continue; const ox = this.pos.x - o.pos.x, oz = this.pos.z - o.pos.z, d2 = ox * ox + oz * oz; const rr = 0.55 * (this.scale + o.scale); if (d2 < rr * rr && d2 > 1e-5) { const d = Math.sqrt(d2), k = (rr - d) / d * 0.5; this.pos.x += ox * k; this.pos.z += oz * k; } }
    let sp = this.speed * this.limp; if (this.charge > 0) { this.charge -= dt; sp *= 2.6; if (this.charge <= 0) this.playLoop(); }
    if (this.stagger > 0) { this.stagger -= dt; sp *= 0.15; }
    const attackRange = 1.15 * this.scale + (tgt === G.player ? 0.35 : 0.5);
    if (this.atkPhase > 0) { // mid-attack
      this.atkPhase -= dt; sp = 0; if (!this.atkHit && this.atkPhase < 0.45) { this.atkHit = true; if (dist < attackRange + 0.4) { if (this.beh === 'snatcher' && tgt === G.player && G.run.burgers > 0) { const n = Math.min(5, G.run.burgers); G.run.burgers -= n; this.carry = n; this.flee = true; G.onSnatch && G.onSnatch(this); this.playLoop(); } else tgt.hurt(this.dmg, this); } }
      if (this.atkPhase <= 0) this.playLoop();
    } else if (!this.flee) {
      this.atkT -= dt;
      if (dist < attackRange && this.atkT <= 0) { this.atkT = this.beh === 'brute' || this.beh === 'boss' ? 1.6 : 1.1; this.atkPhase = 0.7; this.atkHit = false; ch.play(Math.random() < 0.5 ? 'Punch_Jab' : 'Punch_Cross', 0.12, { once: true, restart: true, speed: 1.2 }); sfx('zattack', this.pos, 0.6); }
      this.special -= dt;
      if (this.special <= 0 && this.los) {
        if (this.beh === 'spitter' && dist > 4 && dist < 18) { this.special = rand(2.5, 4); spit(this, tp); }
        else if (this.beh === 'shusher' && dist < 8) { this.special = rand(4, 6); if (tgt === G.player) G.player.shush(); sfx('shh', this.pos); }
        else if ((this.beh === 'brute' || (this.beh === 'boss' && this.boss && this.boss.charge)) && dist < 12 && dist > 3) { this.special = rand(4, 6); this.charge = 1.6; this.playLoop(); sfx('roar', this.pos, 0.7); }
        else if (this.beh === 'boss' && this.boss && this.boss.spit && dist > 3) { this.special = this.boss.spitRate || 2.2; spit(this, tp, this.boss.spit); }
        else this.special = rand(1, 2);
      }
    }
    if (sp > 0 && dist > attackRange * 0.85) { this.pos.x += mx * sp * dt; this.pos.z += mz * sp * dt; }
    G.world.collide(this.pos, 0.32 * this.scale, 0.1, 1.6);
    const want = this.atkPhase > 0 || dist < 3 ? Math.atan2(dx, dz) : Math.atan2(mx, mz); this.yaw += angDiff(this.yaw, want) * Math.min(1, dt * 6); this.root.rotation.y = this.yaw;
    // animation (far zombies update at half rate)
    const far = this.pos.distanceToSquared(G.player.pos) > 400; this.animAcc = (this.animAcc || 0) + dt;
    if (!far || (E.frame + idx) % 2 === 0) { ch.mixer.update(this.animAcc); this.animAcc = 0; this.shamble(); }
    this.updateBleed(dt);
    this.groan -= dt; if (this.groan <= 0) { this.groan = rand(4, 10); if (dist < 22) sfx('groan', this.pos, 0.55); }
  }
  shamble() {
    if (this.beh === 'runner' || this.beh === 'snatcher' || this.atkPhase > 0) return;
    this.rootQinv.copy(this.root.quaternion).invert(); const b = this.bones; const t = E.time + this.seed;
    if (!this.severed.armL) rotBone(b.upperarm_l, this.rootQinv, X, -this.armA + Math.sin(t * 2.1) * 0.12);
    if (!this.severed.armR) rotBone(b.upperarm_r, this.rootQinv, X, -this.armA + Math.sin(t * 2.1 + 1.3) * 0.12);
    rotBone(b.spine_02, this.rootQinv, X, 0.22); if (!this.headless) rotBone(b.Head, this.rootQinv, Zax, this.tilt + Math.sin(t * 1.3) * 0.08);
  }
  updateBleed(dt) {
    for (let i = this.bleed.length - 1; i >= 0; i--) { const bl = this.bleed[i]; bl.t -= dt; if (bl.t <= 0) { this.bleed.splice(i, 1); continue; } if (Math.random() < 0.7) { bl.bone.getWorldPosition(tmpV); tmpV2.set(rand(-.3, .3), 1, rand(-.3, .3)).normalize(); if (bl.dir) tmpV2.lerp(bl.dir, 0.5); fountain(tmpV, tmpV2, 2); } }
  }
  // ---- hit testing ----
  computeSpheres() {
    if (this.sphT === E.frame) return this.spheres; this.sphT = E.frame; const b = this.bones, s = this.scale, S = this.spheres; S.length = 0;
    const add = (bone, r, region, bone2, t = 0.5, up = 0) => { if (bone.scale.x < 0.01) return; bone.getWorldPosition(tmpV); if (bone2) { bone2.getWorldPosition(tmpV2); tmpV.lerp(tmpV2, t); } tmpV.y += up * s; S.push({ c: tmpV.clone(), r: r * s, region, bone }); };
    if (!this.headless) add(b.Head, 0.125, 'head', null, 0, 0.09);
    add(b.spine_03, 0.21, 'chest'); add(b.spine_01, 0.19, 'chest'); add(b.pelvis, 0.18, 'chest');
    add(b.upperarm_l, 0.075, 'armL', b.lowerarm_l); add(b.lowerarm_l, 0.065, 'armL', b.hand_l); add(b.upperarm_r, 0.075, 'armR', b.lowerarm_r); add(b.lowerarm_r, 0.065, 'armR', b.hand_r);
    add(b.thigh_l, 0.1, 'legL', b.calf_l); add(b.calf_l, 0.08, 'legL', b.foot_l); add(b.thigh_r, 0.1, 'legR', b.calf_r); add(b.calf_r, 0.08, 'legR', b.foot_r);
    return S;
  }
  hitTest(o, d, maxD) {
    if (!this.alive || this.dead || this.rise > 0.3) return null; tmpV.subVectors(this.pos, o); tmpV.y = 0; const along = tmpV.dot(d);
    if (along < -1 || along > maxD + 2) return null; const perp2 = tmpV.lengthSq() - along * along; if (perp2 > 2.2 * this.scale * this.scale) return null;
    let best = null; for (const sp of this.computeSpheres()) { const oc = tmpV2.subVectors(o, sp.c); const b = oc.dot(d), c = oc.lengthSq() - sp.r * sp.r, h = b * b - c; if (h < 0) continue; const t = -b - Math.sqrt(h); if (t > 0 && t < maxD && (!best || t < best.dist)) best = { dist: t, region: sp.region, bone: sp.bone, target: this }; }
    if (best) best.point = o.clone().addScaledVector(d, best.dist); return best;
  }
  aimPoint(out) { if (!this.headless) this.bones.Head.getWorldPosition(out).add(tmpV.set(0, 0.08 * this.scale, 0)); else this.bones.spine_03.getWorldPosition(out); return out; }
  bodyPoint(out) { return this.bones.spine_03.getWorldPosition(out); }
  // ---- damage & gore ----
  damage(amount, region, point, dir, src) {
    if (!this.alive || this.dead) return false;
    let mult = region === 'head' ? 3.2 : region === 'chest' ? 1 : 0.65; if (this.beh === 'boss' && region === 'head') mult = 1.8;
    const dmg = amount * mult; this.hp -= dmg; this.U.uFlash.value = 0.5; this.U.uBlood.value = Math.min(0.5, this.U.uBlood.value + dmg / this.maxHp * 0.3);
    if (point) { blood(point, dir, region === 'head' ? 18 : 10, 2.2); if (Math.random() < 0.5) mist(point, 5); }
    if (src !== 'burn' && this.beh !== 'boss') this.stagger = Math.max(this.stagger, region === 'head' ? 0.35 : 0.18);
    if (src === 'fire') this.burn = 4;
    // limb damage -> dismember
    if (this.limbHp[region] !== undefined && !this.severed[region]) { this.limbHp[region] -= amount; if (this.limbHp[region] <= 0 && this.beh !== 'boss') this.sever(region, dir, point); }
    if (this.hp <= 0) { this.die(region, dir, dmg, src, point); return true; }
    return false;
  }
  sever(region, dir, point) {
    const b = this.bones; this.severed[region] = true; const map = { armL: [b.lowerarm_l, b.upperarm_l], armR: [b.lowerarm_r, b.upperarm_r], legL: [b.calf_l, b.thigh_l], legR: [b.calf_r, b.thigh_r] };
    let [bone, parent] = map[region]; if (Math.random() < 0.35 && region.startsWith('arm')) { bone = parent; parent = parent.parent; }
    bone.getWorldPosition(tmpV); const v = (dir ? dir.clone().multiplyScalar(rand(2, 4)) : new THREE.Vector3()).add(new THREE.Vector3(rand(-1, 1), rand(2, 4), rand(-1, 1)));
    const g = gib(tmpV, v, this.scale * (region.startsWith('leg') ? 1.3 : 1)); bone.scale.setScalar(0.0001);
    const st = new THREE.Mesh(stumpGeo, stumpMat); st.scale.setScalar(0.05); st.position.copy(bone.position); parent.add(st); this.stumps.push(st);
    this.bleed.push({ bone: parent, t: 1.2, dir: null }); blood(tmpV, dir, 22, 3); sfx('gib', this.pos); G.onGib && G.onGib(this, region);
    if (region.startsWith('leg')) { this.limp = 0.5; this.playLoop(); }
  }
  popHead(dir) {
    const b = this.bones; if (this.headless) return; this.headless = true; b.Head.getWorldPosition(tmpV); b.Head.scale.setScalar(0.0001);
    for (let i = 0; i < 4; i++) gib(tmpV, new THREE.Vector3(rand(-2, 2), rand(2, 5), rand(-2, 2)).addScaledVector(dir || Yax, 2), this.scale * 0.6);
    blood(tmpV, dir, 40, 4); mist(tmpV, 16); const st = new THREE.Mesh(stumpGeo, stumpMat); st.scale.setScalar(0.06); st.position.copy(b.Head.position); b.neck_01.add(st); this.stumps.push(st);
    this.bleed.push({ bone: b.neck_01, t: 2.2, dir: new THREE.Vector3(0, 1, 0) }); sfx('headpop', this.pos);
    // splatter the wall/floor behind
    if (dir) { const dd = G.world.raycast(tmpV, dir, 5); if (dd < 5) decal(tmpV.clone().addScaledVector(dir, dd), G.world.hitN.clone(), 1.1); }
  }
  explode(dir) { for (const r of ['armL', 'armR', 'legL', 'legR']) if (!this.severed[r]) { this.severed[r] = true; this.limbHp[r] = 0; const save = Math.random; this.sever(r, dir); } this.popHead(dir); }
  die(region, dir, dmg, src, point) {
    this.dead = true; this.deadT = 0; this.hp = 0; this.charge = 0; this.flee = false; const shotgunClose = src === 'shotgun' && dmg > 120 && this.pos.distanceTo(G.player.pos) < 5;
    if (this.beh !== 'boss') { if (shotgunClose) this.explode(dir); else if (region === 'head' && src !== 'burn') this.popHead(dir); }
    this.ch.play('Death01', 0.12, { once: true, restart: true, speed: rand(0.95, 1.25) }); sfx('splat', this.pos, 0.8);
    setTimeout(() => { if (this.dead) decal(new THREE.Vector3(this.pos.x, 0, this.pos.z), new THREE.Vector3(0, 1, 0), 1.3 * this.scale); }, 900);
    G.onKill && G.onKill(this, region, src, shotgunClose);
  }
  dispose() { G.world.scene.remove(this.root); this.ch.mixer.stopAllAction(); this.ch.body.material.dispose(); }
}
// ---- projectiles (spitters, custard boss) ----
const spitGeo = new THREE.SphereGeometry(0.11, 8, 6);
const spitMats = { acid: new THREE.MeshStandardMaterial({ color: 0x9adf3a, emissive: 0x304a10, roughness: 0.3 }), custard: new THREE.MeshStandardMaterial({ color: 0xfff1b8, emissive: 0x332a10, roughness: 0.4 }), book: new THREE.MeshStandardMaterial({ color: 0x8a2a2a, roughness: 0.7 }) };
export function lob(from, tp, kind = 'acid', dmg = 14, scale = 2.4) {
  const m = new THREE.Mesh(spitGeo, spitMats[kind] || spitMats.acid); m.position.copy(from); m.scale.setScalar(scale);
  const tx = tp.x - from.x, tz = tp.z - from.z, d = Math.hypot(tx, tz); const T = clamp(d / 14, 0.8, 2.2); const v = new THREE.Vector3(tx / T, (1.0 - from.y) / T + 4.9 * T, tz / T);
  G.world.scene.add(m); Z.projectiles.push({ m, v, life: 5, kind, dmg, big: true }); sfx('spit', from);
}
function spit(z, tp, kind = 'acid') {
  const m = new THREE.Mesh(kind === 'book' ? new THREE.BoxGeometry(0.22, 0.06, 0.16) : spitGeo, spitMats[kind] || spitMats.acid); z.bones.Head.getWorldPosition(m.position); if (z.headless) m.position.set(z.pos.x, 1.5 * z.scale, z.pos.z);
  const tx = tp.x - m.position.x, tz = tp.z - m.position.z, d = Math.hypot(tx, tz); const T = clamp(d / 11, 0.5, 1.6); const v = new THREE.Vector3(tx / T, (1.0 - m.position.y) / T + 4.9 * T, tz / T);
  if (kind !== 'acid') m.scale.setScalar(kind === 'book' ? 1.6 : 1.8);
  G.world.scene.add(m); Z.projectiles.push({ m, v, life: 4, kind, dmg: z.dmg * (kind === 'acid' ? 1 : 1.2) }); sfx('spit', z.pos);
}
export function updateProjectiles(dt) {
  for (let i = Z.projectiles.length - 1; i >= 0; i--) {
    const p = Z.projectiles[i]; p.life -= dt; p.v.y -= 9.8 * dt; p.m.position.addScaledVector(p.v, dt); p.m.rotation.x += dt * 5;
    const pl = G.player; const hit = p.m.position.distanceTo(tmpV.set(pl.pos.x, 1.2, pl.pos.z)) < (p.big ? 1.3 : 0.8);
    if (hit || p.m.position.y < 0.05 || p.life <= 0) {
      if (hit) { pl.hurt(p.dmg, null); if (p.kind === 'custard') pl.slow = 2; }
      for (let k = 0; k < 10; k++) particle(p.m.position, tmpV2.set(rand(-2, 2), rand(0, 3), rand(-2, 2)), p.kind === 'acid' ? new THREE.Color(0.5, 0.9, 0.2) : p.kind === 'custard' ? new THREE.Color(1, 0.95, 0.75) : new THREE.Color(0.6, 0.2, 0.2), 0.05, 0.5);
      sfx('splash', p.m.position, 0.5); G.world.scene.remove(p.m); if (p.m.geometry !== spitGeo) p.m.geometry.dispose(); Z.projectiles.splice(i, 1);
    }
  }
}
// ---- pool / director ----
export function createPool(outfits, n, onProgress) {
  clearZombies(); for (let i = 0; i < n; i++) { const o = outfits[i % outfits.length]; const z = new Zombie(o, i * 7 + G.levelIdx * 31 + 1, i % 3 === 1); Z.list.push(z); }
}
export function clearZombies() { for (const z of Z.list) z.dispose(); Z.list.length = 0; for (const p of Z.projectiles) G.world && G.world.scene.remove(p.m); Z.projectiles.length = 0; }
export function freeZombie() { return Z.list.find(z => !z.alive && !z.reserved); }
export function aliveCount() { let n = 0; for (const z of Z.list) if (z.alive && !z.dead) n++; return n; }
export function updateZombies(dt) {
  Z.flowT -= dt; if (Z.flowT <= 0) { Z.flowT = 0.4; const t = G.player.pos; G.world.flowFrom(t.x, t.z); }
  for (let i = 0; i < Z.list.length; i++) Z.list[i].update(dt, i);
  updateProjectiles(dt);
}
// ray against every hittable (zombies + extra targets like bosses/minions)
export function raycastTargets(o, d, maxD) {
  let best = null; for (const z of Z.list) { const h = z.hitTest(o, d, maxD); if (h && (!best || h.dist < best.dist)) best = h; }
  for (const t of Z.hittables) { const h = t.hitTest(o, d, maxD); if (h && (!best || h.dist < best.dist)) best = h; }
  return best;
}
export function allTargets() { const out = []; for (const z of Z.list) if (z.alive && !z.dead && z.rise < 0.3) out.push(z); for (const t of Z.hittables) if (t.alive && !t.dead) out.push(t); return out; }
