// Cutscenes: tiny 3D sets, real character close-ups, subtitles, tap-to-advance. Also the endings.
import * as THREE from 'three';
import { E } from './engine.js';
import { World, T, std, texMat } from './world.js';
import { PM, truck, table, cooler, stringLights, building, car, lamp, pine, tree } from './props.js';
import { makeCharacter } from './chars.js';
import { makeKweepie } from './kweepie.js';
import { H } from './hud.js';
import { sfx, playMusic } from './audio.js';
import { canvasTex, rand, clamp } from './util.js';
const { col, metal, emis } = PM;
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const COLORS = { SHAYLA: '#7dffa8', KENNEDY: '#8fd0ff', KELLY: '#ff8a8a', KAYLEIGH: '#9fb8ff', KAMBREE: '#ffb0e0', KWEEPIE: '#ff9ad5', INTERCOM: '#ffd84a', ALL: '#ffd84a' };
const actors = {};
export function actor(key) {
  if (key === 'doll' || key === 'dollBig') { if (!actors[key]) { const r = makeKweepie(key === 'doll' ? 0.42 : 0.8, true); r.traverse(o => { if (o.isPointLight) o.intensity = 0.15; }); actors[key] = { root: r, doll: true }; } return actors[key]; }
  if (!actors[key]) actors[key] = makeCharacter(key); return actors[key];
}
// ───────── sets
function skyTex(top, bot) { return canvasTex(8, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, top); g.addColorStop(0.6, bot); g.addColorStop(1, bot); x.fillStyle = g; x.fillRect(0, 0, w, h); }); }
const SETS = {
  station(W, sc) {
    sc.background = new THREE.Color('#1a2026');
    W.floor(-8, 8, -8, 8, texMat('hospTile', T.tile('#dfe3dc', '#c9cfc8')), 1.2);
    W.box(0, 0, -2.6, 12, 3.2, 0.2, texMat('hospWall2', T.paint('#a9c9c4')), { tile: 2 }); W.box(-4.5, 0, 0, 0.2, 3.2, 8, texMat('hospWall', T.paint('#d7e0dc')), { tile: 2 });
    W.box(0, 0, -0.9, 3.4, 1.05, 0.5, std('desk', { color: 0x6f8f9a, roughness: 0.6 })); W.box(0, 1.05, -0.9, 3.6, 0.05, 0.7, std('desktop', { color: 0xe6e2d8 }));
    W.box(-1.0, 1.1, -1.05, 0.5, 0.36, 0.05, std('mon', { color: 0x111111, roughness: 0.3 })); W.box(-1.0, 1.13, -1.02, 0.44, 0.28, 0.01, emis('#3ad1a0', 1.2), { collide: false });
    W.box(0.7, 1.1, -0.9, 0.24, 0.02, 0.32, std('clip', { color: 0xb08850 }));
    W.sign(["NURSES' STATION", 'Please be patient (zombies, especially)'], 0, 2.5, -2.48, 3.2, 0.6, { bg: '#16485a', fg: '#fff', box: 0.05 });
    W.sign(['RULE #5', 'Never accept gifts from Kelly'], -4.38, 1.7, -1.4, 1.0, 0.6, { ry: Math.PI / 2, bg: '#fff8dc', colors: ['#b0123a', '#222'] });
    W.box(0, 3.1, 0, 1.4, 0.05, 0.35, emis('#f4fbff', 2.2), { collide: false });
    const l1 = new THREE.PointLight(0xe8f2ff, 9, 10, 1.4); l1.position.set(0, 2.9, 0.6); W.group.add(l1); W.flicker = l1;
    return { hemi: ['#dfe9ff', '#3a3430', 0.8], key: ['#ffffff', 1.4, 2, 4, 4], exposure: 1.0 };
  },
  parking(W, sc) {
    sc.background = skyTex('#2a1f4a', '#ff8a4a'); sc.fog = new THREE.Fog('#6a4a5a', 20, 70);
    W.floor(-30, 30, -30, 30, texMat('asph', T.asphalt()), 4);
    building(W, 0, -14, 16, 8, 5, { color: '#f2efe6', frame: '#16a59e', cols: 6, rows: 1, lit: 0.8, glow: true, trim: '#16a59e' });
    W.sign(["FREDDO'S", 'FROZEN CUSTARD & STEAKBURGERS'], 0, 6.2, -9.7, 7, 1.6, { bg: '#16a59e', colors: ['#ffd43b', '#fff'], neon: 1.2, box: 0.2 });
    car(W, 2.5, 1, 0.3, '#3a6ab0'); lamp(W, -5, -2, 4.5, true, 0xffd8a0);
    return { hemi: ['#ffc8a0', '#2a2030', 0.7], key: ['#ff9a5a', 1.8, -10, 6, -4], exposure: 1.05 };
  },
  phone(W, sc) { // Kelly's apartment
    sc.background = new THREE.Color('#2a1a24');
    W.floor(-6, 6, -6, 6, texMat('carpK', T.carpet('#5a3a4a', '#d8a0b8')), 1.5); W.box(0, 0, -1.6, 8, 3, 0.2, texMat('kwall', T.paint('#e8c8d4')), { tile: 2 });
    W.sign(['LIVE · LAUGH · LOOT', '(estate sales)'], 0.9, 1.9, -1.48, 1.4, 0.5, { bg: '#fff', colors: ['#c0186a', '#555'] });
    W.box(-1.2, 0, -1.2, 1.2, 0.8, 0.5, texMat('dresser', T.wood('#8a6a4a'))); for (let i = 0; i < 4; i++) W.box(-1.6 + i * 0.27, 0.8, -1.2, 0.18, 0.22 + i * 0.03, 0.18, col(['#d8a0b8', '#8ab8d8', '#e8d070', '#a0d8a0'][i]));
    const l = new THREE.PointLight(0xffc8e0, 6, 8, 1.4); l.position.set(0.5, 2.2, 1); W.group.add(l);
    return { hemi: ['#ffe0ec', '#3a2030', 0.8], key: ['#ffd0e0', 1.2, 2, 3, 3], exposure: 1.0 };
  },
  truck(W, sc) {
    sc.background = skyTex('#05060c', '#1a1a2c'); sc.fog = new THREE.Fog('#10121c', 12, 50);
    W.floor(-30, 30, -30, 30, texMat('asph', T.asphalt()), 4);
    const t = truck(null, 0, -3.2, 0.5, '#3a3a3a'); W.add(t);
    for (const sx of [-0.7, 0.7]) { const s = new THREE.SpotLight(0xfff2d0, 40, 25, 0.5, 0.5, 1.4); s.position.set(-3.2 * 0 + sx, 1.0, 0); t.add(s); s.position.set(sx, 1.0, 2.7); s.target.position.set(sx * 2, 0, 12); t.add(s.target); const hl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.05), emis('#fff6d0', 3)); hl.position.set(sx, 1.0, 2.71); t.add(hl); }
    // the gun case
    const caseT = canvasTex(256, 128, (x) => { x.fillStyle = '#1a1a1a'; x.fillRect(0, 0, 256, 128); x.strokeStyle = '#555'; x.lineWidth = 6; x.strokeRect(4, 4, 248, 120); x.fillStyle = '#ffd84a'; x.font = "28px 'Black Ops One'"; x.textAlign = 'center'; x.fillText('THE COLLECTION', 128, 56); x.fillStyle = '#ff6060'; x.font = "600 22px 'Barlow Condensed'"; x.fillText('DO NOT TELL SHAYLA', 128, 92); });
    const cm = new THREE.MeshStandardMaterial({ map: caseT, roughness: 0.5 }); const dark = std('caseD', { color: 0x1a1a1a, roughness: 0.5 });
    const gcase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.12), [dark, dark, dark, dark, cm, dark]); gcase.castShadow = true; W.gcase = gcase;
    lamp(W, 6, -6, 4.5, true, 0xffc890);
    const fill = new THREE.PointLight(0xffd8b0, 14, 12, 1.5); fill.position.set(3, 2.5, 3); W.group.add(fill);
    gcase.position.set(0.15, 0.21, 1.25); gcase.rotation.set(0, 0.85, 0);
    return { hemi: ['#8a9ac0', '#202028', 1.0], key: ['#c8d0ff', 1.6, 4, 8, 6], exposure: 1.3 };
  },
  overlook(W, sc) {
    sc.background = skyTex('#3a4a8a', '#ffb070'); sc.fog = new THREE.Fog('#d0a090', 30, 120);
    W.floor(-30, 30, -30, 30, texMat('overFloor', T.concrete('#a8a49a')), 3);
    W.box(0, 0, -3, 14, 1.1, 0.8, texMat('overStone', T.stone('#8a847a')), { tile: 2 });
    for (let i = 0; i < 18; i++) pine(W, rand(-20, 20), rand(4, 20), rand(1.2, 1.8));
    const co = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.45), std('cooler', { color: 0x1f6fbf, roughness: 0.4 })); body.position.y = 0.225; co.add(body);
    const tape = std('tape', { color: 0x9a9a9a, roughness: 0.4, metalness: 0.4 }); for (const x of [-0.25, 0, 0.25]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.47, 0.47), tape); t.position.set(x, 0.24, 0); co.add(t); }
    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.08, 0.47), std('coolerLid', { color: 0xf2f2f2 })); lid.position.y = 0.5; co.add(lid); co.position.set(0.3, 0, 0.6); W.add(co); W.cooler = co;
    return { hemi: ['#ffd0b0', '#2a2a3a', 0.9], key: ['#ffb070', 2.4, -2, 3, -8], exposure: 1.0 };
  },
  backyard(W, sc) {
    sc.background = skyTex('#4a6ad0', '#ffc890'); sc.fog = new THREE.Fog('#e0c0a0', 25, 80);
    W.floor(-30, 30, -30, 30, texMat('grassH', T.grass()), 3);
    building(W, 0, -10, 16, 6, 6, { color: '#c8b8a0', frame: '#ffffff', cols: 5, rows: 2, lit: 0.5, trim: '#5a4a3a' });
    table(W, 0, 0, 3.2, 1.3, texMat('picnic', T.wood('#9a6a3a')));
    const bun = std('bun', { color: 0xc88a3a, roughness: 0.6 }); for (let i = 0; i < 12; i++) { const g = new THREE.SphereGeometry(0.07, 8, 6, 0, 6.3, 0, 1.6); g.translate(-1.3 + (i % 6) * 0.5, 0.77, -0.2 + Math.floor(i / 6) * 0.35); W.geo(g, bun); }
    for (let i = 0; i < 8; i++) W.cyl(-1.2 + i * 0.35, 0.76, 0.45, 0.035, 0.03, 0.13, col(i % 2 ? '#c8102e' : '#ffffff'), { seg: 8 });
    stringLights(W, -6, -3, 6, -3, 3.0, 16); stringLights(W, -6, -5.5, 6, -5.5, 3.4, 16);
    cooler(W, -2.6, 1.2, 0.3); for (const [x, z] of [[-9, -4], [9, -5], [-8, 6]]) tree(W, x, z, 1.2, { color: 0x3a6a2a });
    W.sign(['WELCOME HOME SHAYLA!', 'FAMILY REUNION · love, the family (and Kweepie)'], 0, 3.6, -6.9, 5, 1.0, { bg: '#fff3c0', colors: ['#c22', '#333'], box: 0.05 });
    return { hemi: ['#fff4e6', '#4a4030', 1.1], key: ['#fff0dc', 2.3, 5, 7, 8], exposure: 1.0 };
  },
};
// ───────── scripts. Each shot: { set, cast: {key:[x,z,yaw,anim]}, cam, lines:[[who,text]], card, fx }
const SH = { x: 0, z: 0 };
export const CINES = {
  intro: [
    // Kelly drops by with a surprise. Slow, warm, then the goodbye (laundry + cleaning), THEN the outbreak.
    { set: 'station', card: ['OZARK MERCY REGIONAL', 'Night shift · 6:58 PM · two days before the family reunion'], cast: { shayla: [-0.2, -1.6, 0.15, 'Idle_Loop'], kelly: [1.0, 0.25, -2.6, 'Idle_Talking_Loop'] }, cam: { pos: [-2.2, 1.7, 2.6], pos2: [-1.7, 1.6, 2.0], look: [0.3, 1.2, -0.7] }, lines: [['KELLY', "Knock knock! Don't mind me, I'm just dropping by real quick. I brought you a little surprise!"], ['SHAYLA', 'Kelly! Hi! You drove all the way out here? I clock in in two minutes.']] },
    { cam: { close: 'kelly', dist: 0.8, side: -0.15 }, talk: 'kelly', lines: [['KELLY', "I know, I know. But you've been working so hard, and when I saw her I thought, 'Oh, Shayla NEEDS this.'"]] },
    { cam: { close: 'shayla', dist: 0.75, side: 0.18 }, talk: 'shayla', lines: [['SHAYLA', "Aww, Kelly. You didn't have to get me anything."]] },
    { cam: { close: 'kelly', dist: 0.8, side: -0.15 }, talk: 'kelly', lines: [['KELLY', "Hush. Okay, close your eyes... no peeking... ta-daaa!"]] },
    { cast: { shayla: [-0.2, -1.6, 0.15, 'Idle_Loop'], kelly: [1.0, 0.25, -2.6, 'Idle_Talking_Loop'], doll: [0.45, -0.8, 0.25] }, cam: { close: 'doll', dist: 0.55, side: -0.05, h: 0.02 }, lines: [['KELLY', "Her name's Kweepie! Found her at an estate sale. The lady said she's 'a little bit cursed,' but I got her down to four dollars."], ['KWEEPIE', '...hee hee hee.'], ['KELLY', 'And I sewed her a teeny pair of scrubs so you two match!']], fx: 'giggle' },
    { cam: { close: 'shayla', dist: 0.75, side: 0.18 }, talk: 'shayla', lines: [['SHAYLA', 'Kelly. Why the fuck does it have red eyes.']] },
    { cam: { close: 'kelly', dist: 0.8, side: -0.15 }, talk: 'kelly', lines: [["KELLY", "That's called CHARACTER, sweetie. She'll keep you company on the night shift."]] },
    { cam: { close: 'shayla', dist: 0.75, side: 0.18 }, talk: 'shayla', lines: [['SHAYLA', "Okay... that's honestly really sweet. Weird as hell. But sweet. Thank you, Kelly."]] },
    { cam: { close: 'kelly', dist: 0.8, side: -0.15 }, talk: 'kelly', lines: [['KELLY', "Oh, you're so welcome, honey! The lady did say keep her in a cooler at night. I didn't ask."], ['KELLY', "Well, I'd better scoot. I've got a mountain of laundry waiting at home, and that house isn't gonna clean itself!"]] },
    { cam: { close: 'shayla', dist: 0.75, side: 0.18 }, talk: 'shayla', lines: [['SHAYLA', 'Go, go! Thanks for stopping by. Love you, drive safe!']] },
    { cam: { pos: [-2.2, 1.7, 2.6], pos2: [-1.9, 1.65, 2.3], look: [0.3, 1.2, -0.7] }, lines: [['KELLY', "Love you too! Have a good shift! Don't let her out of the cooler!"]] },
    // Kelly has left: only Shayla and the doll remain. Now the outbreak starts.
    { cast: { shayla: [-0.2, -1.6, 0.15, 'Idle_Loop'], doll: [0.45, -0.8, 0.25] }, cam: { pos: [2.4, 1.5, 1.8], pos2: [2.1, 1.45, 1.5], look: [0.0, 1.2, -0.9] }, fx: 'flicker', lines: [['INTERCOM', 'Code... Code Brown. All floors. Code Brown. Oh God, it’s biting—'], ['KWEEPIE', 'HEE HEE HEE HEE.']] },
    { cam: { close: 'shayla', dist: 0.75, side: 0.18 }, talk: 'shayla', lines: [['SHAYLA', "Oh, you have GOT to be fucking kidding me."], ['SHAYLA', "I'm not a hero. I'm a nurse with a twelve-hour shift and zero fucks left."]] },
    { cam: { close: 'shayla', dist: 0.62, side: -0.12 }, talk: 'shayla', anim: { shayla: 'Pistol_Idle_Loop' }, lines: [['SHAYLA', 'Glock’s in the drawer. Fine. Let’s clock in, motherfuckers.']], card: ['PARABELLUM', 'If you want peace, prepare for war.'] },
  ],
  kellyCall: [
    { set: 'parking', card: ["FREDDO'S FROZEN CUSTARD & STEAKBURGERS", 'Shift 2 · 8:40 PM'], cast: { shayla: [0, 2, Math.PI * 0.1, 'Idle_Talking_Loop'] }, cam: { pos: [-2.4, 1.5, 5.4], pos2: [-1.8, 1.5, 4.6], look: [0, 1.4, 0] }, lines: [['KELLY', "(phone) Okay so don't be mad, but the doll's gone and the news says the dead are rising at every place we've ever been."]] },
    { cam: { close: 'shayla', dist: 0.7, side: 0.2 }, talk: 'shayla', lines: [['SHAYLA', 'Every place WE’VE been? Kelly, what the fuck did you buy?']] },
    { set: 'phone', cast: { kelly: [0, 0, 0, 'Idle_Talking_Loop'] }, cam: { close: 'kelly', dist: 0.8, side: -0.18 }, talk: 'kelly', lines: [['KELLY', "Freddo's, the library, the farmers' market, Dickson... it's like a tour of our lives. But with zombies."], ['KELLY', "Also Kambree says the reunion is still on. She's bringing the pasta salad. Which is honestly scarier."]] },
    { set: 'parking', cast: { shayla: [0, 2, Math.PI * 0.1, 'Pistol_Idle_Loop'] }, cam: { close: 'shayla', dist: 0.65, side: -0.15 }, talk: 'shayla', lines: [['SHAYLA', "Then I'm getting one hundred and twenty steakburgers and one hundred and twenty Cokes to that reunion if I have to shoot my way through all of Fayetteville."]], card: ['THE HAUL', '120 🍔 steakburgers · 120 🥤 Cokes. The reunion depends on it.'] },
  ],
  kennedy: [
    { set: 'truck', card: ['BACKUP HAS ARRIVED', 'Kennedy · Flannel · Questionable judgment'], cast: { kennedy: [0.9, 0.4, 0.4, 'Idle_Loop'], shayla: [1.6, 3.6, Math.PI + 0.2, 'Pistol_Idle_Loop'] }, gcase: 'kennedy', cam: { pos: [4.5, 1.2, 4.5], pos2: [3.6, 1.3, 3.4], look: [0.6, 1.0, 0] }, fx: 'skid', lines: [['KENNEDY', "Babe! I came as fast as I could! I brought... a few things."]] },
    { cam: { close: 'kennedy', dist: 0.75, side: 0.18 }, talk: 'kennedy', lines: [['SHAYLA', 'Kennedy. How many guns are in that case.'], ['KENNEDY', "Define 'guns.'"]] },
    { cam: { close: 'shayla', dist: 0.7, side: -0.15 }, talk: 'shayla', lines: [['SHAYLA', 'KENNEDY.']] },
    { cam: { close: 'kennedy', dist: 0.68, side: -0.12 }, talk: 'kennedy', lines: [['KENNEDY', "...Eleven. But one of them's a gift, so it doesn't count. Surprise?"]] },
    { cam: { pos: [3.0, 1.5, 2.6], pos2: [2.6, 1.6, 2.2], look: [1.2, 1.2, 1.8] }, talk: 'shayla', lines: [['SHAYLA', 'Give me the tan one, get behind me, and if you die I will fucking kill you.'], ['KENNEDY', 'Yes ma’am. God, I love you.']] },
  ],
  finale: [
    { set: 'overlook', card: ['MOUNT SEQUOYAH', 'Sunrise'], cast: { shayla: [-0.6, 0.9, 0.3, 'Idle_Loop'], kennedy: [1.4, 1.2, -0.4, 'Pistol_Idle_Loop'] }, cam: { pos: [0.5, 1.4, 4.6], pos2: [0.4, 1.3, 3.6], look: [0.2, 0.8, 0] }, lines: [['SHAYLA', 'Duct tape. Cooler. Lid. Done.'], ['KWEEPIE', '(muffled) mmph hee hee mmph.']] },
    { cam: { close: 'kennedy', dist: 0.75, side: -0.15 }, talk: 'kennedy', lines: [['KENNEDY', 'Should we, like... throw it off the mountain?']] },
    { cam: { close: 'shayla', dist: 0.68, side: 0.15 }, talk: 'shayla', lines: [['SHAYLA', "No. We're giving it back to Kelly. With a bow on it."], ['KENNEDY', "That's evil. I love it."]] },
    { cam: { pos: [-1.5, 1.6, 4.0], pos2: [-1.2, 1.9, 5.2], look: [0.3, 1.0, 0] }, talk: 'shayla', lines: [['SHAYLA', 'Now. About that reunion. Somebody owes me a fucking steakburger.']] },
  ],
  reunion: [
    { set: 'backyard', card: ['THE REUNION', 'Sunday · 5:30 PM · Home'], cast: { kelly: [-1.45, -1.25, 0.25, 'Idle_Talking_Loop'], shayla: [-0.45, -1.3, 0, 'Idle_Loop'], kennedy: [0.55, -1.3, -0.12, 'Idle_Loop'], kambree: [1.55, -1.2, -0.3, 'Idle_Loop'], kayleigh: [2.35, 0.25, -1.25, 'Idle_Loop'] }, cam: { pos: [0.4, 2.2, 5.6], pos2: [0.3, 1.8, 4.4], look: [0.2, 1.1, -0.9] }, lines: [['ALL', '🍔 120/120 steakburgers · 🥤 120/120 Cokes · zero family members eaten.']] },
    { cam: { close: 'kambree', dist: 0.7, side: 0.12 }, talk: 'kambree', lines: [['KAMBREE', "These burgers are cold. And there's a pickle on mine. I SAID no pickles."], ['KAMBREE', 'And this Coke is FLAT.']] },
    { cam: { close: 'kayleigh', dist: 0.72, side: -0.12 }, talk: 'kayleigh', lines: [['KAYLEIGH', 'Kambree. She shot like four hundred zombies to get those.'], ['KAYLEIGH', "Also can we please never do Wilson Park at night again? I'm still finding glitter in my hair. Zombie glitter."]] },
    { cam: { close: 'shayla', dist: 0.7, side: 0.15 }, talk: 'shayla', lines: [['SHAYLA', 'Kambree, eat the fucking pickle or I put you in the cooler with the doll.'], ['KAMBREE', '...Fine. It’s actually good. Shut up.']] },
    { cam: { close: 'kennedy', dist: 0.72, side: -0.15 }, talk: 'kennedy', lines: [['KENNEDY', 'Babe, I told the guys at the gun show about you. They want an autograph. And maybe a calendar.']] },
    { cam: { close: 'kelly', dist: 0.85, side: 0.12, h: 0.06 }, talk: 'kelly', peace: true, lines: [['KELLY', "Group photo! Everybody say 'PARABELLUM!' ✌️"], ['KELLY', 'Ooh, also! Who wants a present? I found another one!']] },
    { cam: { pos: [0.4, 1.8, 4.6], pos2: [0.2, 2.4, 6.6], look: [0.2, 1.5, -1.0] }, fx: 'fireworks', dance: true, lines: [['ALL', 'NO.'], ['SHAYLA', 'Best fucking reunion ever. Love you idiots.']], card: ['THE END', 'Welcome home, Shayla ♥'] },
  ],
  short: [
    { set: 'backyard', card: ['THE REUNION', 'Short Order Ending'], cast: { kelly: [-1.45, -1.25, 0.25, 'Idle_Loop'], shayla: [-0.45, -1.3, 0, 'Idle_Loop'], kennedy: [0.55, -1.3, -0.12, 'Idle_Loop'], kambree: [1.55, -1.2, -0.3, 'Idle_Talking_Loop'], kayleigh: [2.35, 0.25, -1.25, 'Idle_Loop'] }, cam: { pos: [0.4, 2.2, 5.6], pos2: [0.3, 1.8, 4.4], look: [0.2, 1.1, -0.9] }, lines: [['KAMBREE', "That's it? That's the haul? For the WHOLE family?"]] },
    { cam: { close: 'shayla', dist: 0.7, side: 0.15 }, talk: 'shayla', lines: [['SHAYLA', 'I fought a thirty-foot doll, Kambree.'], ['KAYLEIGH', "She's not wrong though. I got half a bun."]] },
    { cam: { close: 'kennedy', dist: 0.72, side: -0.15 }, talk: 'kennedy', lines: [['KENNEDY', '...We could go back out? I still have nine guns in the truck.']], card: ['SHORT ORDER ENDING', 'Replay shifts and haul 120 🍔 + 120 🥤 for the real reunion.'] },
  ],
};
// ───────── runner
const C = { active: false };
const fw = { pts: null, n: 700 };
export function cineActive() { return C.active; }
export function cineInfo() { return C.active ? { name: C.name, shot: C.i, line: C.li, who: C.lineWho, txt: C.lineTxt, lineT: C.lineT } : null; }
export function playCine(name) {
  return new Promise(res => {
    const script = CINES[name]; C.active = true; C.script = script; C.i = -1; C.res = res; C.scene = new THREE.Scene(); C.cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.03, 200); C.setName = null; C.W = null; C.name = name;
    const el = document.createElement('div'); el.className = 'cine'; el.innerHTML = `<div class="bars"></div><div class="card" id="cinecard"></div><div class="line" id="cineline"><div class="who"></div><div class="txt"></div></div><div class="b small alt skip" id="cineskip">SKIP ▸▸</div><div class="tap">tap ▸</div>`;
    H.screens.appendChild(el); C.el = el;
    // tap advances one line; ignore taps in the first 0.6 s of a line so a double-tap can't skip two lines
    el.addEventListener('pointerdown', e => { if (e.target.id === 'cineskip') { finish(); return; } if (performance.now() - (C.lineAt || 0) < 600) return; advance(); });
    C.onKey = e => { if (e.code === 'Space' || e.code === 'Enter') advance(); if (e.code === 'Escape') finish(); }; addEventListener('keydown', C.onKey);
    nextShot();
  });
}
function buildSet(name) {
  if (C.W) { C.W.dispose(); C.scene.remove(C.W.group); }
  C.scene = new THREE.Scene(); const W = new World(C.scene); W.bounds = { minX: -30, maxX: 30, minZ: -30, maxZ: 30 };
  const env = SETS[name](W, C.scene); W.finalize(); C.W = W; C.setName = name;
  const hemi = new THREE.HemisphereLight(env.hemi[0], env.hemi[1], env.hemi[2]); C.scene.add(hemi);
  const key = new THREE.DirectionalLight(env.key[0], env.key[1]); key.position.set(env.key[2], env.key[3], env.key[4]); key.castShadow = E.q.shadows; key.shadow.mapSize.set(1024, 1024); const sc = key.shadow.camera; sc.left = sc.bottom = -6; sc.right = sc.top = 6; sc.near = 0.5; sc.far = 30; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; C.scene.add(key);
  const rim = new THREE.DirectionalLight('#bfd8ff', 0.7); rim.position.set(-3, 3, -4); C.scene.add(rim);
  C.exposure = env.exposure; C.flick = W.flicker; C.shotCast = {};
  if (W.gcase) C.scene.add(W.gcase);
}
function place(cast) {
  for (const k in C.shotCast) { const a = actor(k); a.root.removeFromParent(); }
  C.shotCast = {};
  for (const k in cast) {
    const [x, z, yaw, anim] = cast[k]; const a = actor(k); C.scene.add(a.root); a.root.position.set(x, 0, z); a.root.rotation.set(0, yaw, 0); a.root.visible = true; C.shotCast[k] = { anim };
    if (a.doll) { if (k === 'doll') a.root.position.y = 1.1; } else { for (const n in a.bone) a.bone[n].scale.set(1, 1, 1); a.mixer.stopAllAction(); a.cur = null; a.play(anim || 'Idle_Loop', 0); if (a.cur) a.cur.time = rand(0, 2); }
  }
}
function nextShot() {
  C.i++; if (C.i >= C.script.length) { finish(); return; }
  const s = C.script[C.i]; C.shot = s; C.t = 0; C.li = -1;
  if (s.set && s.set !== C.setName) { buildSet(s.set); }
  if (s.cast) place(s.cast);
  if (s.anim) for (const k in s.anim) actor(k).play(s.anim[k], 0.3);
  if (s.dance) for (const k in C.shotCast) { const a = actor(k); if (!a.doll) { a.play('Dance_Loop', 0.4, { speed: rand(0.9, 1.1) }); } }
  const card = C.el.querySelector('#cinecard'); if (s.card) { card.innerHTML = `${s.card[0]}<small>${s.card[1]}</small>`; card.style.opacity = 1; } else card.style.opacity = 0;
  if (s.fx === 'giggle') sfx('giggle', null, 1); if (s.fx === 'skid') { sfx('engine', null, 1); setTimeout(() => sfx('crash', null, 0.5), 300); } if (s.fx === 'fireworks') startFireworks();
  if (s.talk) { const a = actor(s.talk); if (!a.doll && !s.dance && !(s.anim && s.anim[s.talk])) a.play('Idle_Talking_Loop', 0.3); }
  setupCam(s); advance();
}
function headPos(k, out) { const a = actor(k); if (a.doll) return out.copy(a.root.position).add(V(0, 0.72 * a.root.scale.x, 0)); a.root.updateMatrixWorld(true); return a.bone.Head.getWorldPosition(out).add(V(0, 0.05 * a.root.scale.x, 0)); }
function setupCam(s) {
  const c = s.cam || {}; C.camDef = c;
  if (c.close) { const a = actor(c.close); const yaw = a.root.rotation.y; const f = V(Math.sin(yaw), 0, Math.cos(yaw)), r = V(Math.cos(yaw), 0, -Math.sin(yaw)); const hp = headPos(c.close, V()); const d = c.dist || 0.7;
    C.p0 = hp.clone().addScaledVector(f, d).addScaledVector(r, c.side || 0).add(V(0, c.h || 0.01, 0)); C.p1 = hp.clone().addScaledVector(f, d * 0.88).addScaledVector(r, (c.side || 0) * 0.9).add(V(0, c.h || 0.01, 0)); C.look = hp.clone().add(V(0, -0.035, 0)); C.fov = 30; C.track = c.close; }
  else { C.p0 = V(...c.pos); C.p1 = V(...(c.pos2 || c.pos)); C.look = V(...c.look); C.fov = 42; C.track = null; }
}
function advance() {
  const s = C.shot; if (!s) return; C.li++;
  if (C.li >= s.lines.length) { nextShot(); return; }
  const [who, txt] = s.lines[C.li]; const ln = C.el.querySelector('#cineline'); ln.querySelector('.who').textContent = who; ln.querySelector('.who').style.color = COLORS[who] || '#fff'; ln.querySelector('.txt').textContent = txt;
  // readable on a phone: at least 4.5 s per line (longer lines get more), tap to advance sooner
  C.lineT = Math.max(4.5, 2.2 + txt.length * 0.06); C.autoT = C.lineT; C.lineAt = performance.now(); C.lineWho = who; C.lineTxt = txt;
  if (who === 'KWEEPIE') sfx('giggle', null, 0.9);
  if (s.talk === undefined) { const k = who.toLowerCase(); if (C.shotCast[k] && !actor(k).doll && !s.dance) actor(k).play('Idle_Talking_Loop', 0.3); }
}
function finish() {
  if (!C.active) return; C.active = false; removeEventListener('keydown', C.onKey); C.el.remove();
  for (const k in C.shotCast) actor(k).root.removeFromParent();
  if (C.W) { if (C.W.gcase) C.W.gcase.removeFromParent(); C.W.dispose(); C.W = null; } if (fw.pts) { fw.pts.removeFromParent(); fw.pts = null; }
  C.setName = null; const r = C.res; C.res = null; r && r();
}
// peace sign: index + middle up, others curled, arm raised
const qa = new THREE.Quaternion();
function peacePose(a, k) {
  const b = a.bone; const rot = (bone, ax, ang) => { if (!bone) return; qa.setFromAxisAngle(ax, ang * k); bone.quaternion.multiply(qa); };
  rot(b.upperarm_r, V(0, 0, 1), -1.15); rot(b.upperarm_r, V(0, 1, 0), 0.5); rot(b.lowerarm_r, V(0, 0, 1), -1.6);
  for (const f of ['ring', 'pinky']) for (const i of ['01', '02', '03']) rot(b[`${f}_${i}_r`], V(0, 0, 1), 1.25);
  for (const f of ['index', 'middle']) rot(b[`${f}_01_r`], V(0, 1, 0), f === 'index' ? 0.18 : -0.18);
  rot(b.thumb_02_r, V(0, 0, 1), 0.9); rot(b.thumb_03_r, V(0, 0, 1), 0.9);
}
function startFireworks() {
  const n = fw.n; const g = new THREE.BufferGeometry(); const pos = new Float32Array(n * 3).fill(-999), colr = new Float32Array(n * 3); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
  fw.pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.32, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); fw.pts.frustumCulled = false; C.scene.add(fw.pts);
  fw.v = new Float32Array(n * 3); fw.life = new Float32Array(n); fw.head = 0; fw.t = 0;
}
function tickFireworks(dt) {
  if (!fw.pts) return; fw.t -= dt; const P = fw.pts.geometry.attributes.position, Cc = fw.pts.geometry.attributes.color;
  if (fw.t <= 0) { fw.t = rand(0.35, 0.8); const cx = rand(-6, 6), cy = rand(6, 10), cz = rand(-9, -5); const c = new THREE.Color().setHSL(Math.random(), 1, 0.6); sfx('explode', null, 0.25);
    for (let k = 0; k < 70; k++) { const i = fw.head; fw.head = (fw.head + 1) % fw.n; const d = V(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize().multiplyScalar(rand(3, 5)); P.setXYZ(i, cx, cy, cz); fw.v[i * 3] = d.x; fw.v[i * 3 + 1] = d.y; fw.v[i * 3 + 2] = d.z; fw.life[i] = rand(1.2, 1.8); Cc.setXYZ(i, c.r, c.g, c.b); } }
  for (let i = 0; i < fw.n; i++) { if (fw.life[i] <= 0) continue; fw.life[i] -= dt; fw.v[i * 3 + 1] -= 3 * dt; P.setXYZ(i, P.getX(i) + fw.v[i * 3] * dt, P.getY(i) + fw.v[i * 3 + 1] * dt, P.getZ(i) + fw.v[i * 3 + 2] * dt); if (fw.life[i] <= 0) P.setY(i, -999); const f = Math.max(0, fw.life[i] / 1.5); Cc.setXYZ(i, Cc.getX(i) * (0.985), Cc.getY(i) * 0.985, Cc.getZ(i) * 0.985); }
  P.needsUpdate = true; Cc.needsUpdate = true;
}
export function cineTick(dt) {
  if (!C.active) return; C.t += dt; C.autoT -= dt; if (C.autoT <= 0 && C.autoAdvance !== false) advance(); if (!C.active) return;
  for (const k in C.shotCast) { const a = actor(k); if (a.doll) { a.root.rotation.y += Math.sin(C.t * 2) * 0.002; continue; } a.mixer.update(dt); if (C.shot.peace && k === 'kelly') { peacePose(a, Math.min(1, C.t * 2)); } }
  if (C.flick) C.flick.intensity = C.shot.fx === 'flicker' ? (Math.random() < 0.3 ? 0.4 : 9) : 9;
  tickFireworks(dt);
  const dur = 6; const t = clamp(C.t / dur, 0, 1); const e = t * t * (3 - 2 * t);
  C.cam.position.lerpVectors(C.p0, C.p1, e); if (C.track) { const hp = headPos(C.track, V()).add(V(0, -0.035, 0)); C.look.lerp(hp, Math.min(1, dt * 6)); }
  C.cam.lookAt(C.look); C.cam.fov = C.fov; C.cam.aspect = innerWidth / innerHeight; C.cam.updateProjectionMatrix();
  E.renderer.toneMappingExposure = C.exposure || 1;
  E.renderer.render(C.scene, C.cam);
}
// Render a portrait of Shayla's face for the HUD vitals monitor (uses the same character as the cutscenes)
export function renderPortrait() {
  const sc = new THREE.Scene(); sc.background = new THREE.Color('#123a2a'); const a = actor('shayla'); sc.add(a.root); a.root.position.set(0, 0, 0); a.root.rotation.set(0, 0, 0); a.mixer.stopAllAction(); a.cur = null; a.play('Idle_Loop', 0); a.mixer.update(0.5);
  sc.add(new THREE.HemisphereLight('#ffffff', '#335544', 1.4)); const k = new THREE.DirectionalLight('#fff', 1.6); k.position.set(1, 2, 3); sc.add(k);
  const cam = new THREE.PerspectiveCamera(26, 1, 0.05, 10); const hp = headPos('shayla', V()); cam.position.copy(hp).add(V(0.12, 0.0, 0.62)); cam.lookAt(hp.clone().add(V(0, -0.03, 0)));
  const r = E.renderer; const rt = new THREE.WebGLRenderTarget(128, 128, { colorSpace: THREE.SRGBColorSpace }); r.setRenderTarget(rt); r.render(sc, cam); const px = new Uint8Array(128 * 128 * 4); r.readRenderTargetPixels(rt, 0, 0, 128, 128, px); r.setRenderTarget(null); rt.dispose();
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'); const id = x.createImageData(128, 128); for (let y = 0; y < 128; y++) for (let i = 0; i < 512; i++) { const v = px[(127 - y) * 512 + i]; id.data[y * 512 + i] = (i & 3) === 3 ? 255 : Math.round(255 * Math.pow(v / 255, 1 / 2.2)); } x.putImageData(id, 0, 0);
  a.root.removeFromParent(); return cv.toDataURL();
}
