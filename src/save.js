// Persistent save (localStorage) + shop catalog.
import { defaultQuality } from './engine.js';
const KEY = 'parabellum_save_v1';
export const S = { data: null };
export function defaults() {
  return { unlocked: 0, completed: [], fingers: 0, burgers: 0, cokes: 0, owned: { pistol: true, rifle: false, shotgun: false, defib: false }, up: {}, stats: { kills: 0, headshots: 0, gibs: 0 }, seenIntro: false, rulesSeen: [],
    settings: { quality: defaultQuality(), sens: 1, invertY: false, aim: 'medium', autofire: true, music: 0.55, sfx: 0.9, subs: true } };
}
export function load() { try { const j = JSON.parse(localStorage.getItem(KEY)); S.data = Object.assign(defaults(), j || {}); S.data.settings = Object.assign(defaults().settings, (j && j.settings) || {}); S.data.owned = Object.assign(defaults().owned, (j && j.owned) || {}); } catch (e) { S.data = defaults(); } return S.data; }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S.data)); } catch (e) { } }
export function resetSave() { const st = S.data.settings; S.data = defaults(); S.data.settings = st; save(); }
export const up = k => S.data.up[k] || 0;
// ---- shop catalog ----
// req: level index that must be completed (0 = hospital) before the item shows up
export const SHOP = [
  { id: 'w_shotgun', cat: 'Weapons', name: 'Yard-Sale Pump', desc: 'Pump shotgun Kelly "found." Crowd control, maximum gibs.', cost: [220], req: 1, weapon: 'shotgun' },
  { id: 'w_rifle', cat: 'Weapons', name: '"The Birthday One"', desc: "Kennedy's AR-style rifle, yours to keep. He says it was a gift. It was not.", cost: [380], req: 2, weapon: 'rifle' },
  { id: 'w_defib', cat: 'Weapons', name: 'Defib Cannon', desc: 'CLEAR! Chain lightning that arcs between zombies.', cost: [650], req: 5, weapon: 'defib' },
  { id: 'pistol_dmg', cat: 'Trusty 9mm', name: 'Hot Loads', desc: '+20% pistol damage per level.', cost: [40, 110, 240] },
  { id: 'pistol_mag', cat: 'Trusty 9mm', name: 'Extended Mag', desc: '+6 rounds per level.', cost: [60, 160] },
  { id: 'pistol_rel', cat: 'Trusty 9mm', name: 'Speed Loader', desc: 'Reload 25% faster per level.', cost: [50, 140] },
  { id: 'pistol_sig', cat: 'Trusty 9mm', name: 'Hollow-Point Oath', desc: 'Headshots heal 3 HP. First, do some harm.', cost: [300] },
  { id: 'pistol_rof', cat: 'Trusty 9mm', name: 'Akimbo Night Shift', desc: '+40% fire rate. Twelve-hour trigger finger.', cost: [420] },
  { id: 'rifle_dmg', cat: 'Birthday One', name: 'Match Grade', desc: '+20% rifle damage per level.', cost: [120, 260, 480], need: 'rifle' },
  { id: 'rifle_mag', cat: 'Birthday One', name: 'Drum Mag', desc: '+15 rounds per level.', cost: [150, 320], need: 'rifle' },
  { id: 'rifle_sig', cat: 'Birthday One', name: 'Bump of Faith', desc: 'Faster cyclic rate. Kennedy cried.', cost: [520], need: 'rifle' },
  { id: 'shotgun_dmg', cat: 'Yard-Sale Pump', name: 'Buckshot+', desc: '+20% pellet damage per level.', cost: [120, 260, 480], need: 'shotgun' },
  { id: 'shotgun_rel', cat: 'Yard-Sale Pump', name: 'Side Saddle', desc: 'Faster shell reload.', cost: [140, 300], need: 'shotgun' },
  { id: 'shotgun_sig', cat: 'Yard-Sale Pump', name: "Dragon's Breath", desc: 'Incendiary shells. Zombies burn. Smells like a cookout.', cost: [560], need: 'shotgun' },
  { id: 'defib_dmg', cat: 'Defib Cannon', name: '360 Joules', desc: '+25% defib damage per level.', cost: [260, 520], need: 'defib' },
  { id: 'defib_sig', cat: 'Defib Cannon', name: 'Code Blue', desc: 'Arcs jump to 3 more zombies.', cost: [700], need: 'defib' },
  { id: 'hp', cat: 'Nurse Kit', name: 'Iron Constitution', desc: '+25 max HP per level.', cost: [80, 200, 380] },
  { id: 'armor', cat: 'Nurse Kit', name: 'Reinforced Green Scrubs', desc: '-12% damage taken per level.', cost: [100, 240, 420] },
  { id: 'coffee', cat: 'Nurse Kit', name: 'Break Room Coffee', desc: '+15% move speed per level.', cost: [90, 220] },
  { id: 'salts', cat: 'Nurse Kit', name: 'Smelling Salts', desc: 'One self-revive per level.', cost: [350] },
  { id: 'k_ammo', cat: 'Kennedy Perks', name: 'Gun Show Regular', desc: 'More ammo drops when Kennedy is around.', cost: [120] },
  { id: 'k_dad', cat: 'Kennedy Perks', name: 'Dad Strength', desc: 'Kennedy hauls food: food pickups give +50%.', cost: [260] },
  { id: 'k_hype', cat: 'Kennedy Perks', name: 'Hype Man', desc: '+15% damage while Kennedy is with you.', cost: [200] },
  { id: 'k_over', cat: 'Kennedy Perks', name: 'Overwatch', desc: 'Kennedy hits 60% harder.', cost: [300] },
];
