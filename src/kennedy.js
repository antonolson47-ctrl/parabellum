// Kennedy: AI partner. Follows Shayla, shoots zombies nearest to her, barks, gets downed and gets back up, revives her once.
import * as THREE from 'three';
import { makeCharacter } from './chars.js';
import { rifleWorldModel } from './guns.js';
import { G } from './state.js';
import { E } from './engine.js';
import { allTargets } from './zombies.js';
import { tracer, muzzle, blood } from './fx.js';
import { sfx } from './audio.js';
import { say } from './hud.js';
import { KENNEDY } from './text.js';
import { up } from './save.js';
import { bag, rand, angDiff } from './util.js';
const lines = {}; for (const k in KENNEDY) lines[k] = bag(KENNEDY[k]);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
export class Kennedy {
  constructor() {
    this.ch = makeCharacter('kennedy'); this.root = this.ch.root; this.pos = this.root.position; this.active = false; this.root.visible = false;
    // rifle lives in root space and follows the right hand each frame, always pointing where Kennedy faces
    this.rifle = rifleWorldModel(); this.root.add(this.rifle); this.rifle.scale.setScalar(1 / this.root.scale.x);
    E.scene.add(this.root);
  }
  arrive(p, yaw) {
    this.active = true; this.root.visible = true; this.pos.set(p.x, 0, p.z); this.yaw = yaw || 0; this.maxHp = this.hp = 220; this.down = false; this.downT = 0;
    this.target = null; this.tT = 0; this.fireT = 0; this.burst = 0; this.shots = 0; this.reloadT = 0; this.barkT = 4; this.idleT = 20; this.moving = false;
    this.ch.play('Pistol_Idle_Loop', 0); this.say(lines.arrive(), 4.5, 3);
  }
  leave() { this.active = false; this.root.visible = false; }
  say(t, d = 3, pri = 2) { say('KENNEDY', t, d, pri); }
  reviveBark() { this.say(lines.revive(), 3.5, 3); }
  hurt(dmg, src) {
    if (this.down || !this.active) return; this.hp -= dmg * 0.7; if (Math.random() < 0.15 && this.barkT <= 0) { this.say(lines.hurt()); this.barkT = 5; }
    if (this.hp <= 0) { this.down = true; this.downT = 9; this.ch.play('Death01', 0.15, { once: true, restart: true }); this.say(lines.down(), 3.5, 2); G.onKennedyDown && G.onKennedyDown(); }
  }
  update(dt) {
    if (!this.active) return; const pl = G.player; this.barkT -= dt; this.idleT -= dt;
    if (this.down) { this.downT -= dt; this.ch.mixer.update(dt); this.syncRifle(); if (this.downT <= 0) { this.down = false; this.hp = this.maxHp * 0.6; this.say(lines.up()); this.ch.play('Pistol_Idle_Loop', 0.3); } return; }
    // follow: stay ~3-5m behind/beside Shayla
    const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw); const want = tmp.set(pl.pos.x - fx * 3 + fz * 1.8, 0, pl.pos.z - fz * 3 - fx * 1.8);
    if (!G.world.isOpen(want.x, want.z)) want.set(pl.pos.x - fx * 2, 0, pl.pos.z - fz * 2);
    let dx = want.x - this.pos.x, dz = want.z - this.pos.z; let d = Math.hypot(dx, dz); const dpl = this.pos.distanceTo(pl.pos);
    if (dpl > 26) { this.pos.set(pl.pos.x - fx * 2.5, 0, pl.pos.z - fz * 2.5); G.world.collide(this.pos, 0.35); d = 0; }
    let sp = 0; if (d > 1.2) { sp = dpl > 9 ? 6.2 : 4.2; let mx = dx / d, mz = dz / d; tmp2.set(this.pos.x, 1.3, this.pos.z); const fd = { x: 0, z: 0 }; if (!G.world.los(tmp2, tmp.set(want.x, 1.3, want.z)) && G.world.flowDir(this.pos.x, this.pos.z, fd)) { mx = fd.x; mz = fd.z; } this.pos.x += mx * sp * dt; this.pos.z += mz * sp * dt; this.moveYaw = Math.atan2(mx, mz); }
    G.world.collide(this.pos, 0.35, 0.1, 1.7);
    // targeting
    this.tT -= dt; if (this.tT <= 0) { this.tT = 0.3; this.pickTarget(); }
    let wantYaw = this.moveYaw !== undefined && sp > 0 ? this.moveYaw : this.yaw; const t = this.target;
    if (t && t.alive && !t.dead) { wantYaw = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z); }
    this.yaw += angDiff(this.yaw, wantYaw) * Math.min(1, dt * 8); this.root.rotation.y = this.yaw;
    // shooting in bursts
    if (this.reloadT > 0) { this.reloadT -= dt; } else if (t && t.alive && !t.dead && Math.abs(angDiff(this.yaw, wantYaw)) < 0.3) {
      this.fireT -= dt; if (this.fireT <= 0) {
        if (this.burst <= 0) { this.burst = 3 + Math.floor(Math.random() * 3); }
        this.shoot(t); this.burst--; this.shots++; this.fireT = this.burst > 0 ? 0.13 : rand(0.45, 0.8);
        if (this.shots >= 30) { this.shots = 0; this.reloadT = 1.6; if (this.barkT <= 0) { this.say(lines.reload()); this.barkT = 6; } this.ch.play('Pistol_Reload', 0.15, { once: true, restart: true }); }
      }
    }
    // animation
    const moving = sp > 0.5; if (this.reloadT > 0) { } else if (moving) this.ch.play('Jog_Fwd_Loop', 0.2, { speed: sp / 4.2 }); else if (t) this.ch.play('Pistol_Aim_Neutral', 0.2); else this.ch.play('Pistol_Idle_Loop', 0.3);
    this.ch.mixer.update(dt); this.syncRifle();
    if (this.idleT <= 0) { this.idleT = rand(22, 35); if (!t) this.say(lines.idle(), 3.5, 1); }
  }
  pickTarget() {
    const pl = G.player; let best = null, bs = 1e9; const eye = tmp2.set(this.pos.x, 1.5, this.pos.z);
    for (const z of allTargets()) { const dz = z.pos.distanceTo(this.pos); if (dz > 30) continue; const score = z.pos.distanceTo(pl.pos) + dz * 0.5 - (z.beh === 'snatcher' && z.flee ? 20 : 0); if (score < bs) { const ap = z.bodyPoint(new THREE.Vector3()); if (G.world.los(eye, ap)) { bs = score; best = z; } } }
    this.target = best;
  }
  shoot(t) {
    const mz = this.rifle.userData.muzzle.getWorldPosition(new THREE.Vector3()); const head = Math.random() < 0.22; const p = head ? t.aimPoint(new THREE.Vector3()) : t.bodyPoint(new THREE.Vector3());
    const hit = Math.random() < 0.78; if (!hit) p.add(new THREE.Vector3(rand(-.6, .6), rand(-.3, .5), rand(-.6, .6)));
    tracer(mz, p); muzzle(mz, 3); sfx('kennedyRifle', this.pos, 0.8);
    if (hit) { const dir = p.clone().sub(mz).normalize(); const killed = t.damage(20 * (up('k_over') ? 1.6 : 1) * (1 + G.levelIdx * 0.08), head ? 'head' : 'chest', p, dir, 'kennedy'); if (killed && this.barkT <= 0 && Math.random() < 0.4) { this.say(lines.kill()); this.barkT = 7; } }
  }
  syncRifle() { const h = this.ch.bone.hand_r; h.getWorldPosition(tmp); this.root.worldToLocal(tmp); this.rifle.position.set(tmp.x - 0.01, tmp.y + 0.02, tmp.z + 0.02); this.rifle.rotation.set(this.down ? 1.2 : (this.reloadT > 0 ? 0.5 : -0.04), 0, 0); }
  bodyPoint(out) { return this.ch.bone.spine_03.getWorldPosition(out); }
}
