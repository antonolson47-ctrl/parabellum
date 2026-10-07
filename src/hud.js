// DOM HUD (vitals monitor, objective/progress, resources, buttons, subtitles, toasts, rule cards, floats, lock brackets)
import * as THREE from 'three';
export const FINGER = `<svg viewBox="0 0 24 24"><path d="M9 22c-2 0-3-1.5-3-3.5V11c0-1 .8-1.6 1.6-1.4.6.1 1 .7 1 1.3V4.2C8.6 3 9.4 2 10.5 2s1.9 1 1.9 2.2V12l.2-1.2c.2-.8 1-1.2 1.8-1 .7.2 1.1.9 1 1.6l-.2 1.1.3-.6c.4-.7 1.2-.9 1.9-.5.6.4.8 1.1.5 1.8L16.2 18c-.8 2.4-2.4 4-5 4z" fill="#a8b98d" stroke="#3b4a2a" stroke-width="1.1"/><path d="M9.6 4.4c.2-1 1.6-1 1.8 0" stroke="#e8e0b0" stroke-width="1.2" fill="none"/><circle cx="9" cy="21" r="1.6" fill="#8a0d12"/></svg>`;
function ecg(w = 220, h = 16, col = '#7dffa8') {
  let d = `M0 ${h / 2}`; const seg = 50;
  for (let x = 0; x < w; x += seg) d += ` L${x + seg * .3} ${h / 2} L${x + seg * .38} ${h * .35} L${x + seg * .44} ${h / 2} L${x + seg * .5} ${h * .02} L${x + seg * .56} ${h * .98} L${x + seg * .62} ${h / 2} L${x + seg * .78} ${h * .38} L${x + seg * .86} ${h / 2} L${x + seg} ${h / 2}`;
  return `<svg width="${w}" height="${h}"><path d="${d}" fill="none" stroke="${col}" stroke-width="1.6"/></svg>`;
}
export const H = {};
const $ = s => H.root.querySelector(s);
export function buildHUD(root) {
  H.root = root;
  root.innerHTML = `<div id="touch"></div><div class="hud hidden" id="hud">
  <div class="bloodv"></div><div class="vign"></div><div class="lowhp"></div>
  <div class="vitals"><div class="port"><img id="portimg" alt=""></div><div class="monitor"><div class="row"><span>SHAYLA, RN</span><span class="hr">♥ <span id="bpm">88</span></span></div><div class="ecg">${ecg()}</div><div class="bar"><div id="hpbar"></div></div></div></div>
  <div class="kbar" id="kbar"><span>KENNEDY</span><div class="bar"><div id="khp"></div></div></div>
  <div class="obj"><div class="t" id="objt"></div><div class="s" id="objs"></div><div class="prog"><div id="progv"></div><span class="half"></span><span class="halflbl" id="halflbl">📞 Kennedy at 50%</span></div></div>
  <div class="boss" id="boss"><div class="n" id="bossn"></div><div class="bar"><div id="bossv"></div></div></div>
  <div class="res"><div class="chip" id="chipf">${FINGER}<span id="fingers">0</span></div><div class="chip" id="chipb"><span class="e">🍔</span><span id="burgers">0/120</span></div><div class="chip" id="chipc"><span class="e">🥤</span><span id="cokes">0/120</span></div></div>
  <div class="pausebtn pe" id="pausebtn"><i></i><i></i></div>
  <div class="resetv pe" id="resetv" title="Reset view (zoom + camera)"><svg viewBox="0 0 24 24" width="17" height="17"><circle cx="10" cy="10" r="6.2" fill="none" stroke="#fff" stroke-width="2.2"/><path d="M14.6 14.6l6 6" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/><path d="M10 6.6v6.8M6.6 10h6.8" stroke="#ffd84a" stroke-width="1.8"/></svg><span>RESET</span></div>
  <div class="xh" id="xh"></div><div class="hitm" id="hitm"></div>
  <div class="lock" id="lock"><i></i><i></i><i></i><i></i></div>
  <div class="marker" id="marker">EXIT</div>
  <div id="floats"></div>
  <div class="stick"><div class="knob"></div><span class="lbl">Move</span></div>
  <div class="btn fire" id="bfire">FIRE<span class="lbl">Hold</span></div>
  <div class="btn reload" id="breload">⟳<span class="lbl">Reload</span></div>
  <div class="btn swap" id="bswap"><svg width="40" height="22" viewBox="0 0 40 22"><path d="M2 6h26l2-3h4v5h-4v3H18l-2 2v7h-7l2-9H2z" fill="#fff"/></svg><span class="lbl">Swap</span></div>
  <div class="btn melee" id="bmelee"><svg id="bedpanico" width="30" height="20" viewBox="0 0 30 20"><ellipse cx="12" cy="11" rx="11" ry="7" fill="none" stroke="#fff" stroke-width="2.5"/><ellipse cx="12" cy="11" rx="5" ry="3" fill="#fff"/><rect x="21" y="8" width="9" height="5" rx="2" fill="#fff"/></svg><span id="callico" style="display:none">📞</span><span class="lbl" id="meleelbl">Bedpan</span></div>
  <div class="pill on autofire pe" id="autofire">AUTO-FIRE ●</div>
  <div class="ammo" id="ammo"><b id="mag">17</b><span id="res"> / ∞</span><i id="wname">TRUSTY 9MM</i></div>
  <div class="sub" id="sub"></div>
  <div class="rule" id="rule"><h4 id="ruleh"></h4><span id="rulet"></span></div>
  <div class="toast" id="toast"><span id="toastt"></span><small id="toasts"></small></div>
  <div class="portraitHint" id="phint">↻ Rotate for the best view<br><small>Portrait works too</small></div>
  </div><div id="screens"></div>`;
  for (const id of ['hpbar', 'bpm', 'khp', 'kbar', 'objt', 'objs', 'progv', 'halflbl', 'boss', 'bossn', 'bossv', 'fingers', 'burgers', 'cokes', 'chipf', 'chipb', 'chipc', 'xh', 'hitm', 'lock', 'marker', 'floats', 'mag', 'res', 'wname', 'ammo', 'sub', 'rule', 'ruleh', 'rulet', 'toast', 'toastt', 'toasts', 'autofire', 'bmelee', 'bswap', 'bedpanico', 'callico', 'meleelbl', 'hud', 'screens', 'phint', 'portimg', 'resetv'])
    H[id] = root.querySelector('#' + id);
  H.bloodv = $('.bloodv'); H.lowhp = $('.lowhp'); H.monitor = $('.monitor');
}
export function showHUD(on) { H.hud.classList.toggle('hidden', !on); }
let subT = 0, toastT = 0, ruleT = 0, subPri = 0;
export function say(who, text, dur = 3.2, pri = 1) {
  if (subT > 0 && pri < subPri) return false;
  const cls = { SHAYLA: '', KENNEDY: 'k', KELLY: 'kl', KWEEPIE: 'kw' }[who] || '';
  H.sub.innerHTML = `<b class="${cls}">${who}:</b> ${text}`; H.sub.classList.add('show'); subT = dur; subPri = pri; return true;
}
export function toast(t, s = '', dur = 2.6, red = false) { H.toastt.textContent = t; H.toasts.textContent = s; H.toast.classList.add('show'); H.toast.classList.toggle('red', red); toastT = dur; }
export function rule(n, text) { H.ruleh.textContent = 'Survival Rule #' + n; H.rulet.textContent = text; H.rule.classList.add('show'); ruleT = 6; }
export function float(x, y, html, size = 18, color) {
  const d = document.createElement('div'); d.className = 'float'; d.style.left = x + 'px'; d.style.top = y + 'px'; d.style.fontSize = size + 'px'; if (color) d.style.color = color; d.innerHTML = html;
  H.floats.appendChild(d); setTimeout(() => d.remove(), 1150); if (H.floats.children.length > 12) H.floats.firstChild.remove();
}
export function hitMarker(head) { H.hitm.classList.remove('show', 'head'); void H.hitm.offsetWidth; H.hitm.classList.add('show'); if (head) H.hitm.classList.add('head'); }
export function bump(id) { const e = H[id]; e.classList.remove('bump'); void e.offsetWidth; e.classList.add('bump'); }
export function hudTick(dt) {
  if (subT > 0) { subT -= dt; if (subT <= 0) H.sub.classList.remove('show'); }
  if (toastT > 0) { toastT -= dt; if (toastT <= 0) H.toast.classList.remove('show'); }
  if (ruleT > 0) { ruleT -= dt; if (ruleT <= 0) H.rule.classList.remove('show'); }
}
const pv = new THREE.Vector3();
export function project(v, cam) { pv.copy(v).project(cam); return { x: (pv.x + 1) / 2 * innerWidth, y: (1 - pv.y) / 2 * innerHeight, behind: pv.z > 1 }; }
let last = {};
export function setText(id, v) { if (last[id] !== v) { last[id] = v; H[id].textContent = v; } }
export function setStyle(id, prop, v) { const k = id + prop; if (last[k] !== v) { last[k] = v; H[id].style[prop] = v; } }
export function clearHudCache() { last = {}; }
