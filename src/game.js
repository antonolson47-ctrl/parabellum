// Game flow: title, shifts, level lifecycle, spawn director, Kennedy call-in, bosses, pickups, barks, results, Vendy's shop, endings.
import * as THREE from 'three';
import { E, render, trackFrame, setQuality, QUALITY } from './engine.js';
import { G } from './state.js';
import { I, initInput, bindButton, pollKeyboard, resetInput } from './input.js';
import { H, FINGER, buildHUD, showHUD, say, toast, rule, float, hitMarker, bump, hudTick, project, setText, setStyle, clearHudCache } from './hud.js';
import { World, T, clearMats } from './world.js';
import { LEVELS } from './levels.js';
import { Player } from './player.js';
import { Kennedy } from './kennedy.js';
import { Z, createPool, clearZombies, freeZombie, aliveCount, updateZombies } from './zombies.js';
import { makeBoss, Minion } from './bosses.js';
import { P, spawnPickup, clearPickups, updatePickups } from './pickups.js';
import { initFX, updateFX, clearFX, particle } from './fx.js';
import { A, initAudio, playMusic, stopMusic, sfx, setVolumes, suspendAudio } from './audio.js';
import { S, save, resetSave, up, SHOP } from './save.js';
import { BARKS, KENNEDY, RULES } from './text.js';
import { WEAPONS, ORDER } from './weapons.js';
import { makeCharacter, makeZombie } from './chars.js';
import { makeKweepie } from './kweepie.js';
import { playCine, cineActive, cineTick, actor } from './story.js';
import { bag, rand, randi, pick, clamp, lerp, angDiff } from './util.js';

const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const bk = {}; for (const k in BARKS) bk[k] = bag(BARKS[k]);
let barkCd = 0, lowHpT = 0;
function bark(cat, pri = 1, chance = 1) { if (Math.random() > chance || !bk[cat]) return; if (barkCd > 0 && pri < 2) return; if (say('SHAYLA', bk[cat](), 3.4, pri)) barkCd = 3.2 + Math.random() * 2.5; }
function showRule(n) { if (S.data.rulesSeen.includes(n)) return; S.data.rulesSeen.push(n); const r = RULES.find(r => r[0] === n); if (r) rule(n, r[1]); save(); }
const CSS2 = `
.title .foot{margin-top:12px;font-family:'Barlow Condensed';font-weight:600;font-size:15px;color:#ddd;text-shadow:0 2px 3px #000;display:flex;gap:14px;align-items:center;justify-content:center}
.title .foot svg{width:16px;height:16px;vertical-align:-3px}
.title .credit{position:absolute;bottom:calc(8px + env(safe-area-inset-bottom));font-size:11px;opacity:.55;font-family:'Barlow Condensed'}
.lvlgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;width:min(900px,92vw);max-height:66vh;overflow:auto}
.lvl{background:rgba(10,14,18,.85);border:2px solid #3a4a55;border-radius:10px;padding:8px 10px;text-align:left;cursor:pointer}
.lvl .s{font-family:'Black Ops One';font-size:12px;color:#ffd84a}.lvl .n{font-family:'Black Ops One';font-size:15px;line-height:1.05}.lvl .m{font-size:13px;opacity:.75}
.lvl.lock{opacity:.4;pointer-events:none}.lvl.done{border-color:#57d68d}
.dead h1{font-family:'Butcherman','Black Ops One';font-weight:400;font-size:min(12vw,96px);margin:0;color:#ff3b3b;text-shadow:0 0 20px #f00,0 4px 0 #400}
.dead p{font-size:20px;font-weight:600;max-width:80vw}
.shopfoot{display:flex;gap:10px;justify-content:flex-end;margin-top:8px}
.fing{display:flex;align-items:center;gap:4px;font-family:'Black Ops One';font-size:20px}.fing svg{width:22px;height:22px}
.loadsc{position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:'Black Ops One';pointer-events:auto}
.loadsc .sh{color:#ffd84a;font-size:clamp(14px,2.4vw,20px)}.loadsc .nm{font-size:clamp(22px,5vw,46px);text-align:center;padding:0 10px}.loadsc .tip{margin-top:14px;font-family:'Barlow Condensed';font-weight:600;color:#bbb;max-width:80vw;text-align:center}
.loadsc .lb{width:240px;height:8px;border:1px solid #844;border-radius:4px;margin-top:12px;overflow:hidden}.loadsc .lb div{height:100%;background:#c22;width:0;transition:width .2s}
`;
// ───────────────────────────── init
let titleScene = null;
export function initGame() {
  const st = document.createElement('style'); st.textContent = CSS2; document.head.appendChild(st);
  initInput(H.root); initFX(E.scene);
  G.player = new Player(); G.kennedy = new Kennedy(); G.kennedy.root.visible = false;
  // buttons
  bindButton(document.getElementById('bfire'), () => { I.fire = true; }, () => { I.fire = false; });
  bindButton(document.getElementById('breload'), () => { I.pressed.reload = true; });
  bindButton(document.getElementById('bswap'), () => { I.pressed.swap = true; });
  bindButton(document.getElementById('bmelee'), () => { I.pressed.melee = true; });
  bindButton(H.autofire, () => { S.data.settings.autofire = !S.data.settings.autofire; save(); });
  bindButton(document.getElementById('pausebtn'), () => pause(true));
  // hooks
  G.onKill = onKill; G.onGib = () => { S.data.stats.gibs++; bark('gib', 1, 0.45); };
  G.onSnatch = z => { bark('snatch', 2); toast('BURGER THIEF!', `-${z.carry} 🍔 · kill him to get them back`, 2.6, true); };
  G.onReload = () => bark('reload', 1, 0.3);
  G.onHurt = dmg => { if (G.player.hp < G.player.maxHp * 0.3 && lowHpT <= 0) { lowHpT = 12; bark('lowhp', 2); } else bark('hurt', 1, 0.18); showRule(2); };
  G.onPlayerDeath = onDeath; G.onSalts = () => { toast('SMELLING SALTS', 'Back on your feet, nurse', 2.5); say('SHAYLA', "Oh, I'm not dying on a Tuesday. Fuck that.", 3, 3); };
  G.onShoot = () => { }; G.onHitMarker = head => { hitMarker(head); };
  G.onBedpan = () => { bark('bedpan', 1, 0.5); showRule(9); };
  G.onPickup = onPickup; G.onKennedyDown = () => { };
  G.needsAmmo = () => ORDER.some(k => k !== 'pistol' && G.player.available().includes(k) && G.player.ammo[k].res < G.player.wstats(k).reserve);
  G.callKennedy = callKennedy; G.spawnMinion = spawnMinion; G.onMinionKill = m => { addFingers(1, m.pos); };
  G.onBossDead = () => bossDefeated(); G.onBossPhase = t => { say('SHAYLA', t, 3, 3); sfx('roar', null, 0.6); };
  G.onTenureDenied = () => { toast('TENURE DENIED', 'His orbs are gone. He can bleed now.', 2.6); say('SHAYLA', 'Tenure DENIED, motherfucker.', 3, 3); };
  G.onKweepieTeleport = () => { if (Math.random() < 0.3) bark('kweepie', 1); };
  G.setSunrise = f => { if (G.env && G.level && G.level.def.id === 'sequoyah') { G.env.sun.intensity = 1.2 + f * 2.2; G.env.hemi.intensity = 0.6 + f * 0.6; E.renderer.toneMappingExposure = 0.85 + f * 0.35; } };
  // first gesture -> audio
  const unlock = () => { if (!A.ctx) { initAudio(); setVolumes(S.data.settings.music, S.data.settings.sfx); if (G.mode === 'title' || G.mode === 'menu') playMusic('title'); } };
  addEventListener('pointerdown', unlock, true); addEventListener('keydown', unlock, true);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { if (G.mode === 'play') pause(true); suspendAudio(true); } else suspendAudio(false); });
  addEventListener('resize', () => { if (H.phint) H.phint.style.display = 'none'; });
  window.__PB = testHooks();
  buildTitleScene(); titleScreen();
  let last = performance.now();
  const loop = now => { requestAnimationFrame(loop); let dt = (now - last) / 1000; last = now; if (dt > 0.1) dt = 0.1; if (G.fast) dt = 1 / 30; frame(dt); };
  requestAnimationFrame(loop);
}
// ───────────────────────────── title backdrop (3D: Shayla, Kennedy, shambling horde)
function buildTitleScene() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#07080a'); sc.fog = new THREE.Fog('#0a0606', 6, 22);
  const g = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: T.asphalt(), roughness: 0.9 })); g.material.map.repeat.set(12, 12); g.rotation.x = -Math.PI / 2; g.receiveShadow = true; sc.add(g);
  sc.add(new THREE.HemisphereLight('#6a7a9a', '#100808', 0.5));
  const key = new THREE.DirectionalLight('#ffd8b0', 2.2); key.position.set(3, 5, 6); key.castShadow = E.q.shadows; key.shadow.mapSize.set(1024, 1024); const c = key.shadow.camera; c.left = c.bottom = -6; c.right = c.top = 6; key.shadow.bias = -0.0004; sc.add(key);
  const red = new THREE.PointLight('#ff2a1a', 30, 14, 1.5); red.position.set(-3, 2.5, -3); sc.add(red); const teal = new THREE.PointLight('#2ad1c0', 18, 12, 1.5); teal.position.set(4, 2, -1); sc.add(teal);
  const sh = actor('shayla'); sc.add(sh.root); sh.root.position.set(-0.45, 0, 0.6); sh.root.rotation.y = 0.25; sh.play('Pistol_Idle_Loop', 0);
  const kn = actor('kennedy'); sc.add(kn.root); kn.root.position.set(0.75, 0, 0.1); kn.root.rotation.y = -0.3; kn.play('Pistol_Aim_Neutral', 0);
  const zs = []; const outfits = ['gown', 'custard', 'scrubs', 'librarian', 'frat', 'bachelorette', 'graduate'];
  for (let i = 0; i < 7; i++) { const z = makeZombie(outfits[i], 50 + i * 3, i % 2 === 1); z.root.position.set(-4 + i * 1.3 + rand(-.3, .3), 0, -4 - rand(0, 3)); z.root.rotation.y = rand(-0.3, 0.3); z.play('Walk_Loop', 0, { speed: 0.7 }); z.cur.time = rand(0, 2); sc.add(z.root); zs.push(z); }
  const cam = new THREE.PerspectiveCamera(40, 1, 0.05, 80);
  titleScene = { sc, cam, sh, kn, zs, t: 0, red };
}
function renderTitle(dt) {
  const T = titleScene; if (!T) return; T.t += dt;
  if (T.sh.root.parent !== T.sc) { T.sc.add(T.sh.root); T.sh.root.position.set(-0.45, 0, 0.6); T.sh.root.rotation.set(0, 0.25, 0); T.sh.play('Pistol_Idle_Loop', 0); }
  if (T.kn.root.parent !== T.sc) { T.sc.add(T.kn.root); T.kn.root.position.set(0.75, 0, 0.1); T.kn.root.rotation.set(0, -0.3, 0); T.kn.play('Pistol_Aim_Neutral', 0); }
  T.sh.mixer.update(dt); T.kn.mixer.update(dt); for (const z of T.zs) { z.mixer.update(dt); z.root.position.z += dt * 0.25; if (z.root.position.z > -1.5) z.root.position.z = -7.5; }
  T.red.intensity = 26 + Math.sin(T.t * 7) * 4 + (Math.random() < 0.02 ? -20 : 0);
  const a = Math.sin(T.t * 0.15) * 0.35; const portrait = innerWidth < innerHeight;
  T.cam.position.set(Math.sin(a) * 4.2, 1.25, 3.6 + Math.cos(a) * 0.6 + (portrait ? 2.2 : 0)); T.cam.lookAt(0.1, portrait ? 1.6 : 1.45, 0); T.cam.aspect = innerWidth / innerHeight; T.cam.fov = portrait ? 55 : 40; T.cam.updateProjectionMatrix();
  E.renderer.toneMappingExposure = 1.0; E.renderer.render(T.sc, T.cam);
}
// ───────────────────────────── screens
function screen(html, cls = '') { H.screens.innerHTML = html ? `<div class="screen ${cls}">${html}</div>` : ''; return H.screens.firstChild; }
const $s = id => H.screens.querySelector('#' + id);
const onClick = (id, f) => { const e = $s(id); if (e) e.addEventListener('click', e2 => { e2.stopPropagation(); sfx('click'); f(); }); };
function haulLine() { return `<span>${FINGER}${S.data.fingers}</span><span>🍔 ${S.data.burgers}/120</span><span>🥤 ${S.data.cokes}/120</span>`; }
export function titleScreen() {
  G.mode = 'title'; showHUD(false); I.enabled = false; if (document.exitPointerLock && document.pointerLockElement) document.exitPointerLock(); if (A.ctx) playMusic('title');
  const next = Math.min(S.data.unlocked, 8); const started = S.data.completed.length > 0;
  screen(`<h1>PARABELLUM</h1><h2>Shayla vs. the Undead and the Steakburger Apocalypse</h2>
  <div class="age">18+ · GRAPHIC GORE &amp; NONSTOP SWEARING<small>Blood, dismemberment, exploding heads and a nurse who swears like a sailor. Grown-ups only.</small></div>
  <div class="menu"><button class="b" id="tplay">${started ? 'CONTINUE · SHIFT ' + (next + 1) : 'CLOCK IN'}</button><button class="b alt" id="tshifts">SHIFTS</button><button class="b alt" id="tshop">VENDY'S</button><button class="b alt" id="tset">SETTINGS</button></div>
  <div class="foot">${haulLine()}</div><div class="credit">A birthday game for Shayla · original parody · all music &amp; sound procedurally generated</div>`, 'title');
  onClick('tplay', () => startLevel(next)); onClick('tshifts', shiftsScreen); onClick('tshop', () => shopScreen(titleScreen)); onClick('tset', () => settingsScreen(titleScreen));
}
function shiftsScreen() {
  G.mode = 'menu';
  const cards = LEVELS.map((L, i) => `<div class="lvl ${i > S.data.unlocked ? 'lock' : ''} ${S.data.completed.includes(i) ? 'done' : ''}" data-i="${i}"><div class="s">${L.shift}</div><div class="n">${L.name}</div><div class="m">${i > S.data.unlocked ? '🔒 Locked' : S.data.completed.includes(i) ? '✔ Cleared · replay for more food' : L.obj}</div></div>`).join('');
  screen(`<div class="panel" style="background:rgba(8,10,12,.8)"><h3>SHIFTS</h3><div class="lvlgrid">${cards}</div><div class="shopfoot"><button class="b alt small" id="sback">BACK</button></div></div>`, 'title');
  H.screens.querySelectorAll('.lvl').forEach(el => el.addEventListener('click', () => { sfx('click'); startLevel(+el.dataset.i); }));
  onClick('sback', titleScreen);
}
function settingsScreen(back) {
  const st = S.data.settings; const prev = G.mode; G.mode = G.mode === 'play' ? 'paused' : 'menu';
  const sel = (id, opts, v) => `<select id="${id}">${opts.map(([k, l]) => `<option value="${k}" ${String(v) === String(k) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  screen(`<div class="panel"><h3>SETTINGS</h3>
  <div class="row"><label>Graphics quality</label>${sel('squal', [['low', 'Low (fastest)'], ['medium', 'Medium'], ['high', 'High (bloom)']], st.quality)}</div>
  <div class="row"><label>Aim assist</label>${sel('saim', [['off', 'Off'], ['low', 'Low'], ['medium', 'Medium'], ['high', 'High']], st.aim)}</div>
  <div class="row"><label>Auto-fire when on target</label>${sel('sauto', [['true', 'On'], ['false', 'Off']], st.autofire)}</div>
  <div class="row"><label>Look sensitivity</label><input id="ssens" type="range" min="0.4" max="2.2" step="0.05" value="${st.sens}"></div>
  <div class="row"><label>Invert look Y</label>${sel('sinv', [['false', 'No'], ['true', 'Yes']], st.invertY)}</div>
  <div class="row"><label>Music volume</label><input id="smus" type="range" min="0" max="1" step="0.05" value="${st.music}"></div>
  <div class="row"><label>SFX volume</label><input id="ssfx" type="range" min="0" max="1" step="0.05" value="${st.sfx}"></div>
  <div class="row"><label>Subtitles</label>${sel('ssub', [['true', 'On'], ['false', 'Off']], st.subs)}</div>
  <div class="shopfoot"><button class="b alt small" id="sreset">RESET PROGRESS</button><button class="b small" id="sdone">DONE</button></div></div>`, 'title');
  const v = id => $s(id).value;
  onClick('sdone', () => { st.quality = v('squal'); st.aim = v('saim'); st.autofire = v('sauto') === 'true'; st.sens = +v('ssens'); st.invertY = v('sinv') === 'true'; st.music = +v('smus'); st.sfx = +v('ssfx'); st.subs = v('ssub') === 'true'; applySettings(); save(); G.mode = prev; back(); });
  onClick('sreset', () => { if (confirm('Reset all progress, fingers and food?')) { resetSave(); G.mode = prev; titleScreen(); } });
}
function applySettings() { const st = S.data.settings; if (E.qname !== st.quality) { setQuality(st.quality); if (G.env) G.env.sun.shadow.mapSize.set(E.q.shadowSize, E.q.shadowSize); } I.sens = st.sens; I.invertY = st.invertY; setVolumes(st.music, st.sfx); H.sub.style.visibility = st.subs ? '' : 'hidden'; }
const VENDY = ["Welcome to Vendy's! I take fingers. Don't ask what I do with them.", "Fingers in, firepower out. That's the circle of life, sweetie.", "Ooh, those are fresh. Still warm. Love that for you.", "No refunds. No questions. No fingers left behind.", "Kennedy already bought three of these. Don't tell him I told you."];
function shopScreen(back, nextLabel) {
  G.mode = 'shop'; showHUD(false); if (A.ctx) playMusic('shop');
  const draw = () => {
    const items = SHOP.filter(it => (it.req === undefined || S.data.unlocked >= it.req) && (!it.need || S.data.owned[it.need]));
    const cards = items.map(it => {
      const lvl = it.weapon ? (S.data.owned[it.weapon] ? 1 : 0) : up(it.id); const max = it.cost.length; const owned = lvl >= max; const cost = owned ? 0 : it.cost[lvl];
      return `<div class="item ${owned ? 'owned' : ''}"><div class="n">${it.name}</div><div class="d">${it.desc}</div><div class="lv">${it.cat}${max > 1 ? ` · Lv ${lvl}/${max}` : ''}</div><button class="buybtn" data-id="${it.id}" ${owned || S.data.fingers < cost ? 'disabled' : ''}>${owned ? 'OWNED' : `${FINGER} ${cost}`}</button></div>`;
    }).join('');
    screen(`<div class="shop"><div class="hd"><h3>VENDY'S VENDING EMPORIUM</h3><div class="vendy">“${pick(VENDY)}”</div><div class="fing">${FINGER}<span>${S.data.fingers}</span></div></div><div class="grid">${cards}</div><div class="shopfoot"><button class="b small" id="shopgo">${nextLabel || 'BACK'}</button></div></div>`);
    H.screens.querySelectorAll('.buybtn').forEach(b => b.addEventListener('click', () => buy(b.dataset.id)));
    onClick('shopgo', back);
  };
  const buy = id => {
    const it = SHOP.find(s => s.id === id); const lvl = it.weapon ? (S.data.owned[it.weapon] ? 1 : 0) : up(id); if (lvl >= it.cost.length) return; const cost = it.cost[lvl]; if (S.data.fingers < cost) return;
    S.data.fingers -= cost; if (it.weapon) S.data.owned[it.weapon] = true; else S.data.up[id] = lvl + 1; save(); sfx('buy'); draw();
  };
  draw();
}
// ───────────────────────────── level lifecycle
let minions = [], kweepieProp = null, kellyNpc = null, dirT = 0, multi = { n: 0, t: 0 };
function cleanupLevel() {
  clearZombies(); clearPickups(); clearFX(); Z.hittables.length = 0;
  for (const m of minions) m.mesh.removeFromParent(); minions = [];
  if (G.level && G.level.boss) { const b = G.level.boss; if (b.mesh) b.mesh.removeFromParent(); if (b.bike) b.bike.removeFromParent(); if (b.orbs) b.orbs.forEach(o => o.mesh.removeFromParent()); }
  if (kweepieProp) { kweepieProp.removeFromParent(); kweepieProp = null; } if (kellyNpc) { kellyNpc.root.removeFromParent(); kellyNpc = null; }
  if (G.world) { G.world.dispose(); G.world = null; }
  if (G.env) { for (const o of G.env.objs) E.scene.remove(o); G.env = null; }
  G.kennedy.leave(); clearHudCache();
}
function applyEnv(env, bounds) {
  const objs = [];
  E.scene.background = env.indoor ? new THREE.Color(env.sky[0]) : T.sky(env.sky[0], env.sky[1]);
  E.scene.fog = new THREE.Fog(env.fog[0], env.fog[1], env.fog[2]);
  const hemi = new THREE.HemisphereLight(env.hemi[0], env.hemi[1], env.hemi[2]); E.scene.add(hemi); objs.push(hemi);
  const [sc, si, sx, sy, sz] = env.sun; const sun = new THREE.DirectionalLight(sc, si); sun.castShadow = E.q.shadows; sun.shadow.mapSize.set(E.q.shadowSize, E.q.shadowSize);
  const cam = sun.shadow.camera; cam.left = cam.bottom = -20; cam.right = cam.top = 20; cam.near = 1; cam.far = 90; sun.shadow.bias = -0.0005; sun.shadow.normalBias = 0.03;
  E.scene.add(sun); E.scene.add(sun.target); objs.push(sun, sun.target);
  const dir = new THREE.Vector3(sx, sy, sz).normalize();
  E.renderer.toneMappingExposure = env.exposure || 1;
  G.env = { objs, sun, hemi, dir, exposure: env.exposure || 1 };
}
function loadingScreen(L, i) { screen(`<div class="loadsc"><div class="sh">${L.shift}</div><div class="nm">${L.name}</div><div class="lb"><div id="lbv"></div></div><div class="tip">${pick(TIPS)}</div></div>`); }
const TIPS = ['Tip: auto-fire shoots when your reticle sits on a zombie. Aim, nurse. The gun does the rest.', 'Tip: headshots pay extra fingers. Fingers buy guns. Guns make more fingers.', 'Tip: at 50% of the shift, tap 📞 to call Kennedy. He brings a rifle and no impulse control.', 'Tip: you need 120 🍔 and 120 🥤 for the real reunion ending. Replay shifts to haul more.', 'Tip: kill Burger Thieves fast or your steakburgers are gone forever.', 'Tip: the bedpan knocks zombies back. Use it when they get handsy.', 'Tip: Vendy sells upgrades between shifts. She does not ask where the fingers came from.'];
const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));
export async function startLevel(i) {
  const L = LEVELS[i]; G.mode = 'loading'; I.enabled = false; resetInput(); showHUD(false); loadingScreen(L, i); await nextFrame(); await nextFrame();
  const bar = p => { const e = $s('lbv'); if (e) e.style.width = (p * 100) + '%'; };
  cleanupLevel(); bar(0.1); await nextFrame();
  G.levelIdx = i; const W = new World(E.scene); G.world = W; const anc = L.build(W); W.finalize(); bar(0.35); await nextFrame();
  applyEnv(L.env, W.bounds);
  G.level = { def: L, anc, kills: 0, quota: L.quota || 0, survive: L.survive || 0, timeLeft: L.survive || 0, phase: 'fight', boss: null, kennedyCalled: false, dark: !!L.env.dark, t: 0, kweepieI: 0,
    callReady() { return !this.kennedyCalled && this.phase !== 'done' && (this.survive ? this.t > this.survive * 0.5 : this.kills >= this.quota * 0.5); }, slowZone() { return false; } };
  G.run = { burgers: 0, cokes: 0, fingers: 0, kills: 0, heads: 0, gibs: 0 };
  G.player.reset(anc.start, anc.start.yaw); G.time = 0;
  createPool(L.outfits, E.q.maxZ); bar(0.7); await nextFrame();
  for (const p of anc.pickups || []) spawnPickup(p[0], p[1], p[2], p[3]);
  if (anc.kweepie) { kweepieProp = makeKweepie(0.5, true); E.scene.add(kweepieProp); placeKweepie(); }
  if (anc.kelly) { kellyNpc = makeCharacter('kelly'); kellyNpc.root.position.set(anc.kelly.x, 0, anc.kelly.z); kellyNpc.root.rotation.y = Math.atan2(-anc.kelly.x, -anc.kelly.z); kellyNpc.play('Idle_Talking_Loop', 0); E.scene.add(kellyNpc.root); kellyNpc.met = false; }
  // warm up shaders so the first fight doesn't hitch
  for (const z of Z.list) { z.root.visible = true; z.root.position.set(anc.start.x, -50, anc.start.z); }
  G.player.eye(E.camera.position); E.camera.rotation.set(0, anc.start.yaw, 0, 'YXZ'); E.camera.updateMatrixWorld();
  try { E.renderer.compile(E.scene, E.camera); } catch (e) { }
  render(); for (const z of Z.list) { z.root.visible = false; }
  bar(1); await nextFrame();
  // story beats
  if (i === 0 && !S.data.seenIntro) { await runCine('intro'); S.data.seenIntro = true; save(); }
  if (i === 1 && !S.data.seenCall) { await runCine('kellyCall'); S.data.seenCall = true; save(); }
  if (L.id === 'home') { G.kennedy.arrive({ x: anc.kennedy.x, z: anc.kennedy.z }, anc.start.yaw); G.level.kennedyCalled = true; }
  screen(''); showHUD(true); applySettings(); G.mode = 'play'; I.enabled = true; dirT = 1.5;
  if (A.ctx) playMusic(L.music);
  setTimeout(() => { if (G.mode === 'play') { say('SHAYLA', bk.levelStart(), 3.6, 2); barkCd = 4; } }, 600);
  if (i === 0) setTimeout(() => showRule(1), 4000); if (i === 6) showRule(8); if (i === 7) setTimeout(() => showRule(10), 3000);
  toast(L.shift, L.survive ? `${L.obj} · survive ${L.survive}s` : `${L.obj} · ${L.quota} kills`, 3);
  if (E.portrait) { H.phint.style.display = 'block'; setTimeout(() => H.phint.style.display = 'none', 3500); }
}
async function runCine(name) {
  const prev = G.mode; G.mode = 'cine'; I.enabled = false; resetInput(); showHUD(false); if (document.pointerLockElement) document.exitPointerLock();
  screen(''); const pr = playCine(name); if (G.autoSkipCine) setTimeout(() => window.__PB.skipCine(), G.autoSkipCine); await pr; G.mode = prev;
}
function placeKweepie() { const spots = G.level.anc.kweepie; if (!spots || !kweepieProp) return; const s = spots[G.level.kweepieI % spots.length]; kweepieProp.position.set(s[0], 0, s[1]); kweepieProp.visible = true; kweepieProp.rotation.y = rand(0, 6); }
// ───────────────────────────── spawn director
function spawnPoint(out) {
  const zones = G.level.anc.spawnZones; const pl = G.player; const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw);
  for (let k = 0; k < 16; k++) {
    const z = pick(zones); const x = rand(z[0], z[2]), y = rand(z[1], z[3]); if (!G.world.isOpen(x, y)) continue; const dx = x - pl.pos.x, dz = y - pl.pos.z, d = Math.hypot(dx, dz); if (d < 9) continue;
    const inView = (dx * fx + dz * fz) / d > 0.45 && d < 24; if (inView && k < 12) continue; return out.set(x, 0, y);
  }
  return null;
}
function pickType(mix) { let r = Math.random(), acc = 0; for (const k in mix) { acc += mix[k]; if (r < acc) return k; } return 'walker'; }
function director(dt) {
  const L = G.level; if (L.phase === 'done' || L.phase === 'exit') return; dirT -= dt; if (dirT > 0) return;
  const lv = G.levelIdx; const alive = aliveCount() - (L.boss && L.boss.z && !L.boss.z.dead ? 1 : 0);
  const cap = Math.min(E.q.maxZ - 1, Math.round(6 + lv * 1.3 + (L.survive ? 6 : 0))) * (L.phase === 'boss' ? 0.5 : 1);
  const remaining = L.survive ? 999 : L.quota - L.kills - alive;
  dirT = Math.max(0.35, 1.25 - lv * 0.08) * (L.phase === 'boss' ? 2.2 : 1) * (L.survive ? 0.6 : 1);
  if (alive >= cap || (remaining <= 0 && L.phase === 'fight')) return;
  const z = freeZombie(); if (!z) return; const p = spawnPoint(tmp); if (!p) return;
  const beh = pickType(L.def.mix); z.spawn(p.clone(), beh, { rise: !L.def.env.indoor && Math.random() < 0.3 });
}
function spawnMinion(kind, pos, hp) {
  let m = minions.find(m => !m.alive && m.kind === kind); if (!m) { if (minions.filter(m => m.kind === kind).length > 20) return; m = new Minion(kind); minions.push(m); Z.hittables.push(m); }
  m.spawn(new THREE.Vector3(pos.x, 0, pos.z), hp);
}
// ───────────────────────────── combat events
function addFingers(n, pos) {
  n = Math.max(1, Math.round(n)); G.run.fingers += n; S.data.fingers += n; bump('chipf');
  if (pos) { const s = project(tmp2.copy(pos).setY((pos.y || 0) + 1.9), E.camera); if (!s.behind) float(s.x, s.y, `+${n} ${FINGER.replace('<svg', '<svg width="18" height="18"')}`, 18); }
}
const FING = { walker: 2, runner: 2, brute: 6, spitter: 3, shusher: 3, snatcher: 4, boss: 0 };
function onKill(z, region, src, shotgunClose) {
  const L = G.level; if (!L) return;
  if (z.reserved || z.beh === 'boss') { if (L.boss && L.boss.z === z) bossDefeated(); return; }
  L.kills++; G.run.kills++; S.data.stats.kills++; if (region === 'head') { G.run.heads++; S.data.stats.headshots++; }
  let f = (FING[z.beh] || 2) + (region === 'head' ? 2 : 0) + (shotgunClose ? 1 : 0); f *= 1 + G.levelIdx * 0.1; addFingers(f, z.pos);
  if (z.carry > 0) { spawnPickup('burger', z.pos.x, z.pos.z, z.carry); z.carry = 0; say('SHAYLA', 'Burgers recovered, bitch!', 2.5, 2); }
  const dropA = 0.07 + (up('k_ammo') && G.kennedy.active ? 0.08 : 0); if (Math.random() < dropA && G.needsAmmo()) spawnPickup('ammo', z.pos.x, z.pos.z); else if (Math.random() < 0.035) spawnPickup('med', z.pos.x, z.pos.z);
  multi.n = multi.t > 0 ? multi.n + 1 : 1; multi.t = 1.4;
  if (multi.n === 3) { bark('multi', 2); toast('TRIPLE TRIAGE', '+5 bonus fingers', 1.6); addFingers(5); }
  else if (region === 'head') { bark('headshot', 1, 0.33); showRule(7); }
  else bark('kill', 1, 0.28);
  if (L.kills === 1 && G.levelIdx === 0) setTimeout(() => showRule(3), 1500);
  if (z.beh === 'spitter') showRule(4);
  if (!L.survive && L.callReady() && !L.callToasted) { L.callToasted = true; toast('📞 KENNEDY IS READY', I.touchMode ? 'Tap the blue phone button' : 'Press E (or the 📞 button) to call him', 3.2); sfx('phone'); }
  if (!L.survive && L.phase === 'fight' && L.kills >= L.quota) spawnBoss();
}
function spawnBoss() {
  const L = G.level; const def = L.def.boss; if (!def) return; L.phase = 'boss';
  const at = L.anc.bossAt; const b = makeBoss(def, at); L.boss = b; if (!b.z) Z.hittables.push(b);
  H.boss.style.display = 'block'; setText('bossn', def.name); sfx('roar', null, 1); A.intensity = 1;
  toast('BOSS INCOMING', def.name, 3, true); setTimeout(() => bark('boss', 3), 900); setTimeout(() => G.kennedy.active && G.kennedy.say(pick(KENNEDY.boss), 3, 2), 3500);
  if (def.kind === 'kweepie' || def.kind === 'mother') setTimeout(() => bark('kweepie', 3), 4500);
}
function bossDefeated() {
  const L = G.level; if (L.phase !== 'boss') return; L.phase = 'exit'; H.boss.style.display = 'none';
  addFingers(60 + G.levelIdx * 20, L.boss.pos); setTimeout(() => bark('bossDown', 3), 400); toast('BOSS DOWN', `+${60 + G.levelIdx * 20} fingers · get to the ${L.anc.exit ? L.anc.exit.label : 'exit'}`, 3.2);
  for (const m of minions) if (m.alive) m.pop(false); A.intensity = 0.4;
  if (L.def.id === 'sequoyah') setTimeout(() => { if (G.mode === 'play') levelComplete(); }, 2500);
}
function onPickup(p, who) {
  const dad = up('k_dad') && G.kennedy.active ? 1.5 : 1;
  if (p.type === 'burger') { const n = Math.round(p.value * dad); G.run.burgers += n; bump('chipb'); sfx('burger'); toast(`+${n} 🍔 STEAKBURGERS`, who === 'kennedy' ? 'Kennedy grabbed them (he ate one)' : 'For the reunion', 1.6); if (who === 'kennedy') G.kennedy.say(pick(KENNEDY.burger), 2.5, 1); else bark('pickupBurger', 1, 0.6); showRule(6); }
  else if (p.type === 'coke') { const n = Math.round(p.value * dad); G.run.cokes += n; bump('chipc'); sfx('coke'); toast(`+${n} 🥤 COKES`, 'Fizz-Ola, ice cold', 1.6); bark('pickupCoke', 1, 0.5); }
  else if (p.type === 'med') { G.player.heal(40); sfx('health'); toast('+40 HP', 'Self-care is a med kit', 1.4); }
  else if (p.type === 'ammo') { for (const k of ORDER) if (k !== 'pistol') { const w = G.player.wstats(k); G.player.ammo[k].res = Math.min(w.reserve, G.player.ammo[k].res + Math.ceil(w.reserve * 0.45)); } sfx('ammo'); toast('AMMO', 'Locked and loaded', 1.3); }
  else if (p.type === 'fingers') { addFingers(p.value || 15, p.pos); sfx('finger'); toast('A BOWL OF FINGERS', 'Gross. Lucrative.', 1.6); }
}
async function callKennedy() {
  const L = G.level; if (!L || !L.callReady() || G.mode !== 'play') return; L.kennedyCalled = true; sfx('phone');
  if (!S.data.seenKennedy && !G.autopilot) { await runCine('kennedy'); S.data.seenKennedy = true; save(); showHUD(true); I.enabled = true; }
  const a = L.anc.kennedy; const pl = G.player; let p = { x: a.x, z: a.z }; if (Math.hypot(a.x - pl.pos.x, a.z - pl.pos.z) > 20) { const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw); p = { x: pl.pos.x - fx * 3, z: pl.pos.z - fz * 3 }; }
  G.kennedy.arrive(p, pl.yaw); setTimeout(() => bark('kennedyArrive', 3), 2600);
  if (!S.data.owned.rifle) { pl.loaned = true; H.bswap.classList.add('glow'); toast('KENNEDY HAS JOINED', 'He tossed you "The Birthday One" for this shift · tap SWAP', 3.2); }
  else toast('KENNEDY HAS JOINED', 'Flannel. Rifle. Zero chill.', 2.6);
}
function onDeath() {
  G.mode = 'dead'; I.enabled = false; resetInput(); if (document.pointerLockElement) document.exitPointerLock(); A.intensity = 0.2; sfx('heart');
  const lines = ['Time of death... nope. Not today. Run it back.', "I've had worse shifts. Not many, but some.", 'Somebody page Kennedy. And a priest.', "Note to self: zombies don't respect triage."];
  setTimeout(() => {
    showHUD(false); screen(`<h1>FLATLINED</h1><p>“${pick(lines)}”</p><p style="font-size:16px;opacity:.8">You keep the ${G.run.fingers} fingers you earned. Food from this attempt is lost.</p><div class="menu"><button class="b" id="dretry">RETRY SHIFT</button><button class="b alt" id="dshop">VENDY'S</button><button class="b alt" id="dquit">TITLE</button></div>`, 'dead');
    save(); onClick('dretry', () => startLevel(G.levelIdx)); onClick('dshop', () => shopScreen(() => startLevel(G.levelIdx), 'RETRY SHIFT')); onClick('dquit', () => { cleanupLevel(); titleScreen(); });
  }, 1400);
}
function levelComplete() {
  const L = G.level; if (L.phase === 'done') return; L.phase = 'done'; G.mode = 'results'; I.enabled = false; resetInput(); if (document.pointerLockElement) document.exitPointerLock();
  S.data.burgers += G.run.burgers; S.data.cokes += G.run.cokes; if (!S.data.completed.includes(G.levelIdx)) S.data.completed.push(G.levelIdx); S.data.unlocked = Math.max(S.data.unlocked, Math.min(8, G.levelIdx + 1)); save();
  const after = async () => {
    if (L.def.id === 'sequoyah') { await runCine('finale'); }
    if (L.def.id === 'home') { const good = S.data.burgers >= 120 && S.data.cokes >= 120; cleanupLevel(); if (A.ctx) playMusic('ending'); await runCine(good ? 'reunion' : 'short'); S.data.endingSeen = good ? 'reunion' : 'short'; save(); titleScreen(); return; }
    const next = G.levelIdx + 1; shopScreen(() => startLevel(next), 'NEXT SHIFT ▸');
  };
  setTimeout(() => {
    showHUD(false);
    screen(`<div class="panel results"><h3>${L.def.shift} — CLEARED</h3>
      Kills: <b>${G.run.kills}</b> · Headshots: <b>${G.run.heads}</b><br>Fingers earned: <b>${G.run.fingers}</b><br>
      Steakburgers hauled: <b>${G.run.burgers}</b> · Cokes hauled: <b>${G.run.cokes}</b><br>
      Reunion haul: <b>🍔 ${S.data.burgers}/120 · 🥤 ${S.data.cokes}/120</b>
      <div class="shopfoot"><button class="b" id="rnext">${L.def.id === 'home' ? 'THE REUNION ▸' : L.def.id === 'sequoyah' ? 'CONTINUE ▸' : "VENDY'S ▸"}</button></div></div>`);
    onClick('rnext', after); if (G.autopilot) setTimeout(() => { if ($s('rnext')) after(); }, 400);
  }, 900);
}
function pause(on) {
  if (on && G.mode !== 'play') return; if (!on && G.mode !== 'paused') return;
  if (on) {
    G.mode = 'paused'; I.enabled = false; resetInput(); if (document.pointerLockElement) document.exitPointerLock(); suspendAudio(false);
    const draw = () => { screen(`<div class="panel"><h3>PAUSED</h3><div class="menu" style="flex-direction:column"><button class="b" id="presume">RESUME</button><button class="b alt" id="pset">SETTINGS</button><button class="b alt" id="prestart">RESTART SHIFT</button><button class="b alt" id="pquit">QUIT TO TITLE</button></div></div>`); onClick('presume', () => pause(false)); onClick('pset', () => settingsScreen(() => { G.mode = 'paused'; draw(); })); onClick('prestart', () => startLevel(G.levelIdx)); onClick('pquit', () => { cleanupLevel(); titleScreen(); }); };
    draw();
  } else { screen(''); G.mode = 'play'; I.enabled = true; }
}
// ───────────────────────────── per-frame
function frame(dt) {
  if (cineActive()) { cineTick(dt); hudTick(dt); trackFrame(dt); return; }
  if (G.mode === 'title' || G.mode === 'menu' || (G.mode === 'shop' && !G.world)) { renderTitle(dt); trackFrame(dt); return; }
  if (G.mode === 'play') { const n = G.substeps || 1; for (let k = 0; k < n && G.mode === 'play'; k++) update(dt); }
  else if (G.mode === 'dead' || G.mode === 'results') { updateZombies(dt * 0.3); updateFX(dt * 0.3); }
  if (G.world && G.mode !== 'loading') { if (G.env) followSun(); render(); }
  else if (G.mode === 'shop') renderTitle(dt);
  hudTick(dt); trackFrame(dt);
}
function followSun() { const s = G.env.sun, p = G.player.pos; s.position.set(p.x + G.env.dir.x * 40, G.env.dir.y * 40, p.z + G.env.dir.z * 40); s.target.position.set(p.x, 0, p.z); }
function update(dt) {
  G.time += dt; const L = G.level; L.t += dt; barkCd -= dt; lowHpT -= dt; multi.t -= dt;
  pollKeyboard(); if (G.autopilot) autopilot(dt);
  const p = G.player.update(dt); if (p.pause) { pause(true); return; }
  { const pp = G.player.pos; for (const z of Z.list) { if (!z.alive || z.dead || z.rise > 0.3 || z.hold) continue; const dx = pp.x - z.pos.x, dz = pp.z - z.pos.z, d2 = dx * dx + dz * dz, rr = 0.36 + 0.3 * z.scale; if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2), k = (rr - d) / d; pp.x += dx * k; pp.z += dz * k; } } G.world.collide(pp, 0.35, 0.1, 1.7); }
  G.kennedy.update(dt); updateZombies(dt); if (L.boss && L.boss.update) L.boss.update(dt); for (const m of minions) m.update(dt);
  updatePickups(dt); updateFX(dt, G.world); for (const u of G.world.updaters) u(dt, G.time);
  if (!G.noDirector) director(dt);
  // survival level
  if (L.survive && L.phase === 'fight') { L.timeLeft -= dt; if (L.timeLeft <= 0) { L.timeLeft = 0; L.phase = 'exit'; toast('YOU SURVIVED', 'The reunion is ON', 2.5); for (const z of Z.list) if (z.alive && !z.dead) z.damage(9999, 'head', null, null, 'end'); setTimeout(levelComplete, 1500); } }
  // exit
  if (L.phase === 'exit' && L.anc.exit && L.def.id !== 'sequoyah') { const e = L.anc.exit; if (Math.hypot(G.player.pos.x - e.x, G.player.pos.z - e.z) < 2.6) levelComplete(); }
  // kweepie sightings (hospital)
  if (kweepieProp && kweepieProp.visible) { const d = Math.hypot(G.player.pos.x - kweepieProp.position.x, G.player.pos.z - kweepieProp.position.z); kweepieProp.rotation.y = Math.atan2(G.player.pos.x - kweepieProp.position.x, G.player.pos.z - kweepieProp.position.z); if (d < 6.5) { sfx('giggle', kweepieProp.position, 1); bark('kweepie', 2); showRule(8); for (let i = 0; i < 20; i++) particle(tmp.copy(kweepieProp.position).setY(0.3), tmp2.set(rand(-2, 2), rand(0, 3), rand(-2, 2)), new THREE.Color(1, 0.5, 0.8), 0.06, 0.7, 1); kweepieProp.visible = false; L.kweepieI++; L.kweepieT = 25; } }
  else if (kweepieProp && (L.kweepieT -= dt) <= 0) placeKweepie();
  // Kelly cameo (Old Main)
  if (kellyNpc) { kellyNpc.mixer.update(dt); if (!kellyNpc.met && Math.hypot(G.player.pos.x - kellyNpc.root.position.x, G.player.pos.z - kellyNpc.root.position.z) < 5) { kellyNpc.met = true; say('KELLY', "Hiii! I brought snacks AND ammo! Don't ask where I got the ammo. Also I'm so sorry about the doll.", 5, 3); const k = kellyNpc.root.position; spawnPickup('ammo', k.x + 1.2, k.z - 1); spawnPickup('coke', k.x - 1, k.z - 1.2, 5); spawnPickup('med', k.x + 0.2, k.z - 1.8); setTimeout(() => say('SHAYLA', 'Kelly, I love you, but after this I am going to fucking kill you.', 4, 3), 5200); showRule(5); } }
  A.intensity = L.phase === 'boss' ? 1 : clamp(0.25 + aliveCount() / 14, 0.25, 0.9);
  updateHUD(dt);
}
function updateHUD(dt) {
  const pl = G.player, L = G.level; const f = pl.hp / pl.maxHp;
  setStyle('hpbar', 'width', (f * 100).toFixed(1) + '%'); H.monitor.classList.toggle('low', f < 0.3); H.lowhp.style.opacity = f < 0.3 ? 1 : 0; H.lowhp.style.display = f < 0.3 ? 'block' : 'none';
  setText('bpm', String(Math.round(78 + (1 - f) * 70 + A.intensity * 30)));
  H.bloodv.style.opacity = Math.max(0, pl.hurtT * 1.6, f < 0.3 ? 0.35 : 0);
  const k = G.kennedy; setStyle('kbar', 'display', k.active ? 'flex' : 'none'); if (k.active) setStyle('khp', 'width', (k.down ? 0 : k.hp / k.maxHp * 100).toFixed(0) + '%');
  if (L.survive) { const tl = Math.ceil(L.timeLeft); setText('objt', L.def.obj.toUpperCase()); setText('objs', L.phase === 'fight' ? `Survive ${Math.floor(tl / 60)}:${String(tl % 60).padStart(2, '0')}` : 'Survived!'); setStyle('progv', 'width', ((1 - L.timeLeft / L.survive) * 100).toFixed(1) + '%'); }
  else { setText('objt', L.def.obj.toUpperCase()); setText('objs', L.phase === 'fight' ? `${L.kills} / ${L.quota} zombies` : L.phase === 'boss' ? 'Kill the boss!' : `Get to the ${L.anc.exit ? L.anc.exit.label : 'exit'}`); setStyle('progv', 'width', (Math.min(1, L.kills / L.quota) * 100).toFixed(1) + '%'); }
  setStyle('halflbl', 'display', L.kennedyCalled ? 'none' : 'block');
  if (L.phase === 'boss' && L.boss) { setStyle('bossv', 'width', (Math.max(0, L.boss.hp / L.boss.maxHp) * 100).toFixed(1) + '%'); }
  setText('fingers', String(S.data.fingers)); setText('burgers', `${S.data.burgers + G.run.burgers}/120`); setText('cokes', `${S.data.cokes + G.run.cokes}/120`);
  const w = pl.weapon, ws = pl.wstats(w), a = pl.ammo[w]; setText('mag', String(a.mag)); setText('res', a.res === Infinity ? ' / ∞' : ` / ${a.res}`); setText('wname', ws.name); H.ammo.classList.toggle('reloading', pl.reloading > 0);
  H.autofire.classList.toggle('on', !!S.data.settings.autofire); setText('autofire', S.data.settings.autofire ? 'AUTO-FIRE ●' : 'AUTO-FIRE ○');
  const call = L.callReady(); H.bmelee.classList.toggle('call', call); setStyle('bedpanico', 'display', call ? 'none' : ''); setStyle('callico', 'display', call ? '' : 'none'); setText('meleelbl', call ? 'Call Kennedy' : 'Bedpan');
  H.xh.classList.toggle('hit', !!pl.lockTarget);
  if (pl.lockTarget && pl.lockTarget.t) { const s = project(pl.lockTarget.t.aimPoint(tmp), E.camera); if (!s.behind) { H.lock.style.display = 'block'; H.lock.style.transform = `translate(${s.x - 26}px,${s.y - 26}px)`; } else H.lock.style.display = 'none'; } else H.lock.style.display = 'none';
  if (L.phase === 'exit' && L.anc.exit && L.def.id !== 'sequoyah') { const e = L.anc.exit; const s = project(tmp.set(e.x, 1.6, e.z), E.camera); let x = s.x, y = s.y; if (s.behind) { x = innerWidth - x; y = innerHeight - 40; } x = clamp(x, 40, innerWidth - 40); y = clamp(y, 60, innerHeight - 60); H.marker.style.display = 'block'; H.marker.style.left = x + 'px'; H.marker.style.top = y + 'px'; setText('marker', `${e.label} · ${Math.round(Math.hypot(G.player.pos.x - e.x, G.player.pos.z - e.z))}m`); }
  else H.marker.style.display = 'none';
  if (pl.loaned && pl.weapon === 'rifle') H.bswap.classList.remove('glow');
}
// ───────────────────────────── autopilot (automated playtesting) + test hooks
function autopilot(dt) {
  const pl = G.player, L = G.level; I.move.x = I.move.y = 0; I.sprint = false;
  if (pl.hp < pl.maxHp * 0.5) pl.hp = pl.maxHp; // test bot is immortal-ish; we test flow, not skill
  if (L.callReady()) I.pressed.call = true;
  let goal = null; if (L.phase === 'exit' && L.anc.exit) goal = L.anc.exit;
  else { let best = 1e9; for (const p of P.list) if (p.alive && (p.type === 'burger' || p.type === 'coke' || p.type === 'fingers')) { const d = Math.hypot(p.pos.x - pl.pos.x, p.pos.z - pl.pos.z); if (d < best) { best = d; goal = p.pos; } } }
  const t = pl.findTarget(Math.PI); // nearest visible target
  if (t) { pl.yaw += angDiff(pl.yaw, t.yaw) * Math.min(1, dt * 10); pl.pitch += (t.pitch - pl.pitch) * Math.min(1, dt * 10); I.fire = t.ang < 0.12; }
  else { I.fire = false; if (!goal) { // wander toward the nearest zombie/boss via flow field
    let best = null, bd = 1e9; for (const z of [...Z.list.filter(z => z.alive && !z.dead), ...Z.hittables.filter(h => h.alive)]) { const d = z.pos.distanceTo(pl.pos); if (d < bd) { bd = d; best = z; } } if (best) goal = best.pos; } }
  if (goal) { const dx = goal.x - pl.pos.x, dz = goal.z - pl.pos.z; const d = Math.hypot(dx, dz); if (d > 1.0) { let mx = dx / d, mz = dz / d; G.world.flowFrom(goal.x, goal.z); const fd = { x: 0, z: 0 }; if (!G.world.los(tmp.set(pl.pos.x, 0.3, pl.pos.z), tmp2.set(goal.x, 0.3, goal.z)) && G.world.flowDir(pl.pos.x, pl.pos.z, fd)) { mx = fd.x; mz = fd.z; } G.world.flowFrom(pl.pos.x, pl.pos.z);
    if (!t) { pl.yaw += angDiff(pl.yaw, Math.atan2(-mx, -mz)) * Math.min(1, dt * 6); pl.pitch *= 0.9; }
    const fx = -Math.sin(pl.yaw), fz = -Math.cos(pl.yaw), rx = Math.cos(pl.yaw), rz = -Math.sin(pl.yaw); I.move.y = mx * fx + mz * fz; I.move.x = mx * rx + mz * rz; } }
  const w = pl.weapon; if (pl.ammo[w].mag === 0 && pl.ammo[w].res === 0) I.pressed.swap = true;
}
function testHooks() {
  return {
    G, S, LEVELS, startLevel, titleScreen, Z, E, P,
    state: () => ({ mode: G.mode, level: G.levelIdx, phase: G.level && G.level.phase, kills: G.level && G.level.kills, quota: G.level && G.level.quota, hp: G.player && Math.round(G.player.hp), fps: Math.round(E.fps), dyn: E.dynScale, alive: aliveCount(), burgers: S.data.burgers, cokes: S.data.cokes, run: G.run, kennedy: G.kennedy && G.kennedy.active, boss: G.level && G.level.boss ? Math.round(G.level.boss.hp) : null, timeLeft: G.level && G.level.timeLeft }),
    autopilot(on = true) { G.autopilot = on; G.autoSkipCine = on ? 300 : 0; }, autoSkip(ms) { G.autoSkipCine = ms; },
    skipCine() { const e = document.getElementById('cineskip'); if (e) e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); },
    click(id) { const e = document.getElementById(id); if (e) e.click(); return !!e; },
    killAll() { for (const z of Z.list) if (z.alive && !z.dead && !z.reserved) z.damage(99999, 'head', null, null, 'test'); },
    toBoss() { const L = G.level; if (L && L.phase === 'fight' && !L.survive) { L.kills = L.quota - 1; } },
    hurtBoss(f = 0.5) { const b = G.level && G.level.boss; if (!b) return; if (b.z) { b.z.invuln = false; if (b.orbs) b.orbs.forEach(o => o.damage(9999)); b.z.damage(b.z.maxHp * f, 'chest', null, null, 'test'); } else b.damage(b.maxHp * f, 'chest', null, null); },
    spawn(beh = 'walker', x, z, opt = {}) { const zz = freeZombie(); if (zz) zz.spawn(new THREE.Vector3(x, 0, z), beh, opt); return !!zz; }, noDirector(on = true) { G.noDirector = on; },
    tp(x, z) { G.player.pos.set(x, 0, z); }, look(yaw, pitch = 0) { G.player.yaw = yaw; G.player.pitch = pitch; },
    cine: name => runCine(name), pause, callKennedy, levelComplete, fast(on) { G.fast = on; }, substeps(n) { G.substeps = n; },
  };
}
