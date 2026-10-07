// The 9 shifts. Each build(W) lays out geometry/props and returns gameplay anchors.
import * as THREE from 'three';
import { T, std, texMat, signTex } from './world.js';
import { PM, building, car, truck, tree, pine, lamp, bench, table, shelf, bed, curtain, vending, stall, pumpkins, hay, chairRow, stringLights, bike, grill, cooler, windowTex } from './props.js';
import { rand } from './util.js';
const { col, metal, emis } = PM;
const yawFacing = (fx, fz) => Math.atan2(-fx, -fz);
function perimeter(W, h, mat, o = {}) { const b = W.bounds; W.wall(b.minX, b.minZ, b.maxX, b.minZ, h, mat, o); W.wall(b.minX, b.maxZ, b.maxX, b.maxZ, h, mat, o); W.wall(b.minX, b.minZ, b.minX, b.maxZ, h, mat, o); W.wall(b.maxX, b.minZ, b.maxX, b.maxZ, h, mat, o); }
// wall along x (z fixed) with door gaps [[centerX, width],...]
function wallX(W, z, x0, x1, h, mat, gaps = [], t = 0.25) { let cur = x0; for (const [c, w] of gaps.sort((a, b) => a[0] - b[0])) { if (c - w / 2 > cur) W.box((cur + c - w / 2) / 2, 0, z, c - w / 2 - cur, h, t, mat, { tile: 2 }); W.box(c, 2.3, z, w, h - 2.3, t, mat, { collide: false }); cur = c + w / 2; } if (x1 > cur) W.box((cur + x1) / 2, 0, z, x1 - cur, h, t, mat, { tile: 2 }); }
function wallZ(W, x, z0, z1, h, mat, gaps = [], t = 0.25) { let cur = z0; for (const [c, w] of gaps.sort((a, b) => a[0] - b[0])) { if (c - w / 2 > cur) W.box(x, 0, (cur + c - w / 2) / 2, t, h, c - w / 2 - cur, mat, { tile: 2 }); W.box(x, 2.3, c, t, h - 2.3, w, mat, { collide: false }); cur = c + w / 2; } if (z1 > cur) W.box(x, 0, (cur + z1) / 2, t, h, z1 - cur, mat, { tile: 2 }); }
function ceiling(W, h, mat) { const b = W.bounds; W.box((b.minX + b.maxX) / 2, h, (b.minZ + b.maxZ) / 2, b.maxX - b.minX, 0.1, b.maxZ - b.minZ, mat, { collide: false, cast: false }); }
function fluoro(W, x, z, h, flicker) { W.box(x, h - 0.06, z, 1.4, 0.05, 0.35, emis('#f4fbff', 2.2), { collide: false, cast: false }); }
function decalSplat(W, x, z, s = 1.5) { const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), texMat('bloodDecal', T.blood(), { transparent: true, depthWrite: false, roughness: 0.3, polygonOffset: true, polygonOffsetFactor: -2 })); m.rotation.x = -Math.PI / 2; m.rotation.z = rand(0, 6); m.position.set(x, 0.011, z); W.group.add(m); }
function skyline(W, z, n = 26, spread = 160, y0 = -18) { for (let i = 0; i < n; i++) { const w = rand(8, 18), h = rand(14, 46), x = -spread / 2 + i * spread / n + rand(-2, 2); const t = windowTex('#1a1d24', 0.55, 3, 5, '#20242c'); const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 10), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.5, roughness: 0.9 })); m.position.set(x, y0 + h / 2, z - rand(0, 30)); W.group.add(m); } }

export const LEVELS = [
  // 1 ─────────────────────────────── HOSPITAL
  { id: 'hospital', name: 'Ozark Mercy Regional', shift: 'SHIFT 1 · CODE BROWN', obj: 'Clear the ER', music: 'hospital', quota: 30, outfits: ['gown', 'scrubs', 'gown'], mix: { walker: 0.78, runner: 0.14, brute: 0.08 },
    env: { indoor: true, sky: ['#0b0f14', '#151b22'], fog: ['#121820', 14, 46], hemi: ['#dfe9ff', '#3a3430', 0.9], sun: ['#ffffff', 0.6, 4, 10, 2], exposure: 1.0 },
    boss: { kind: 'zombie', name: 'THE CHIEF OF SURGERY', outfit: 'scrubs', hp: 1500, scale: 1.75, charge: true, prop: 'saw', cap: true },
    build(W) {
      W.bounds = { minX: -24, maxX: 24, minZ: -16, maxZ: 16 };
      W.floor(-24, 24, -16, 16, texMat('hospTile', T.tile('#dfe3dc', '#c9cfc8')), 2.4);
      const wall = texMat('hospWall', T.paint('#d7e0dc')); const wall2 = texMat('hospWall2', T.paint('#a9c9c4'));
      perimeter(W, 3.2, wall); ceiling(W, 3.2, texMat('ceil', T.tile('#e8ebe8', '#dcdfdc')));
      // corridor walls with doors into rooms; hub at x -4..4 and lobbies at the ends stay open
      for (const z of [-2.6, 2.6]) { wallX(W, z, -16, -4, 3.2, wall2, [[-12, 2], [-6.5, 1.6]]); wallX(W, z, 4, 16, 3.2, wall2, [[6.5, 1.6], [12, 2]]); }
      for (const x of [-16, -8, 8, 16]) { wallZ(W, x, 2.6, 16, 3.2, wall); wallZ(W, x, -16, -2.6, 3.2, wall); }
      for (const x of [-4, 4]) { wallZ(W, x, 8, 16, 3.2, wall); wallZ(W, x, -16, -8, 3.2, wall); }
      // patient rooms
      for (const [cx, cz] of [[-12, 9], [-12, -9], [12, 9], [12, -9], [-6, 11], [6, 11], [-6, -11], [6, -11]]) { const r = cz > 0 ? 0 : Math.PI; bed(W, cx - 1.6, cz + (cz > 0 ? 3 : -3), r); bed(W, cx + 1.6, cz + (cz > 0 ? 3 : -3), r); curtain(W, cx, cz + (cz > 0 ? 3.3 : -3.3), 2.6, Math.PI / 2); decalSplat(W, cx + rand(-2, 2), cz + rand(-2, 2), rand(1, 2)); }
      // nurses station hub
      const desk = std('desk', { color: 0x6f8f9a, roughness: 0.6 }); W.box(0, 0, -1.6, 4.2, 1.1, 0.5, desk); W.box(-2.1, 0, 0, 0.5, 1.1, 3.6, desk); W.box(2.1, 0, 0, 0.5, 1.1, 3.6, desk);
      W.box(0, 1.1, -1.6, 4.4, 0.06, 0.7, std('desktop', { color: 0xe6e2d8 }), { collide: false });
      W.sign(['NURSES\' STATION', 'Please be patient (zombies, especially)'], 0, 2.6, -1.85, 3.2, 0.6, { bg: '#16485a', fg: '#fff', box: 0.05 });
      // waiting room (west) + vending machines
      chairRow(W, -22, -8, 6, Math.PI / 2); chairRow(W, -19, -8, 6, Math.PI / 2); chairRow(W, -22, 5, 6, Math.PI / 2);
      vending(W, -23.4, 10, Math.PI / 2, 'Fizz-Ola'); vending(W, -23.4, 12, Math.PI / 2, 'Fizz-Ola'); vending(W, -23.4, 14, Math.PI / 2, 'SNAX');
      W.sign(['OZARK MERCY REGIONAL', 'EMERGENCY · WAITING'], -23.85, 2.3, 0, 5, 1.0, { ry: Math.PI / 2, bg: '#b3121a', fg: '#fff' });
      W.sign(['WASH YOUR HANDS', 'before AND after every headshot'], -8.13, 1.7, 5, 1.6, 0.9, { ry: Math.PI / 2, bg: '#fff', colors: ['#c22', '#222'] });
      W.sign('ROOM 4', -12, 2.75, 2.48, 1.1, 0.3, { bg: '#1d2a33', fg: '#fff' });
      // elevator lobby (east)
      W.box(23.7, 0, -1.8, 0.3, 2.6, 1.6, metal('#9aa3ab')); W.box(23.7, 0, 1.8, 0.3, 2.6, 1.6, metal('#9aa3ab'));
      W.sign(['ELEVATOR', 'OUT OF ORDER (OBVIOUSLY)'], 23.83, 2.85, 0, 3, 0.55, { ry: -Math.PI / 2, bg: '#222', fg: '#ffd84a' });
      for (let x = -20; x <= 20; x += 5) { fluoro(W, x, 0, 3.2); fluoro(W, x, 9, 3.2); fluoro(W, x, -9, 3.2); }
      W.pointLight(-18, 2.8, 0, 0xe8f2ff, 14, 16); W.pointLight(0, 2.8, 0, 0xe8f2ff, 14, 16, { flicker: true }); W.pointLight(18, 2.8, 0, 0xe8f2ff, 14, 16); W.pointLight(-12, 2.8, -9, 0xd0ffe0, 8, 12, { flicker: true });
      return { start: { x: -20, z: 0, yaw: yawFacing(1, 0) }, kennedy: { x: -23, z: -2 }, exit: { x: 22, z: 0, label: 'ELEVATOR' }, bossAt: { x: 18, z: 0 },
        spawnZones: [[-15, 4, -9, 15], [-15, -15, -9, -4], [9, 4, 15, 15], [9, -15, 15, -4], [17, -14, 23, 14], [-7, 4, -5, 15], [5, 4, 7, 15], [-7, -15, -5, -4], [5, -15, 7, -4]],
        pickups: [['coke', -22, 10, 3], ['coke', -22, 13, 3], ['med', -12, 13], ['med', 12, -13], ['fingers', 12, 13, 15], ['med', 0, 5]], kweepie: [[-12, 6], [12, -6], [6, 12], [20, 4]] };
    } },
  // 2 ─────────────────────────────── FREDDO'S
  { id: 'freddos', name: "Freddo's Frozen Custard & Steakburgers", shift: 'SHIFT 2 · BRAIN FREEZE', obj: 'Take back the steakburgers', music: 'freddos', quota: 40, outfits: ['custard', 'custard', 'hipster', 'scrubs'], mix: { walker: 0.6, runner: 0.15, spitter: 0.1, snatcher: 0.07, brute: 0.08 },
    env: { sky: ['#2a1f4a', '#ff8a4a'], fog: ['#6a4a5a', 25, 85], hemi: ['#ffc8a0', '#2a2030', 0.75], sun: ['#ff9a5a', 1.6, -20, 12, -10], exposure: 1.05 },
    boss: { kind: 'zombie', name: 'THE CONCRETE MIXER', outfit: 'custard', hp: 2000, scale: 2.1, spit: 'custard', spitRate: 1.8 },
    build(W) {
      W.bounds = { minX: -32, maxX: 32, minZ: -28, maxZ: 28 };
      W.floor(-32, 32, -28, 28, texMat('asph', T.asphalt()), 4);
      const stripe = emis('#d8d8c8', 0.15); for (let x = -26; x <= 26; x += 3.2) for (const z of [2, 10]) W.box(x, 0, z, 0.12, 0.01, 4.8, stripe, { collide: false, cast: false });
      // building
      const teal = texMat('freddoTeal', T.paint('#18a69f')); const yel = std('freddoYel', { color: 0xffd23b, roughness: 0.5 });
      W.box(0, 0, -19, 18, 5, 9, teal); W.box(0, 5, -19, 18.6, 0.7, 9.6, yel, { collide: false });
      const glass = std('fglass', { color: 0x2a1a10, emissive: 0xffb050, emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.5 }); W.box(0, 0.9, -14.45, 14, 2.6, 0.1, glass, { collide: false });
      W.sign(["FREDDO'S"], 0, 7.4, -14.6, 9, 2.0, { bg: '#18a69f', fg: '#ffd23b', neon: 1.4, box: 0.3, glow: '#fff3a0' });
      W.sign(['FROZEN CUSTARD & STEAKBURGERS', 'Open late · Brains not accepted'], 0, 4.4, -14.38, 10, 1.0, { bg: '#ffd23b', colors: ['#0f5f5a', '#7a4a00'] });
      W.sign(['DRIVE-THRU', '→'], 13.2, 2.6, -16, 2.6, 1.2, { ry: -Math.PI / 2, bg: '#18a69f', fg: '#fff', box: 0.15 }); W.box(13.2, 0, -16, 0.2, 2, 0.2, metal('#333'));
      W.sign(['MENU', 'Steakburger · Custard · Fries · Fizz-Ola'], 16, 2.2, -10, 3, 1.6, { ry: -Math.PI / 2, bg: '#111', fg: '#ffd23b', neon: 0.8, box: 0.2 });
      // patio
      for (const [x, z] of [[-6, -10], [-2, -10], [2, -10], [6, -10], [-4, -7], [4, -7]]) { table(W, x, z, 1.2, 1.2, std('ptable', { color: 0xf2f2f2 })); W.cyl(x, 0.75, z, 0.03, 0.03, 1.6, metal('#ccc'), { collide: false }); W.cyl(x, 2.3, z, 0.05, 1.3, 0.4, std('umb' + (x % 4 ? 'y' : 't'), { color: x % 4 ? 0xffd23b : 0x18a69f, roughness: 0.6 }), { collide: false, seg: 8 }); }
      // custard flood (slow zone)
      const cust = new THREE.Mesh(new THREE.CircleGeometry(5, 24), std('custardFloor', { color: 0xfff0c0, roughness: 0.15, emissive: 0x221a08 })); cust.rotation.x = -Math.PI / 2; cust.position.set(-8, 0.015, -11); cust.scale.set(1.3, 0.8, 1); W.group.add(cust);
      // cars
      const cc = ['#a33', '#36a', '#ddd', '#222', '#6a8', '#c80', '#555']; let k = 0; for (const z of [6, 14]) for (let x = -24; x <= 24; x += 6.4) if (Math.random() < 0.6) car(W, x + rand(-.3, .3), z, Math.PI / 2 * 0 + (Math.random() < 0.5 ? 0 : Math.PI), cc[k++ % cc.length]);
      car(W, -20, -6, 0.7, '#7a2a8a'); car(W, 22, 20, 2.2, '#bbb');
      truck(W, -24, -18, 0.3, '#c8102e'); W.collider(-26, -22, -21.5, -14.5, 0, 2.5); W.sign(['Fizz-Ola', 'ICE COLD COLA'], -22.9, 1.4, -17.3, 3.5, 1.2, { ry: Math.PI / 2 + 0.3, bg: '#c8102e', fg: '#fff' });
      for (const [x, z] of [[-14, -2], [14, -2], [-14, 18], [14, 18], [0, 24]]) lamp(W, x, z, 5, true, 0xffd8a0);
      for (let x = -30; x <= 30; x += 6) { tree(W, x, 26.5, 0.9); } for (let z = -24; z <= 24; z += 8) { tree(W, -30.5, z, 0.9); tree(W, 30.5, z, 0.9); }
      perimeter(W, 1.0, std('hedge', { color: 0x2a4a22, roughness: 1 }));
      W.pointLight(0, 3, -12, 0xffc070, 18, 20);
      return { start: { x: 0, z: 22, yaw: yawFacing(0, -1) }, kennedy: { x: 26, z: 24 }, truckFrom: { x: 40, z: 0 }, exit: { x: 0, z: 26.5, label: 'ROAD' }, bossAt: { x: 0, z: -11 },
        spawnZones: [[-30, -26, -12, -15], [12, -26, 30, -15], [-30, 16, -16, 26], [16, 16, 30, 26], [-30, -12, -26, 14], [26, -12, 30, 14]],
        slow: { x: -8, z: -11, r: 5.2 },
        pickups: [['burger', -6, -12.5, 6], ['burger', 6, -12.5, 6], ['burger', 15, -13, 6], ['burger', 15, -5, 6], ['burger', -15, -10, 6], ['burger', 0, 0, 6], ['burger', -20, 18, 6], ['burger', 20, 2, 6], ['burger', 8, 20, 6],
          ['coke', -21, -14, 6], ['coke', -21, -12, 6], ['coke', -22, -22, 6], ['coke', 4, -7.5, 6], ['coke', -26, 4, 6], ['coke', 26, -8, 5], ['med', 10, 10], ['med', -10, 20], ['ammo', 0, 10], ['fingers', 28, -24, 20]] };
    } },
  // 3 ─────────────────────────────── LIBRARY
  { id: 'library', name: 'Fayetteville Pub_ic Library', shift: 'SHIFT 3 · LATE FEES', obj: 'Silence the stacks', music: 'library', quota: 45, outfits: ['librarian', 'librarian', 'hipster', 'frat'], mix: { walker: 0.55, shusher: 0.2, runner: 0.12, spitter: 0.05, brute: 0.08 },
    env: { indoor: true, sky: ['#0b0f14', '#151b22'], fog: ['#1a1610', 16, 50], hemi: ['#ffe8c8', '#3a2a20', 0.85], sun: ['#ffe0b0', 0.7, 3, 10, 4], exposure: 1.0 },
    boss: { kind: 'zombie', name: 'THE OVERDUE', outfit: 'librarian', hp: 2400, scale: 2.0, spit: 'book', spitRate: 1.5, books: true },
    build(W) {
      W.bounds = { minX: -26, maxX: 26, minZ: -20, maxZ: 20 };
      W.floor(-26, 26, -20, 20, texMat('carpetL', T.carpet('#5a2e2e', '#d8b25a')), 2);
      W.floor(-7, 7, -7, 7, texMat('atriumStone', T.stone('#c8c0b0')), 3, 0.005);
      const wall = texMat('libWall', T.paint('#e8dcc8')); perimeter(W, 6, wall); ceiling(W, 6, texMat('libCeil', T.paint('#d8ccb8')));
      W.box(0, 5.9, 0, 12, 0.05, 12, emis('#e8f4ff', 1.3), { collide: false, cast: false });
      for (const [x, z] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) W.cyl(x, 0, z, 0.45, 0.5, 6, std('column', { color: 0xe8e2d4, roughness: 0.5 }), { collide: true, seg: 16 });
      // stacks maze (east)
      for (let x = 10; x <= 23; x += 2.6) for (const [z0, z1] of [[-17, -10], [-7, -1], [2, 8], [11, 17]]) shelf(W, x, (z0 + z1) / 2, z1 - z0, 2.4, Math.PI / 2);
      // reading tables (west centre)
      for (const [x, z] of [[-14, -3], [-14, 3], [-19, -3], [-19, 3]]) { table(W, x, z, 2.4, 1.2); W.box(x, 0.76, z, 0.2, 0.4, 0.2, emis('#ffe0a0', 1.2), { collide: false }); }
      // teaching kitchen (NW)
      W.box(-20, 0, 14, 8, 0.95, 1, std('counter', { color: 0x8a9aa0, roughness: 0.3, metalness: 0.4 })); W.box(-20, 0.95, 14, 2.2, 0.08, 0.9, metal('#222'), { collide: false });
      W.sign(['TEACHING KITCHEN', 'Today: Steakburgers 101'], -20, 2.6, 15.6, 4, 0.9, { ry: Math.PI, bg: '#2a4a3a', fg: '#fff' });
      // children's corner (SW)
      const rug = new THREE.Mesh(new THREE.CircleGeometry(4, 24), texMat('kidrug', T.stripes('#ffcc33', '#33aaff'))); rug.rotation.x = -Math.PI / 2; rug.position.set(-18, 0.012, -13); W.group.add(rug);
      W.sign(['STORY TIME', 'with Miss Brenda (deceased)'], -18, 2.2, -19.85, 4, 1.0, { bg: '#ffeb99', colors: ['#c22', '#333'] });
      // entrance sign with the L shot off
      W.sign(['FAYETTEVILLE PUB_IC LIBRARY', 'the L got shot off · we\'re not fixing it'], 0, 4.4, -19.83, 10, 1.6, { bg: '#2a2a2a', fg: '#f2e6c8' });
      W.sign(['SHHH!', 'Zombies must use inside voices'], 25.85, 3.5, 0, 3, 1.2, { ry: -Math.PI / 2, bg: '#7c5a8a', fg: '#fff' });
      // event hall partition (SE)
      wallX(W, -10, 8, 26, 4, wall, [[17, 3]]);
      chairRow(W, 12, -14, 8, 0); chairRow(W, 12, -16, 8, 0);
      W.pointLight(0, 5, 0, 0xfff0d8, 22, 24); W.pointLight(-17, 4, 0, 0xffe0b0, 14, 18); W.pointLight(16, 4, 4, 0xffe0b0, 12, 16, { flicker: true }); W.pointLight(-18, 4, 14, 0xfff0d0, 10, 14);
      return { start: { x: 0, z: -16, yaw: yawFacing(0, 1) }, kennedy: { x: 2, z: -19 }, exit: { x: 0, z: -19, label: 'EXIT' }, bossAt: { x: 0, z: 4 },
        spawnZones: [[9, -17, 25, 17], [-25, 9, -12, 19], [-25, -19, -12, -8], [9, -19, 25, -11]],
        pickups: [['burger', -22, 12.7, 6], ['burger', -19, 12.7, 6], ['burger', -16, 12.7, 6], ['coke', -14, 0, 5], ['coke', 18, 0.5, 5], ['coke', -18, -13, 5], ['coke', 24, 18, 5], ['med', 12, 9.5], ['med', -24, -2], ['ammo', 3, 8], ['fingers', 24, -18, 20]] };
    } },
  // 4 ─────────────────────────────── FARMERS' MARKET
  { id: 'market', name: "Farmers' Market on the Square", shift: 'SHIFT 4 · ARTISANAL BRAINS', obj: 'Clear the Square', music: 'market', quota: 50, outfits: ['hipster', 'farmer', 'hipster', 'jogger'], mix: { walker: 0.55, runner: 0.15, spitter: 0.12, snatcher: 0.08, brute: 0.1 },
    env: { sky: ['#5a9ad8', '#d8ecf8'], fog: ['#c8d8e0', 35, 110], hemi: ['#e8f4ff', '#5a5040', 1.0], sun: ['#fff4e0', 2.4, 15, 25, 10], exposure: 0.95 },
    boss: { kind: 'sourdough', name: 'THE SOURDOUGH MOTHER', hp: 2400 },
    build(W) {
      W.bounds = { minX: -34, maxX: 34, minZ: -34, maxZ: 34 };
      W.floor(-34, 34, -34, 34, texMat('plaza', T.stone('#b8a890')), 3);
      for (const [x, z] of [[-17, -17], [17, -17], [-17, 17], [17, 17]]) { const g = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), texMat('grassM', T.grass())); g.material.map.repeat.set(3, 3); g.rotation.x = -Math.PI / 2; g.position.set(x, 0.01, z); W.group.add(g); tree(W, x - 2, z - 2, 1.2, { color: 0x3a6a2a }); tree(W, x + 2.5, z + 2, 1.0, { color: 0x4a7a2a }); }
      // Old Post Office
      building(W, 0, 0, 12, 10, 8, { color: '#9a4a32', frame: '#f2efe6', cols: 4, rows: 2, lit: 0.2, trim: '#f2efe6' });
      W.box(0, 8.4, 0, 4, 2.5, 4, col('#f2efe6')); W.cyl(0, 10.9, 0, 0.2, 2.2, 2, col('#3a5a4a'), { seg: 8 });
      W.sign(['OLD POST OFFICE', 'est. a long time ago'], 0, 6.2, 5.03, 6, 1.0, { bg: '#f2efe6', fg: '#5a2a1a' });
      // stalls ring
      const cols2 = [['#ffffff', '#d8323c', '#e8742a'], ['#ffffff', '#2a7ad8', '#8ad83a'], ['#fff3c0', '#2a8a4a', '#d8323c'], ['#ffffff', '#8a3ad8', '#ffd84a']];
      let i = 0; for (const a of [0.3, 0.9, 1.5, 2.1, 2.7, 3.3, 3.9, 4.5, 5.1, 5.7]) { const r = 14 + (i % 2) * 2; const c = cols2[i % 4]; stall(W, Math.sin(a) * r, Math.cos(a) * r, a + Math.PI, c[0], c[1], c[2]); i++; }
      truck(W, -27, -10, 0, '#e8e2d0'); W.collider(-28.2, -25.8, -13, -7, 0, 2.5); W.sign(['TACO LOCO-MOTIVE'], -25.8, 2.2, -10, 3.5, 0.7, { ry: Math.PI / 2, bg: '#d8323c', fg: '#fff' });
      truck(W, 27, 10, Math.PI, '#2a8a8a'); W.collider(25.8, 28.2, 7, 13, 0, 2.5); W.sign(['KOMBUCHA BUS', 'fermented & fabulous'], 25.8, 2.2, 10, 3.5, 0.9, { ry: -Math.PI / 2, bg: '#ffd84a', fg: '#333' });
      truck(W, 8, -27, Math.PI / 2, '#8a5a2a'); W.collider(5, 11, -28.2, -25.8, 0, 2.5); W.sign(['BIG ED\'S BBQ'], 8, 2.2, -25.8, 3.5, 0.7, { bg: '#2a1a10', fg: '#ffb050' });
      pumpkins(W, -8, 22, 10); pumpkins(W, 10, 23, 8); pumpkins(W, 23, -6, 9); hay(W, -12, 24); hay(W, 13, 21, 0.5); hay(W, -24, 6, 1.2);
      W.sign(['HONEY', 'LOCAL · RAW · BEES INCLUDED'], -22, 1.6, 22, 2.4, 0.9, { ry: 0.7, bg: '#ffcc33', fg: '#5a3a00', box: 0.08 });
      // surrounding storefronts
      for (let x = -30; x <= 30; x += 10) { building(W, x, -37, 9.6, 5, 9 + (x % 20 ? 2 : 0), { color: ['#7a4a3a', '#5a6a7a', '#8a7a5a', '#6a3a3a'][(x / 10 + 3) % 4] }); building(W, x, 37, 9.6, 5, 9, { color: ['#5a6a7a', '#7a4a3a', '#6a5a4a', '#4a5a4a'][(x / 10 + 3) % 4] }); }
      for (let z = -30; z <= 30; z += 10) { building(W, -37, z, 5, 9.6, 10, { color: '#6a5a4a' }); building(W, 37, z, 5, 9.6, 10, { color: '#5a4a4a' }); }
      for (const [x, z] of [[-10, -10], [10, -10], [-10, 10], [10, 10]]) lamp(W, x, z, 4.5, false);
      return { start: { x: 0, z: 27, yaw: yawFacing(0, -1) }, kennedy: { x: 30, z: 30 }, exit: { x: 0, z: -30, label: 'EXIT' }, bossAt: { x: 0, z: -14 },
        spawnZones: [[-32, -32, -20, -20], [20, -32, 32, -20], [-32, 20, -20, 32], [20, 20, 32, 32], [-32, -8, -28, 8], [28, -8, 32, 8]],
        pickups: [['burger', -25.5, -12, 6], ['burger', -25.5, -8, 6], ['burger', 8, -25.5, 6], ['burger', 5, -25.5, 6], ['coke', 25.5, 8, 5], ['coke', 25.5, 12, 5], ['coke', -15, 0, 5], ['coke', 15, 0, 5], ['coke', 0, 18, 5], ['med', -20, -20], ['med', 20, 20], ['ammo', 0, -18], ['ammo', -18, 18], ['fingers', 30, -30, 25]] };
    } },
  // 5 ─────────────────────────────── DICKSON STREET
  { id: 'dickson', name: 'Dickson Street', shift: 'SHIFT 5 · LAST CALL', obj: 'Survive the bar crawl', music: 'dickson', quota: 55, outfits: ['bachelorette', 'frat', 'hipster', 'bachelorette'], mix: { walker: 0.5, runner: 0.22, brute: 0.1, snatcher: 0.08, spitter: 0.1 },
    env: { dark: true, sky: ['#05040c', '#1a0f2a'], fog: ['#120a1c', 18, 70], hemi: ['#7a6aff', '#201020', 0.55], sun: ['#8a9aff', 0.5, 10, 20, 5], exposure: 1.15 },
    boss: { kind: 'zombie', name: 'ROAD CAPTAIN', outfit: 'frat', hp: 2400, scale: 1.6, charge: true, bike: true },
    build(W) {
      W.bounds = { minX: -45, maxX: 45, minZ: -12, maxZ: 12 };
      W.floor(-45, 45, -5.5, 5.5, texMat('asph', T.asphalt()), 4); W.floor(-45, 45, -12, -5.5, texMat('sidewalk', T.concrete('#8a8880')), 2); W.floor(-45, 45, 5.5, 12, texMat('sidewalk', T.concrete('#8a8880')), 2);
      for (let x = -42; x <= 42; x += 4) W.box(x, 0, 0, 2, 0.01, 0.15, emis('#e8c020', 0.3), { collide: false, cast: false });
      const names = [['JORGE\'S MAGNIFICENT LOUNGE', '#ff3aa0'], ['THE THIRSTY HOG', '#3affd0'], ['BIKES, BOOZE & BRAINS', '#ffb020'], ['WALTZ-ON ARTS CENTER', '#9a7aff'], ['DICKSON DEPOT', '#ff4040'], ['GRIM\'S TAVERN', '#40a0ff'], ['TACOS 4 LIFE (OR UNDEATH)', '#ff6a20'], ['KARAOKE · NO REFUNDS', '#40ff60']];
      let i = 0; for (let x = -40; x <= 40; x += 10) for (const side of [-1, 1]) {
        const h = 7 + (i % 3) * 2; const colr = ['#3a2a2a', '#2a2a3a', '#3a3a2a', '#2a3a3a'][i % 4]; building(W, x, side * 15, 9.8, 6, h, { color: colr, lit: 0.5, glow: true });
        const [n, c] = names[i % names.length]; W.sign([n], x, 3.4, side * 11.9, 7, 1.1, { ry: side > 0 ? Math.PI : 0, bg: '#08080c', fg: c, neon: 2.2, glow: c, box: 0.1 });
        W.pointLight(x, 3, side * 10, new THREE.Color(c).getHex(), 10, 11); i++;
      }
      for (let x = -40; x <= 40; x += 10) stringLights(W, x - 4, -11.5, x - 4, 11.5, 5.5, 18);
      for (const [x, z, r] of [[-30, 7.5, 0.3], [-28, 7.5, 0.3], [-12, -7.5, 2.8], [6, 7.5, 0.2], [22, -7.5, 3], [24, -7.5, 3.1], [34, 7.5, 0.1]]) bike(W, x, z, r);
      car(W, -20, -4, Math.PI / 2 + 0.2, '#2a2a6a'); car(W, 14, 4, -Math.PI / 2 - 0.3, '#6a1a1a'); car(W, 38, -3, 0.5, '#ddd');
      W.box(44, 0, 0, 1.5, 1.2, 12, col('#4a3a2a')); // depot platform end
      for (let x = -40; x <= 40; x += 16) { lamp(W, x, -6, 5, false); lamp(W, x + 8, 6, 5, false); }
      return { start: { x: -40, z: 0, yaw: yawFacing(1, 0) }, kennedy: { x: -44, z: 3 }, exit: { x: 42, z: 0, label: 'DEPOT' }, bossAt: { x: 30, z: 0 },
        spawnZones: [[-10, -11, 44, -7], [-10, 7, 44, 11], [20, -5, 44, 5], [-44, -11, -30, -7], [-44, 7, -30, 11]],
        pickups: [['burger', -30, -10, 5], ['burger', -10, 10, 5], ['burger', 20, 10, 5], ['coke', -20, 10, 5], ['coke', 0, -10, 5], ['coke', 10, -10, 5], ['coke', 30, 10, 5], ['med', -5, 0], ['med', 25, -9], ['ammo', 0, 8], ['ammo', 35, -8], ['fingers', 43, 10, 25]] };
    } },
  // 6 ─────────────────────────────── OLD MAIN
  { id: 'oldmain', name: 'Old Main & Senior Walk', shift: 'SHIFT 6 · FINALS WEEK', obj: 'Deny tenure', music: 'oldmain', quota: 55, outfits: ['graduate', 'graduate', 'frat', 'librarian'], mix: { walker: 0.55, runner: 0.18, shusher: 0.1, brute: 0.1, spitter: 0.07 },
    env: { sky: ['#1a1a4a', '#d87a5a'], fog: ['#5a4a6a', 30, 100], hemi: ['#ffc8b0', '#2a2a3a', 0.8], sun: ['#ffa070', 1.5, -25, 14, 10], exposure: 1.05 },
    boss: { kind: 'professor', name: 'PROFESSOR EMERITUS', outfit: 'graduate', hp: 2200, scale: 1.8 },
    build(W) {
      W.bounds = { minX: -36, maxX: 36, minZ: -30, maxZ: 30 };
      W.floor(-36, 36, -30, 30, texMat('grassO', T.grass()), 3);
      const sw = texMat('seniorwalk', T.senior()); W.floor(-2, 2, -18, 30, sw, 4, 0.01); W.floor(-36, 36, 2, 6, sw, 4, 0.012);
      const dg = new THREE.Mesh(new THREE.PlaneGeometry(3, 40), sw); dg.rotation.set(-Math.PI / 2, 0, 0.7); dg.position.set(-14, 0.013, 14); W.group.add(dg); const dg2 = dg.clone(); dg2.rotation.z = -0.7; dg2.position.set(14, 0.013, 14); W.group.add(dg2);
      // Old Main with twin towers (the north one is taller)
      building(W, 0, -24, 30, 8, 12, { color: '#9a5a3a', frame: '#e8e0d0', cols: 6, rows: 3, lit: 0.35, trim: '#5a3a2a' });
      W.box(-9, 0, -24, 5, 24, 5, texMat('omTower', windowTex('#9a5a3a', 0.3, 2, 4, '#e8e0d0'))); W.cyl(-9, 24, -24, 0.3, 3.6, 5, col('#3a4a5a'), { seg: 4, ry: Math.PI / 4 });
      W.box(9, 0, -24, 5, 19, 5, texMat('omTower', windowTex('#9a5a3a', 0.3, 2, 4, '#e8e0d0'))); W.cyl(9, 19, -24, 0.3, 3.6, 4, col('#3a4a5a'), { seg: 4, ry: Math.PI / 4 });
      W.sign(['OLD MAIN'], 0, 9.5, -19.9, 6, 1.0, { bg: '#5a3a2a', fg: '#f2e6c8' });
      W.sign(['SENIOR WALK', '~ every name, forever ~'], 3.5, 1.2, 8, 2.6, 0.9, { bg: '#2a2a2a', fg: '#e8e0d0', box: 0.1 });
      for (const [x, z] of [[-20, -10], [20, -10], [-26, 18], [26, 18], [-10, 22], [10, 22], [-30, -2], [30, -2], [-18, 10], [18, 10]]) tree(W, x, z, 1.25, { color: 0x3a5a2a });
      for (const x of [-24, -12, 12, 24]) { lamp(W, x, 7, 4.5, false); bench(W, x + 3, 7.5, Math.PI); }
      lamp(W, -3, -12, 4.5, true, 0xffe0b0); lamp(W, 3, 16, 4.5, true, 0xffe0b0);
      perimeter(W, 1.2, std('iron', { color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 }));
      return { start: { x: 0, z: 26, yaw: yawFacing(0, -1) }, kennedy: { x: 34, z: 4 }, exit: { x: 0, z: -19, label: 'OLD MAIN' }, bossAt: { x: 0, z: -12 }, kelly: { x: -33, z: 27 },
        spawnZones: [[-34, -18, -18, -8], [18, -18, 34, -8], [-34, 12, -22, 28], [22, 12, 34, 28], [-34, -6, -28, 0], [28, -6, 34, 0]],
        pickups: [['burger', -20, 4, 5], ['burger', 20, 4, 5], ['burger', 0, -14, 5], ['coke', -30, -16, 5], ['coke', 30, -16, 5], ['coke', 0, 0, 5], ['med', -28, 22], ['med', 28, 22], ['ammo', -10, -10], ['ammo', 10, -10], ['fingers', 33, -27, 25]] };
    } },
  // 7 ─────────────────────────────── WILSON PARK
  { id: 'wilson', name: 'Wilson Park Castle', shift: 'SHIFT 7 · NIGHT AT THE CASTLE', obj: 'Hold the castle', music: 'wilson', quota: 60, outfits: ['jogger', 'jogger', 'hipster', 'farmer'], mix: { walker: 0.42, runner: 0.33, brute: 0.1, spitter: 0.08, snatcher: 0.07 },
    env: { dark: true, sky: ['#02030a', '#0a1430'], fog: ['#0a1020', 16, 70], hemi: ['#6a8aff', '#101018', 0.5], sun: ['#9ab0ff', 0.7, -10, 20, -8], exposure: 1.2 },
    boss: { kind: 'kweepie', name: 'THE KWEEPIE', hp: 3200, height: 2.5 },
    build(W) {
      W.bounds = { minX: -34, maxX: 34, minZ: -34, maxZ: 34 };
      W.floor(-34, 34, -34, 34, texMat('grassW', T.grass()), 3);
      // pond
      const pond = new THREE.Mesh(new THREE.CircleGeometry(8, 32), std('pondw', { color: 0x0a2a3a, roughness: 0.05, metalness: 0.6 })); pond.rotation.x = -Math.PI / 2; pond.position.set(14, 0.02, 10); W.group.add(pond); W.collider(8.5, 19.5, 4.5, 15.5, 0, 0.3, 'nocol');
      W.collider(9, 19, 5, 15, 0, 1.0);
      // castle sculpture
      const stone = texMat('castleStone', T.stone('#9a948a'));
      W.box(-6, 0, -18, 14, 3.2, 1.2, stone, { tile: 2 }); W.box(-13, 0, -14, 1.2, 3.2, 8, stone, { tile: 2 }); W.box(1, 0, -14, 1.2, 3.2, 8, stone, { tile: 2 });
      for (let x = -12.5; x <= 0.5; x += 1) W.box(x, 3.2, -18, 0.5, 0.5, 1.2, stone, { collide: false });
      for (const [x, z, h] of [[-13, -18, 6.5], [1, -18, 6.5], [-6, -19, 8.5]]) { W.cyl(x, 0, z, 1.4, 1.5, h, stone, { collide: true, seg: 12 }); W.cyl(x, h, z, 0.05, 1.8, 2.4, col('#5a3a6a'), { seg: 12 }); }
      W.sign(['WILSON PARK'], -6, 1.6, -17.35, 4, 0.9, { bg: '#2a2a2a', fg: '#e8e0d0' });
      // gazebo
      for (let a = 0; a < 8; a++) W.cyl(-18 + Math.cos(a * 0.785) * 3, 0, 12 + Math.sin(a * 0.785) * 3, 0.1, 0.1, 2.8, col('#f2f2f2'), { collide: true, seg: 6 });
      W.cyl(-18, 2.8, 12, 0.1, 3.8, 1.6, col('#4a2a2a'), { seg: 8 }); W.cyl(-18, 0, 12, 3.2, 3.2, 0.3, texMat('gazfloor', T.wood('#9a7a5a')), { seg: 8 });
      for (const [x, z] of [[-26, -26], [26, -26], [-26, 26], [26, 26], [-28, 0], [28, -6], [0, 28], [-10, 22], [24, 20], [-24, -8], [10, -26]]) tree(W, x, z, 1.3, { color: 0x1a3a1a });
      for (let a = 0; a < 6; a++) stringLights(W, -6 + Math.cos(a) * 3, -14 + Math.sin(a) * 2, -6 + Math.cos(a + 1) * 14, -4 + Math.sin(a + 1) * 10, 3.8, 14);
      for (const [x, z] of [[-6, -6], [8, -8], [-20, 2], [4, 18]]) lamp(W, x, z, 4.2, true, 0xffd8a0);
      perimeter(W, 1.4, std('iron', { color: 0x1a1a1a, roughness: 0.4, metalness: 0.7 }));
      return { start: { x: 0, z: 26, yaw: yawFacing(0, -1) }, kennedy: { x: -30, z: 30 }, exit: { x: -6, z: -12, label: 'CASTLE' }, bossAt: { x: -6, z: -10 },
        spawnZones: [[-32, -32, -16, -22], [12, -32, 32, -22], [-32, 16, -22, 32], [22, 20, 32, 32], [-32, -10, -28, 8], [28, -16, 32, 0]],
        pickups: [['burger', -18, 12, 5], ['burger', 24, -14, 5], ['coke', 2, -14, 5], ['coke', -28, 24, 5], ['med', 0, 0], ['med', -24, -18], ['med', 24, 26], ['ammo', 6, -2], ['ammo', -14, -4], ['fingers', -32, -32, 30]] };
    } },
  // 8 ─────────────────────────────── MOUNT SEQUOYAH
  { id: 'sequoyah', name: 'Mount Sequoyah', shift: 'SHIFT 8 · SUNRISE', obj: 'Reach the overlook', music: 'sequoyah', quota: 70, outfits: ['gown', 'custard', 'librarian', 'hipster', 'bachelorette', 'graduate', 'jogger', 'kweepie'], mix: { walker: 0.48, runner: 0.22, brute: 0.12, spitter: 0.1, shusher: 0.08 },
    env: { sky: ['#2a2a6a', '#ffb070'], fog: ['#a08090', 30, 120], hemi: ['#ffd0b0', '#2a2a3a', 0.85], sun: ['#ffb070', 2.0, 0, 6, -30], exposure: 1.0 },
    boss: { kind: 'mother', name: 'THE KWEEPIE MOTHER', hp: 6000, height: 9 },
    build(W) {
      W.bounds = { minX: -36, maxX: 36, minZ: -36, maxZ: 36 };
      W.floor(-36, 36, -36, 36, texMat('dirtS', T.dirt()), 3);
      const road = new THREE.Mesh(new THREE.PlaneGeometry(6, 80), texMat('asphS', T.asphalt())); road.material.map.repeat.set(1.5, 20); road.rotation.set(-Math.PI / 2, 0, 0.25); road.position.set(2, 0.01, 4); W.group.add(road);
      for (let i = 0; i < 70; i++) { const x = rand(-35, 35), z = rand(-20, 35); if (Math.abs(x - 2 - (z - 4) * -0.25) < 6 || (Math.abs(x) < 10 && z < -10)) continue; pine(W, x, z, rand(1.1, 1.8)); }
      for (let x = -34; x <= 34; x += 5) if (Math.abs(x) > 16) pine(W, x, -34, 1.6);
      // overlook
      const stone = texMat('overStone', T.stone('#8a847a')); W.box(0, 0, -30, 26, 1.1, 1, stone, { tile: 2 }); for (let x = -12; x <= 12; x += 2) W.cyl(x, 1.1, -30, 0.04, 0.04, 0.6, metal('#333'), { collide: false });
      W.floor(-14, 14, -30, -16, texMat('overFloor', T.concrete('#a8a49a')), 3, 0.01);
      W.sign(['MOUNT SEQUOYAH OVERLOOK', 'elev. high enough · view: zombies'], 10, 1.6, -15.5, 3.4, 1.0, { bg: '#3a2a1a', fg: '#f2e6c8', box: 0.12 });
      skyline(W, -110, 28, 180, -26);
      for (const [x, z] of [[-8, -18], [8, -18]]) bench(W, x, z, 0);
      perimeter(W, 1.0, stone);
      return { start: { x: 6, z: 32, yaw: yawFacing(-0.15, -1) }, kennedy: { x: 10, z: 34 }, exit: { x: 0, z: -24, label: 'OVERLOOK' }, bossAt: { x: 0, z: -40 },
        spawnZones: [[-34, -14, -14, 10], [14, -14, 34, 10], [-34, 14, -12, 34], [16, 14, 34, 34]],
        pickups: [['med', -10, 10], ['med', 12, -6], ['med', 0, -20], ['ammo', -4, 20], ['ammo', 8, 0], ['ammo', -8, -18], ['fingers', -30, 30, 40]] };
    } },
  // 9 ─────────────────────────────── HOME
  { id: 'home', name: 'Home: The Reunion', shift: 'SHIFT 9 · THE REUNION', obj: 'Protect the picnic table', music: 'home', survive: 120, outfits: ['gown', 'custard', 'hipster', 'frat', 'graduate', 'bachelorette'], mix: { walker: 0.6, runner: 0.2, brute: 0.08, snatcher: 0.12 },
    env: { sky: ['#4a7ad8', '#ffd8a0'], fog: ['#e0c8a8', 30, 90], hemi: ['#fff0d8', '#4a4030', 1.0], sun: ['#ffc880', 2.2, -20, 14, 12], exposure: 1.0 },
    build(W) {
      W.bounds = { minX: -24, maxX: 24, minZ: -20, maxZ: 20 };
      W.floor(-24, 24, -20, 20, texMat('grassH', T.grass()), 3);
      building(W, 0, -24, 20, 8, 7, { color: '#c8b8a0', frame: '#ffffff', cols: 5, rows: 2, lit: 0.5, trim: '#5a4a3a' });
      W.box(0, 0, -19.2, 8, 0.4, 2.2, texMat('porch', T.wood('#8a6a4a')), { kind: 'low' }); W.box(0, 0, -19.95, 1.4, 2.3, 0.1, col('#5a3a2a'), { collide: false });
      const fence = texMat('fence', T.wood('#a8845a')); perimeter(W, 1.8, fence);
      // picnic table spread
      table(W, 0, 0, 4.5, 1.6, texMat('picnic', T.wood('#9a6a3a'))); for (const z of [-1.3, 1.3]) W.box(0, 0.45, z, 4.5, 0.06, 0.4, texMat('picnic', T.wood('#9a6a3a')), { collide: false });
      const bun = std('bun', { color: 0xc88a3a, roughness: 0.6 }); for (let i = 0; i < 16; i++) { const g = new THREE.SphereGeometry(0.08, 8, 6, 0, 6.3, 0, 1.6); g.translate(-1.8 + (i % 8) * 0.5, 0.79 + Math.floor(i / 8) * 0.06, -0.3 + Math.floor(i / 8) * 0.25); W.geo(g, bun); }
      for (let i = 0; i < 10; i++) W.cyl(-1.5 + i * 0.35, 0.79, 0.45, 0.04, 0.035, 0.14, col(i % 2 ? '#c8102e' : '#ffffff'), { collide: false, seg: 8 });
      stringLights(W, -10, -6, 10, -6, 3.2, 20); stringLights(W, -10, 6, 10, 6, 3.2, 20); stringLights(W, -10, -6, -10, 6, 3.2, 10); stringLights(W, 10, -6, 10, 6, 3.2, 10);
      for (const [x, z] of [[-10, -6], [10, -6], [-10, 6], [10, 6]]) W.cyl(x, 0, z, 0.06, 0.06, 3.3, col('#5a4a3a'), { collide: true, seg: 6 });
      grill(W, 6, -3); cooler(W, -4, 2.6); cooler(W, 4, 2.8, 0.4);
      for (const [x, z] of [[-20, -14], [20, -14], [-20, 14], [20, 14], [-12, 16], [14, 16]]) tree(W, x, z, 1.2, { color: 0x3a6a2a });
      W.sign(['WELCOME FAMILY!', '(and zombies, apparently)'], 0, 1.4, -19.85, 3.6, 1.0, { bg: '#fff3c0', colors: ['#c22', '#333'] });
      return { start: { x: 0, z: 8, yaw: yawFacing(0, -1) }, kennedy: { x: 2.5, z: 8 }, table: { x: 0, z: 0 },
        spawnZones: [[-22, -18, -12, -10], [12, -18, 22, -10], [-22, 12, -12, 18], [12, 12, 22, 18], [-22, -6, -20, 6], [20, -6, 22, 6]],
        pickups: [['burger', -6, -10, 5], ['burger', 6, -10, 5], ['burger', -16, 0, 5], ['burger', 16, 0, 5], ['burger', 0, 15, 5], ['coke', -10, 12, 5], ['coke', 10, 12, 5], ['coke', -18, -16, 5], ['coke', 18, -16, 5], ['coke', 0, -15, 5], ['med', -20, 18], ['med', 20, -18], ['ammo', 8, 6]] };
    } },
];
