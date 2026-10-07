// First-person player: movement, look, aim assist + auto-fire, weapons (hitscan), viewmodel animation, melee, damage.
import * as THREE from 'three';
import { G } from './state.js';
import { E } from './engine.js';
import { I, consumeLook, consumePressed } from './input.js';
import { WEAPONS, ORDER, buildViewmodels } from './weapons.js';
import { raycastTargets, allTargets } from './zombies.js';
import { blood, sparks, decal, tracer, muzzle, arc } from './fx.js';
import { sfx, setListener } from './audio.js';
import { S, up } from './save.js';
import { clamp, rand, angDiff } from './util.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), fwd = new THREE.Vector3(), rgt = new THREE.Vector3();
const ASSIST = { off: [0, 0, 0], low: [0.05, 0.6, 0.025], medium: [0.09, 1.3, 0.04], high: [0.13, 2.4, 0.06] }; // [cone rad, pull strength, magnetism rad]
export class Player {
  constructor() {
    this.pos = new THREE.Vector3(); this.yaw = 0; this.pitch = 0; this.vel = new THREE.Vector3(); this.bob = 0; this.kick = 0; this.shake = 0;
    this.VM = buildViewmodels(); this.vmRoot = new THREE.Group(); E.camera.add(this.vmRoot); for (const k in this.VM) { this.VM[k].visible = false; this.vmRoot.add(this.VM[k]); }
    this.vmLight = new THREE.PointLight(0xfff2dd, 0.6, 1.2); this.vmLight.position.set(0.1, 0.1, 0); this.vmRoot.add(this.vmLight);
    this.flashlight = new THREE.SpotLight(0xfff4e0, 0, 28, 0.5, 0.55, 1.5); this.flashlight.position.set(0.15, -0.1, 0); E.camera.add(this.flashlight); this.flashlight.target.position.set(0, 0, -5); E.camera.add(this.flashlight.target);
  }
  reset(spawn, yaw = 0) {
    this.pos.set(spawn.x, 0, spawn.z); this.yaw = yaw; this.pitch = 0; this.vel.set(0, 0, 0);
    this.maxHp = 100 + up('hp') * 25; this.hp = this.maxHp; this.dead = false; this.reviveUsed = false; this.saltsUsed = false; this.invuln = 0;
    this.ammo = {}; for (const k of ORDER) { const w = this.wstats(k); this.ammo[k] = { mag: w.mag, res: w.reserve }; }
    this.weapon = 'pistol'; this.cool = 0; this.reloading = 0; this.swapT = 0; this.meleeT = 0; this.meleeCd = 0; this.shushed = 0; this.slow = 0; this.loaned = false;
    this.lockTarget = null; this.hurtT = 0; this.lastHurt = -10; this.showWeapon('pistol', true);
    this.flashlight.intensity = G.level && G.level.dark ? 14 : 0; this.flashlight.castShadow = !!(E.q.flashShadow && G.level && G.level.dark);
  }
  available() { return ORDER.filter(k => k === 'pistol' || S.data.owned[k] || (k === 'rifle' && this.loaned)); }
  wstats(k) {
    const w = { ...WEAPONS[k] };
    if (k === 'pistol') { w.dmg *= 1 + up('pistol_dmg') * 0.2; w.mag += up('pistol_mag') * 6; w.reload *= Math.pow(0.75, up('pistol_rel')); if (up('pistol_rof')) w.rate /= 1.4; }
    if (k === 'rifle') { w.dmg *= 1 + up('rifle_dmg') * 0.2; w.mag += up('rifle_mag') * 15; if (up('rifle_sig')) w.rate *= 0.75; }
    if (k === 'shotgun') { w.dmg *= 1 + up('shotgun_dmg') * 0.2; w.reload *= Math.pow(0.75, up('shotgun_rel')); }
    if (k === 'defib') { w.dmg *= 1 + up('defib_dmg') * 0.25; if (up('defib_sig')) w.chain += 3; }
    if (G.kennedy && G.kennedy.active && up('k_hype')) w.dmg *= 1.15;
    return w;
  }
  showWeapon(k, instant) { for (const n in this.VM) this.VM[n].visible = false; this.VM[k].visible = true; this.weapon = k; this.reloading = 0; this.swapT = instant ? 0 : 0.35; if (!instant) sfx('swap'); }
  swap(dir = 1) { const av = this.available(); if (av.length < 2) return; const i = av.indexOf(this.weapon); this.showWeapon(av[(i + dir + av.length) % av.length]); }
  select(k) { if (this.available().includes(k) && k !== this.weapon) this.showWeapon(k); }
  reload() {
    const w = this.wstats(this.weapon), a = this.ammo[this.weapon]; if (this.reloading > 0 || a.mag >= w.mag || a.res <= 0) return;
    this.reloading = w.shellReload ? w.reload : w.reload; sfx('reload'); G.onReload && G.onReload();
  }
  shush() { this.shushed = 3; }
  hurt(dmg, src) {
    if (this.dead || this.invuln > 0 || G.mode !== 'play') return; dmg *= Math.pow(0.88, up('armor'));
    this.hp -= dmg; this.hurtT = 0.5; this.shake = 0.25; this.lastHurt = G.time; sfx('hurt'); G.onHurt && G.onHurt(dmg);
    if (src && src.pos) { tmp.subVectors(this.pos, src.pos).setY(0).normalize(); this.vel.addScaledVector(tmp, 2.5); }
    if (this.hp <= 0) {
      if (G.kennedy && G.kennedy.active && !G.kennedy.down && !this.reviveUsed) { this.reviveUsed = true; this.hp = this.maxHp * 0.5; this.invuln = 2.5; G.kennedy.reviveBark(); return; }
      if (up('salts') && !this.saltsUsed) { this.saltsUsed = true; this.hp = this.maxHp * 0.4; this.invuln = 2.5; G.onSalts && G.onSalts(); return; }
      this.hp = 0; this.dead = true; G.onPlayerDeath && G.onPlayerDeath();
    }
  }
  heal(n) { this.hp = Math.min(this.maxHp, this.hp + n); }
  eye(out) { return out.set(this.pos.x, 1.62 + Math.sin(this.bob * 2) * 0.025, this.pos.z); }
  dir(out) { return out.set(-Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), -Math.cos(this.yaw) * Math.cos(this.pitch)); }
  update(dt) {
    const p = consumePressed(); if (this.dead) return p;
    if (this.invuln > 0) this.invuln -= dt; if (this.shushed > 0) this.shushed -= dt; if (this.slow > 0) this.slow -= dt; if (this.hurtT > 0) this.hurtT -= dt;
    // look
    const [lx, ly] = consumeLook(); let slowK = 1;
    const assist = ASSIST[S.data.settings.aim] || ASSIST.medium;
    const tgt = this.findTarget(assist[0] * 1.6); this.lockTarget = tgt && tgt.ang < assist[0] ? tgt : null;
    if (this.lockTarget && (Math.abs(lx) + Math.abs(ly) > 0 || I.move.x || I.move.y)) slowK = 0.7; // slowdown near targets
    this.yaw -= lx * slowK; this.pitch = clamp(this.pitch - ly * slowK, -1.2, 1.2);
    if (this.lockTarget && assist[1] > 0 && (I.touchMode || S.data.settings.aim === 'high')) { // gentle pull toward head
      const t = this.lockTarget; const k = Math.min(1, assist[1] * dt * (I.fire || G.autoFiring ? 1.6 : 1)); this.yaw += angDiff(this.yaw, t.yaw) * k; this.pitch += (t.pitch - this.pitch) * k * 0.8;
    }
    // move
    const coffee = 1 + up('coffee') * 0.15; let sp = (I.sprint ? 6.2 : 4.4) * coffee * (this.slow > 0 ? 0.55 : 1) * (G.level && G.level.slowZone && G.level.slowZone(this.pos) ? 0.6 : 1);
    fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); rgt.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    tmp.set(0, 0, 0).addScaledVector(fwd, I.move.y).addScaledVector(rgt, I.move.x); const ml = tmp.length(); if (ml > 1) tmp.divideScalar(ml);
    this.vel.x += (tmp.x * sp - this.vel.x) * Math.min(1, dt * 12); this.vel.z += (tmp.z * sp - this.vel.z) * Math.min(1, dt * 12);
    this.pos.addScaledVector(this.vel, dt); G.world.collide(this.pos, 0.35, 0.1, 1.7);
    const spd = Math.hypot(this.vel.x, this.vel.z); this.bob += spd * dt * 1.6;
    // camera
    const cam = E.camera; this.eye(cam.position); if (this.shake > 0) { this.shake -= dt; cam.position.x += rand(-1, 1) * this.shake * 0.08; cam.position.y += rand(-1, 1) * this.shake * 0.08; }
    cam.rotation.set(this.pitch + this.kick * 0.6, this.yaw, 0, 'YXZ'); this.kick *= Math.pow(0.0001, dt);
    setListener(this.pos.x, this.pos.z, this.yaw);
    // actions
    if (p.swap) this.swap(1); if (p.w0) this.select('pistol'); if (p.w1) this.select('rifle'); if (p.w2) this.select('shotgun'); if (p.w3) this.select('defib');
    if (p.reload) this.reload();
    if (p.melee && !(G.level && G.level.callReady && G.level.callReady())) this.melee(); else if (p.melee) G.callKennedy && G.callKennedy();
    if (p.call) G.callKennedy && G.callKennedy();
    if (p.autofire) { S.data.settings.autofire = !S.data.settings.autofire; }
    this.updateWeapon(dt, spd);
    return p;
  }
  findTarget(cone) {
    const eye = this.eye(tmp2.clone()); let best = null; const dir = this.dir(new THREE.Vector3());
    for (const t of allTargets()) {
      const ap = t.aimPoint(new THREE.Vector3()); const d = ap.clone().sub(eye); const dist = d.length(); if (dist > 45) continue; d.divideScalar(dist);
      const ang = Math.acos(clamp(d.dot(dir), -1, 1)); if (ang > cone) continue;
      if (G.world.raycast(eye, d, dist) < dist - 0.3) continue;
      const score = ang + dist * 0.004; if (!best || score < best.score) best = { t, ang, dist, score, yaw: Math.atan2(-d.x, -d.z), pitch: Math.asin(d.y), point: ap };
    }
    return best;
  }
  updateWeapon(dt, spd) {
    const k = this.weapon, w = this.wstats(k), a = this.ammo[k], vm = this.VM[k], ud = vm.userData;
    this.cool -= dt * (this.shushed > 0 ? 0.55 : 1); if (this.swapT > 0) this.swapT -= dt; if (this.meleeCd > 0) this.meleeCd -= dt;
    if (this.reloading > 0) {
      this.reloading -= dt;
      if (this.reloading <= 0) {
        if (w.shellReload) { if (a.res > 0 && a.mag < w.mag) { a.mag++; a.res--; sfx('pump', null, 0.6); if (a.mag < w.mag && a.res > 0 && !I.fire) this.reloading = w.reload; } }
        else { const need = w.mag - a.mag, take = a.res === Infinity ? need : Math.min(need, a.res); a.mag += take; if (a.res !== Infinity) a.res -= take; }
      }
    }
    // auto-fire: fire when the reticle sits on a target
    const assist = ASSIST[S.data.settings.aim] || ASSIST.medium; let auto = false;
    if (S.data.settings.autofire) { const t = this.lockTarget || this.findTarget(0.05); if (t && t.ang < Math.max(0.035, assist[2]) + 0.01 && t.dist < (w.range * 0.8)) auto = true; }
    G.autoFiring = auto;
    const wantFire = (I.fire || auto) && this.swapT <= 0 && this.meleeT <= 0;
    if (wantFire && this.cool <= 0) {
      if (a.mag > 0 && (this.reloading <= 0 || w.shellReload)) { this.reloading = 0; this.fire(w, k); this.cool = w.rate; if (!w.auto) this.semiLatch = true; }
      else if (a.mag <= 0) { if (a.res > 0) this.reload(); else { sfx('empty'); this.cool = 0.3; if (k !== 'pistol') this.swap(-1); } }
    }
    if (a.mag <= 0 && a.res > 0 && this.reloading <= 0) this.reload();
    // viewmodel animation
    const base = ud.base; const bobX = Math.sin(this.bob) * 0.012 * Math.min(1, spd / 4), bobY = Math.abs(Math.cos(this.bob)) * 0.014 * Math.min(1, spd / 4);
    let ry = 0, rx = 0, dy = 0, dz = 0;
    if (this.reloading > 0 && !w.shellReload) { const t = 1 - this.reloading / w.reload; const s = Math.sin(t * Math.PI); rx = -0.6 * s; dy = -0.12 * s; ry = 0.3 * s; }
    if (this.reloading > 0 && w.shellReload) { const s = Math.sin((1 - this.reloading / w.reload) * Math.PI); rx = -0.25; dy = -0.05; ry = 0.2 * s; }
    if (this.swapT > 0) { dy -= this.swapT * 0.6; }
    vm.position.set(base.x + bobX, base.y - bobY + dy + this.kick * 0.25, base.z + dz + this.kick * 0.8); vm.rotation.set(rx + this.kick * 2.2, ry, 0);
    if (ud.slide) ud.slide.position.z = -0.06 + Math.min(0.03, this.kick * 1.2);
    if (ud.pump) ud.pump.position.z = -0.3 + (this.cool > w.rate * 0.3 && this.cool < w.rate * 0.85 ? 0.08 : 0);
    if (ud.flash) { const on = this.flashT > 0; ud.flash.userData.parts.forEach(pp => pp.visible = on); if (on) { this.flashT -= dt; ud.flash.rotation.z = rand(0, 6.28); } }
    // melee bedpan swing
    const bp = this.VM.bedpan; if (this.meleeT > 0) { this.meleeT -= dt; const t = 1 - this.meleeT / 0.45; bp.visible = true; vm.visible = false; const s = Math.sin(t * Math.PI); bp.position.set(-0.35 + t * 0.6, -0.2 + s * 0.12, -0.42); bp.rotation.set(-0.3, 0.9 - t * 1.8, -0.6 + t * 0.9); if (t > 0.35 && !this.meleeHit) { this.meleeHit = true; this.meleeStrike(); } if (this.meleeT <= 0) { bp.visible = false; vm.visible = true; } }
  }
  fire(w, k) {
    const a = this.ammo[k]; a.mag--; this.kick += w.kick; this.flashT = 0.045; sfx(w.sfx, null, 0.9); G.onShoot && G.onShoot(k);
    const eye = this.eye(new THREE.Vector3()); const dir = this.dir(new THREE.Vector3()); const mzw = this.VM[k].userData.muzzle.getWorldPosition(new THREE.Vector3());
    muzzle(mzw, k === 'defib' ? 4 : 5, k === 'defib' ? 0x88ccff : 0xffc070);
    const assist = ASSIST[S.data.settings.aim] || ASSIST.medium; let mag = null;
    if (assist[2] > 0) { const t = this.findTarget(assist[2]); if (t) mag = t; }
    if (k === 'defib') { this.fireDefib(w, eye, dir, mag, mzw); return; }
    let anyHit = false, head = false;
    for (let i = 0; i < w.pellets; i++) {
      const d = dir.clone(); if (mag && i === 0) d.copy(mag.point).sub(eye).normalize();
      if (w.spread) { d.x += rand(-1, 1) * w.spread; d.y += rand(-1, 1) * w.spread; d.z += rand(-1, 1) * w.spread; d.normalize(); }
      const wd = G.world.raycast(eye, d, w.range); const wn = G.world.hitN.clone(); const h = raycastTargets(eye, d, Math.min(wd, w.range));
      if (h) {
        anyHit = true; if (h.region === 'head') head = true; const dist = h.dist; const fall = k === 'shotgun' ? clamp(1.3 - dist / 18, 0.25, 1.2) : 1;
        h.target.damage(w.dmg * fall, h.region, h.point, d, up('shotgun_sig') && k === 'shotgun' ? 'fire' : k);
        if (i === 0 || k !== 'shotgun') tracer(mzw, h.point);
        if (head && up('pistol_sig') && k === 'pistol') this.heal(3);
        // blood on the wall behind
        if (Math.random() < 0.5) { const bd = G.world.raycast(h.point, d, 3); if (bd < 3) decal(h.point.clone().addScaledVector(d, bd), G.world.hitN.clone(), 0.6); }
      } else if (wd < w.range) { const hp = eye.clone().addScaledVector(d, wd); sparks(hp, 4, wn); if (i === 0) tracer(mzw, hp); }
    }
    if (anyHit) G.onHitMarker && G.onHitMarker(head);
  }
  fireDefib(w, eye, dir, mag, mzw) {
    const d = mag ? mag.point.clone().sub(eye).normalize() : dir; const wd = G.world.raycast(eye, d, w.range); let h = raycastTargets(eye, d, wd);
    let first = h ? h.target : (mag ? mag.t : null); let from = mzw.clone(); const hitSet = new Set();
    if (!first) { const end = eye.clone().addScaledVector(d, Math.min(wd, 25)); arc(from, end); sparks(end, 8); return; }
    let cur = first, dmg = w.dmg;
    for (let n = 0; n <= w.chain && cur; n++) {
      const p = cur.bodyPoint(new THREE.Vector3()); arc(from, p); arc(from, p); hitSet.add(cur); cur.damage(dmg, 'chest', p, d, 'defib'); if (up('defib_sig') && n > 0) sparks(p, 10);
      from = p; dmg *= 0.75; let nb = null, nd = 9; for (const t of allTargets()) { if (hitSet.has(t)) continue; const dd = t.pos.distanceTo(cur.pos); if (dd < nd) { nd = dd; nb = t; } } cur = nb;
    }
    G.onHitMarker && G.onHitMarker(false);
  }
  melee() { if (this.meleeCd > 0 || this.meleeT > 0) return; this.meleeT = 0.45; this.meleeCd = 0.6; this.meleeHit = false; sfx('whoosh'); }
  meleeStrike() {
    const dir = this.dir(new THREE.Vector3()).setY(0).normalize(); let hit = false;
    for (const t of allTargets()) { tmp.subVectors(t.pos, this.pos).setY(0); const d = tmp.length(); if (d > 2.3 + (t.scale || 1) * 0.3) continue; tmp.divideScalar(d || 1); if (tmp.dot(dir) < 0.45) continue; hit = true; const p = t.bodyPoint(new THREE.Vector3()); t.damage(65 * (1 + up('pistol_dmg') * 0.1), Math.random() < 0.3 ? 'head' : 'chest', p, dir, 'bedpan'); if (t.pos && !t.boss && t.beh !== 'boss') { t.pos.addScaledVector(tmp, 1.2); t.stagger = 1.0; } }
    if (hit) { sfx('bedpan'); this.shake = 0.12; G.onBedpan && G.onBedpan(); }
  }
}
