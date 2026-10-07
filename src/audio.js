// All-original procedural WebAudio: rock music generator (sections change every few bars) + synthesized SFX.
import { mulberry } from './util.js';
export const A = { ctx: null, on: false, musicVol: 0.55, sfxVol: 0.9, intensity: 0.3 };
let noiseBuf, master, musicBus, sfxBus, guitarBus, comp;
export function initAudio() {
  if (A.ctx) { if (A.ctx.state === 'suspended') { try { const r = A.ctx.resume(); r && r.catch && r.catch(() => { }); } catch (e) { } } return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  const ctx = A.ctx = new AC();
  comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2; comp.connect(ctx.destination);
  master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
  musicBus = ctx.createGain(); musicBus.gain.value = A.musicVol; musicBus.connect(master);
  sfxBus = ctx.createGain(); sfxBus.gain.value = A.sfxVol; sfxBus.connect(master);
  // guitar bus: drive -> shaper -> cab filters
  const drive = ctx.createGain(); drive.gain.value = 6; const sh = ctx.createWaveShaper(); const curve = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 3.2) * 0.9; } sh.curve = curve; sh.oversample = '2x';
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3600; lp.Q.value = 0.8; const pk = ctx.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1400; pk.gain.value = 4; const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 90;
  const gOut = ctx.createGain(); gOut.gain.value = 0.16; drive.connect(sh); sh.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(gOut); gOut.connect(musicBus); guitarBus = drive;
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  A.on = true; setInterval(schedule, 25);
}
export function setVolumes(m, s) { A.musicVol = m; A.sfxVol = s; if (musicBus) { musicBus.gain.value = m; sfxBus.gain.value = s; } }
export function suspendAudio(on) { if (!A.ctx) return; try { const r = on ? A.ctx.suspend() : A.ctx.resume(); r && r.catch && r.catch(() => { }); } catch (e) { } }
const now = () => A.ctx.currentTime;
function env(g, t, a, peak, dcy, sus = 0, rel = 0.05, dur = 0) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0001, sus || 0.0001), t + a + dcy); if (dur) { g.gain.setValueAtTime(Math.max(0.0001, sus || 0.0001), t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel); } }
function noise(t, dur, type, freq, q, peak, dest, a = 0.001, rate = 1) {
  const s = A.ctx.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = rate; const f = A.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q || 0.7; const g = A.ctx.createGain(); env(g, t, a, peak, dur);
  s.connect(f); f.connect(g); g.connect(dest); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05); return { f, g };
}
function osc(t, type, f0, f1, dur, peak, dest, a = 0.002) { const o = A.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur); const g = A.ctx.createGain(); env(g, t, a, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05); return { o, g }; }
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

// ---------------- music ----------------
const SCALES = { minor: [0, 2, 3, 5, 7, 8, 10], phryg: [0, 1, 3, 5, 7, 8, 10], dorian: [0, 2, 3, 5, 7, 9, 10], major: [0, 2, 4, 5, 7, 9, 11], mixo: [0, 2, 4, 5, 7, 9, 10], blues: [0, 3, 5, 6, 7, 10, 12] };
export const STYLES = {
  title: { bpm: 96, root: 40, scale: 'phryg', feel: 'doom' },
  hospital: { bpm: 152, root: 40, scale: 'minor', feel: 'punk' },
  freddos: { bpm: 138, root: 45, scale: 'mixo', feel: 'surf' },
  library: { bpm: 104, root: 38, scale: 'phryg', feel: 'doom' },
  market: { bpm: 124, root: 43, scale: 'blues', feel: 'boogie' },
  dickson: { bpm: 166, root: 42, scale: 'minor', feel: 'punk' },
  oldmain: { bpm: 144, root: 40, scale: 'dorian', feel: 'metal' },
  wilson: { bpm: 112, root: 41, scale: 'phryg', feel: 'creep' },
  sequoyah: { bpm: 178, root: 40, scale: 'phryg', feel: 'thrash' },
  home: { bpm: 128, root: 43, scale: 'major', feel: 'party' },
  ending: { bpm: 132, root: 45, scale: 'major', feel: 'party' },
  shop: { bpm: 100, root: 45, scale: 'dorian', feel: 'lounge' },
};
const M = { playing: false, style: null, nextT: 0, step: 0, bar: 0, sec: null, secBars: 0, rng: mulberry(1), riff: [], prog: [], key: 0 };
export function playMusic(name) {
  if (!A.ctx) return; const st = STYLES[name] || STYLES.hospital; if (M.styleName === name && M.playing) return;
  M.styleName = name; M.style = st; M.playing = true; M.rng = mulberry(name.length * 131 + st.bpm); M.bar = 0; M.step = 0; M.key = 0; M.nextT = now() + 0.1; newSection();
}
export function stopMusic() { M.playing = false; M.styleName = null; }
const SECS = ['intro', 'verse', 'chorus', 'verse', 'bridge', 'chorus', 'break', 'solo', 'chorus'];
function newSection() {
  const r = M.rng; M.secIdx = M.secIdx === undefined ? 0 : (M.secIdx + 1) % SECS.length; M.sec = SECS[M.secIdx]; if (M.bar === 0) M.sec = 'intro';
  M.secBars = M.sec === 'intro' || M.sec === 'break' || M.sec === 'bridge' ? 4 : 8;
  if (M.secIdx === 0 && M.bar > 0) M.key = (M.key + [2, 3, 5, -2][Math.floor(r() * 4)]) % 7; // modulate every cycle
  const degs = [[0, 0, 5, 6], [0, 3, 4, 3], [0, 5, 3, 4], [0, 6, 5, 6], [0, 2, 3, 4], [5, 3, 0, 4]];
  M.prog = degs[Math.floor(r() * degs.length)];
  // 16-step riff: 1=chug, 2=accent/power chord, 0=rest, 3=fifth up
  M.riff = Array.from({ length: 16 }, (_, i) => i % 4 === 0 ? 2 : r() < 0.62 ? (r() < 0.18 ? 3 : 1) : 0);
  M.lead = Array.from({ length: 16 }, () => r() < 0.45 ? Math.floor(r() * 7) : -1);
  M.fill = false;
}
function scaleNote(deg, oct = 0) { const sc = SCALES[M.style.scale]; const n = sc.length; const d = ((deg % n) + n) % n; const o = Math.floor(deg / n); return M.style.root + M.key + sc[d] + 12 * (o + oct); }
function schedule() {
  if (!A.on || !M.playing || A.ctx.state !== 'running') { if (A.ctx && M.playing) M.nextT = Math.max(M.nextT, now() + 0.05); return; }
  const st = M.style, spb = 60 / st.bpm / 4; // 16th note
  if (M.nextT < now() - 0.3) M.nextT = now() + 0.05;
  while (M.nextT < now() + 0.14) { playStep(M.nextT, M.step % 16, spb); M.nextT += spb; M.step++; if (M.step % 16 === 0) { M.bar++; M.secBars--; if (M.secBars <= 0) newSection(); } }
}
function playStep(t, s, spb) {
  const st = M.style, feel = st.feel, sec = M.sec, I = A.intensity; const bus = musicBus; const barInSec = M.bar % 8;
  const chordDeg = M.prog[Math.floor((M.bar % 4))];
  const root = scaleNote(chordDeg, 0); const quiet = sec === 'intro' || sec === 'break';
  const half = feel === 'doom' || feel === 'creep'; const swing = feel === 'boogie' || feel === 'lounge' ? (s % 2 ? spb * 0.28 : 0) : 0; t += swing;
  // drums
  const kickPat = feel === 'punk' || feel === 'thrash' ? [0, 4, 8, 10, 12] : feel === 'metal' ? [0, 2, 3, 6, 8, 10, 11, 14] : half ? [0, 10] : feel === 'surf' ? [0, 6, 8, 11] : [0, 6, 8, 10];
  const snarePat = half ? [8] : [4, 12];
  if (!(quiet && I < 0.5) || s % 8 === 0) {
    if (kickPat.includes(s) && !(sec === 'intro' && s > 0)) { osc(t, 'sine', 140, 42, 0.18, 0.9, bus); noise(t, 0.02, 'lowpass', 900, 1, 0.3, bus); }
    if (snarePat.includes(s) && sec !== 'intro') { noise(t, 0.16, 'bandpass', 1900, 0.6, 0.55, bus); osc(t, 'triangle', 210, 160, 0.08, 0.35, bus); }
    const hatEvery = feel === 'thrash' || feel === 'punk' ? 2 : half ? 4 : 2;
    if (s % hatEvery === 0 && sec !== 'intro') noise(t, s % 8 === 6 && feel !== 'thrash' ? 0.2 : 0.035, 'highpass', 7500, 0.5, 0.16 + I * 0.08, bus);
    if (s === 0 && (M.bar % M.secBars === 0 || barInSec === 0) && sec !== 'intro') noise(t, 1.3, 'highpass', 4500, 0.4, 0.28, bus);
    if (M.secBars === 1 && s >= 12) { noise(t, 0.12, 'bandpass', 1600 + s * 60, 0.7, 0.5, bus); osc(t, 'sine', 160 - s * 4, 60, 0.12, 0.4, bus); } // fill
  }
  // bass (8ths, or 16ths for thrash/punk)
  const bassEvery = feel === 'thrash' || feel === 'punk' ? 1 : feel === 'boogie' ? 2 : half ? 8 : 2;
  if (s % bassEvery === 0 && !(sec === 'intro' && M.bar % 4 < 2)) {
    let n = root - 12; if (feel === 'boogie' && s % 4 === 2) n += [0, 4, 7, 9][Math.floor(s / 4)]; if (feel === 'surf' && s % 8 === 4) n += 7;
    const o = A.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n); const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 520; f.Q.value = 4; const g = A.ctx.createGain(); const d = spb * bassEvery * 0.9; env(g, t, 0.004, 0.42, d * 0.8, 0.12, 0.04, d);
    o.connect(f); f.connect(g); g.connect(bus); o.start(t); o.stop(t + d + 0.1);
  }
  // guitar
  if (feel !== 'lounge' || sec === 'chorus') {
    const r = M.riff[s]; const playG = sec === 'chorus' || sec === 'solo' ? (s % 8 === 0 ? 2 : r) : sec === 'break' ? (s === 0 ? 2 : 0) : r;
    if (playG && !(sec === 'intro' && M.bar % 4 < 1 && s > 0)) {
      const sustained = playG === 2 && (sec === 'chorus' || half || s === 0); const d = sustained ? spb * (half ? 8 : 4) : spb * 0.7; const n = root + (playG === 3 ? 7 : 0);
      for (const iv of [0, 7, 12]) { const o = A.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(n + iv) * (1 + (Math.random() - 0.5) * 0.004); const g = A.ctx.createGain(); env(g, t, 0.003, sustained ? 0.32 : 0.25, d * 0.9, sustained ? 0.12 : 0.0001, 0.05, d); const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = sustained ? 2600 : 900; o.connect(f); f.connect(g); g.connect(guitarBus); o.start(t); o.stop(t + d + 0.12); }
    }
  }
  // lead (chorus/solo), or organ-ish stabs for party/lounge
  if ((sec === 'solo' || (sec === 'chorus' && I > 0.4) || feel === 'creep') && M.lead[s] >= 0 && s % 2 === 0) {
    const n = scaleNote(M.lead[s] + chordDeg, 1) + (feel === 'creep' ? 12 : 0); const d = spb * 1.8; const o = A.ctx.createOscillator(); o.type = feel === 'creep' ? 'triangle' : 'square'; o.frequency.value = mtof(n);
    const vib = A.ctx.createOscillator(); vib.frequency.value = 6; const vg = A.ctx.createGain(); vg.gain.value = mtof(n) * 0.012; vib.connect(vg); vg.connect(o.frequency); const g = A.ctx.createGain(); env(g, t, 0.01, 0.07, d, 0.03, 0.08, d);
    const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2400; o.connect(f); f.connect(g); g.connect(feel === 'creep' ? bus : guitarBus); o.start(t); vib.start(t); o.stop(t + d + 0.1); vib.stop(t + d + 0.1);
  }
  if ((feel === 'party' || feel === 'lounge') && (s === 4 || s === 12 || (feel === 'lounge' && s === 10))) {
    for (const iv of [0, 4, 7]) { const sc = SCALES[st.scale]; const n = scaleNote(chordDeg + [0, 2, 4][[0, 4, 7].indexOf(iv)], 1); osc(t, 'triangle', mtof(n), mtof(n), spb * 1.5, 0.06, bus, 0.005); }
  }
}

// ---------------- SFX ----------------
let listener = { x: 0, z: 0, yaw: 0 };
export function setListener(x, z, yaw) { listener.x = x; listener.z = z; listener.yaw = yaw; }
function spatial(pos, vol = 1) {
  if (!pos) return { dest: sfxBus, v: vol };
  const dx = pos.x - listener.x, dz = pos.z - listener.z, d = Math.hypot(dx, dz); const att = 1 / (1 + d * 0.12); if (att < 0.04) return null;
  let dest = sfxBus; if (A.ctx.createStereoPanner) { const p = A.ctx.createStereoPanner(); const ang = Math.atan2(dx, -dz) + listener.yaw; p.pan.value = Math.max(-0.85, Math.min(0.85, Math.sin(-ang) * -1)); p.connect(sfxBus); dest = p; setTimeout(() => p.disconnect(), 3000); }
  return { dest, v: vol * att };
}
const lastPlay = {};
export function sfx(name, pos, vol = 1) {
  if (!A.on || A.ctx.state !== 'running') return; const t = now();
  if (lastPlay[name] && t - lastPlay[name] < 0.025 && name !== 'pistol') return; lastPlay[name] = t;
  const sp = spatial(pos, vol); if (!sp) return; const D = sp.dest, v = sp.v; const r = 0.92 + Math.random() * 0.16;
  switch (name) {
    case 'pistol': noise(t, 0.12, 'bandpass', 1300 * r, 0.8, 0.9 * v, D); osc(t, 'sine', 160, 45, 0.12, 0.8 * v, D); noise(t, 0.3, 'lowpass', 600, 0.5, 0.25 * v, D, 0.005); break;
    case 'rifle': noise(t, 0.08, 'bandpass', 1800 * r, 0.7, 0.85 * v, D); osc(t, 'sine', 190, 50, 0.09, 0.7 * v, D); noise(t, 0.22, 'highpass', 2500, 0.5, 0.18 * v, D); break;
    case 'shotgun': noise(t, 0.3, 'lowpass', 2200 * r, 0.6, 1.0 * v, D); osc(t, 'sine', 120, 35, 0.25, 1.0 * v, D); noise(t, 0.6, 'lowpass', 500, 0.5, 0.4 * v, D, 0.01); break;
    case 'pump': noise(t, 0.05, 'highpass', 2000, 1, 0.4 * v, D); noise(t + 0.12, 0.06, 'highpass', 1500, 1, 0.45 * v, D); break;
    case 'defib': osc(t, 'sawtooth', 300, 2400, 0.18, 0.25 * v, D); noise(t + 0.15, 0.25, 'bandpass', 3000, 2, 0.7 * v, D); osc(t + 0.15, 'square', 90, 60, 0.25, 0.35 * v, D); break;
    case 'kennedyRifle': noise(t, 0.07, 'bandpass', 1600 * r, 0.7, 0.6 * v, D); osc(t, 'sine', 170, 50, 0.08, 0.5 * v, D); break;
    case 'reload': noise(t, 0.03, 'highpass', 3000, 2, 0.5 * v, D); noise(t + 0.25, 0.04, 'bandpass', 1800, 2, 0.6 * v, D); noise(t + 0.45, 0.03, 'highpass', 2500, 2, 0.6 * v, D); break;
    case 'empty': noise(t, 0.02, 'highpass', 4000, 3, 0.4 * v, D); break;
    case 'swap': noise(t, 0.05, 'bandpass', 900, 2, 0.4 * v, D); noise(t + 0.08, 0.04, 'highpass', 2600, 2, 0.4 * v, D); break;
    case 'bedpan': osc(t, 'triangle', 820 * r, 760, 0.35, 0.5 * v, D); osc(t, 'sine', 1640 * r, 1500, 0.4, 0.25 * v, D); noise(t, 0.05, 'lowpass', 1200, 1, 0.6 * v, D); break;
    case 'whoosh': noise(t, 0.18, 'bandpass', 700, 0.8, 0.3 * v, D, 0.06); break;
    case 'hit': noise(t, 0.08, 'lowpass', 900 * r, 1.2, 0.7 * v, D); osc(t, 'sine', 260 * r, 90, 0.1, 0.4 * v, D); break;
    case 'splat': noise(t, 0.22, 'lowpass', 700 * r, 2, 0.9 * v, D); osc(t, 'sine', 300 * r, 60, 0.18, 0.5 * v, D); noise(t + 0.05, 0.15, 'bandpass', 400, 3, 0.4 * v, D); break;
    case 'headpop': noise(t, 0.05, 'highpass', 1500, 1, 0.8 * v, D); noise(t, 0.35, 'lowpass', 600, 2, 1.0 * v, D); osc(t, 'sine', 420, 50, 0.3, 0.6 * v, D); break;
    case 'gib': noise(t, 0.15, 'lowpass', 500 * r, 3, 0.6 * v, D); break;
    case 'groan': { const dur = 0.6 + Math.random() * 0.7, f0 = 70 + Math.random() * 60; const o = A.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f0 * (0.7 + Math.random() * 0.6), t + dur); const lfo = A.ctx.createOscillator(); lfo.frequency.value = 5 + Math.random() * 5; const lg = A.ctx.createGain(); lg.gain.value = f0 * 0.08; lfo.connect(lg); lg.connect(o.frequency);
      const f1 = A.ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 500 + Math.random() * 300; f1.Q.value = 5; const f2 = A.ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1000 + Math.random() * 400; f2.Q.value = 6; const g = A.ctx.createGain(); env(g, t, 0.12, 0.5 * v, dur, 0.2 * v, 0.2, dur); o.connect(f1); o.connect(f2); f1.connect(g); f2.connect(g); g.connect(D); o.start(t); lfo.start(t); o.stop(t + dur + 0.3); lfo.stop(t + dur + 0.3); break; }
    case 'zattack': noise(t, 0.25, 'bandpass', 600, 2, 0.6 * v, D, 0.02); osc(t, 'sawtooth', 120, 80, 0.25, 0.25 * v, D, 0.02); break;
    case 'hurt': osc(t, 'sine', 90, 40, 0.2, 0.9 * v, D); noise(t, 0.15, 'lowpass', 400, 1, 0.6 * v, D); osc(t + 0.02, 'triangle', 330, 200, 0.18, 0.15 * v, D); break;
    case 'burger': for (let i = 0; i < 4; i++) noise(t + i * 0.04, 0.03, 'highpass', 3000 + Math.random() * 2000, 1, 0.25 * v, D); osc(t + 0.12, 'sine', 1320, 1320, 0.25, 0.25 * v, D); osc(t + 0.2, 'sine', 1760, 1760, 0.3, 0.22 * v, D); break;
    case 'coke': noise(t, 0.05, 'bandpass', 1200, 3, 0.4 * v, D); noise(t + 0.05, 0.5, 'highpass', 6000, 0.5, 0.25 * v, D, 0.02); osc(t + 0.15, 'sine', 1568, 1568, 0.25, 0.2 * v, D); break;
    case 'finger': osc(t, 'sine', 900 * r, 1400 * r, 0.08, 0.2 * v, D); break;
    case 'health': osc(t, 'sine', 660, 660, 0.12, 0.25 * v, D); osc(t + 0.1, 'sine', 990, 990, 0.2, 0.25 * v, D); break;
    case 'ammo': noise(t, 0.04, 'bandpass', 2000, 2, 0.4 * v, D); noise(t + 0.06, 0.04, 'bandpass', 2600, 2, 0.4 * v, D); break;
    case 'giggle': for (let i = 0; i < 4; i++) { const tt = t + i * 0.16; const o = A.ctx.createOscillator(); o.type = 'triangle'; o.frequency.setValueAtTime(i === 0 ? 700 : 1100, tt); o.frequency.exponentialRampToValueAtTime(i === 0 ? 1300 : 1500, tt + 0.06); o.frequency.exponentialRampToValueAtTime(900, tt + 0.13); const f = A.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 2; const g = A.ctx.createGain(); env(g, tt, 0.01, 0.35 * v, 0.12); o.connect(f); f.connect(g); g.connect(D); o.start(tt); o.stop(tt + 0.2); } break;
    case 'roar': { const o = A.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(60, t); o.frequency.linearRampToValueAtTime(42, t + 1.4); const f = A.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 500; const g = A.ctx.createGain(); env(g, t, 0.15, 0.8 * v, 1.3, 0.3, 0.3, 1.2); o.connect(f); f.connect(g); g.connect(D); o.start(t); o.stop(t + 1.8); noise(t, 1.4, 'bandpass', 300, 1, 0.6 * v, D, 0.15); break; }
    case 'phone': for (let i = 0; i < 2; i++) { osc(t + i * 0.5, 'sine', 440, 440, 0.35, 0.18 * v, D); osc(t + i * 0.5, 'sine', 480, 480, 0.35, 0.18 * v, D); } break;
    case 'crash': noise(t, 1.0, 'lowpass', 1800, 0.5, 1.0 * v, D); osc(t, 'sine', 80, 30, 0.6, 1.0 * v, D); for (let i = 0; i < 6; i++) noise(t + 0.05 + i * 0.07, 0.1, 'highpass', 3000 + i * 500, 2, 0.3 * v, D); break;
    case 'click': osc(t, 'square', 1200, 1200, 0.03, 0.12 * v, D); break;
    case 'buy': osc(t, 'square', 880, 880, 0.06, 0.15 * v, D); osc(t + 0.07, 'square', 1320, 1320, 0.12, 0.15 * v, D); noise(t + 0.05, 0.2, 'highpass', 5000, 1, 0.2 * v, D); break;
    case 'sting': [0, 4, 7, 12].forEach((iv, i) => osc(t + i * 0.09, 'sawtooth', mtof(57 + iv), mtof(57 + iv), 0.6, 0.12 * v, D)); break;
    case 'heart': osc(t, 'sine', 60, 40, 0.12, 0.6 * v, D); osc(t + 0.18, 'sine', 55, 38, 0.12, 0.45 * v, D); break;
    case 'splash': noise(t, 0.5, 'lowpass', 1500, 0.5, 0.6 * v, D, 0.02); break;
    case 'explode': noise(t, 1.2, 'lowpass', 900, 0.5, 1.2 * v, D); osc(t, 'sine', 70, 25, 0.8, 1.2 * v, D); break;
    case 'spit': noise(t, 0.2, 'bandpass', 900, 2, 0.5 * v, D, 0.02); break;
    case 'shh': noise(t, 0.9, 'highpass', 3500, 0.6, 0.5 * v, D, 0.08); break;
    case 'bee': osc(t, 'sawtooth', 220, 240, 0.5, 0.06 * v, D); break;
    case 'engine': osc(t, 'sawtooth', 50, 90, 1.2, 0.3 * v, D, 0.1); noise(t, 1.2, 'lowpass', 300, 1, 0.3 * v, D, 0.1); break;
  }
}
