// Twin-stick touch controls + keyboard/mouse. Produces I.move{x,y}, I.lookDX/DY (radians), I.fire, and edge-triggered I.pressed.*
// Touch: left side = floating move stick, right side (anywhere outside buttons) = look pad. Dragging on FIRE also looks.
// Every finger is tracked by its own id, so stick + look + fire all work at the same time.
// Real phones use Touch Events (iOS keeps delivering them even when it fires pointercancel for its own gestures);
// Pointer Events remain as the fallback for browsers/tests without touch events, and for mouse/pen.
import { clamp } from './util.js';
export const I = { move: { x: 0, y: 0 }, lookDX: 0, lookDY: 0, fire: false, sprint: false, pressed: {}, enabled: false, sens: 1, invertY: false, touchMode: false, keys: {}, api: null, lookDrags: 0, lookPx: 0 };
let stickEl, knobEl, ui, fireEl, layer;
const ptrs = new Map(); // 't'+touchId | 'p'+pointerId -> {kind:'stick'|'look'|'fire', x0,y0,x,y,t,moved}
let liveIds = new Set(); // touch ids currently on the glass (from the latest touch event)
const LOOK_FIRE_DEADZONE = 9; // px a FIRE-held thumb must travel before it starts turning (no aim jitter from just holding)
function zoneKind(x, y) {
  const left = x < innerWidth * (innerWidth > innerHeight ? 0.42 : 0.5) && y > innerHeight * 0.25;
  let kind = left ? 'stick' : 'look'; if (kind === 'stick') for (const p of ptrs.values()) if (p.kind === 'stick') kind = 'look';
  return kind;
}
function tStart(key, x, y, kind) {
  I.touchMode = true; const p = { kind, x0: x, y0: y, x, y, t: performance.now(), moved: 0 }; ptrs.set(key, p);
  if (kind === 'stick' && stickEl) { stickEl.style.left = x + 'px'; stickEl.style.top = y + 'px'; stickEl.classList.add('on'); }
  if (kind === 'fire') I.fire = true;
  if (kind === 'look') I.lookDrags++;
  return p;
}
function tMove(key, x, y) {
  const p = ptrs.get(key); if (!p) return false; const now = performance.now();
  const dx = x - p.x, dy = y - p.y;
  if (p.kind === 'look' || p.kind === 'fire') {
    p.moved += Math.hypot(dx, dy);
    if (p.kind === 'fire' && p.moved < LOOK_FIRE_DEADZONE) { p.x = x; p.y = y; p.t = now; return true; }
    // a full-width swipe ~ 180 degrees; mild acceleration for fast flicks so you can spin around quickly
    const dtm = Math.max(4, now - p.t), v = Math.hypot(dx, dy) / dtm; // px per ms
    const acc = 1 + 0.5 * clamp((v - 0.5) / 1.5, 0, 1);
    const k = Math.PI / Math.max(320, innerWidth) * I.sens * acc;
    I.lookDX += dx * k; I.lookDY += dy * k * 0.8 * (I.invertY ? -1 : 1); I.lookPx += Math.abs(dx);
  }
  p.x = x; p.y = y; p.t = now;
  if (p.kind === 'stick') updateStick(p);
  return true;
}
function tEnd(key) {
  const p = ptrs.get(key); if (!p) return; ptrs.delete(key);
  if (p.kind === 'stick') { I.move.x = I.move.y = 0; I.sprint = false; if (stickEl) { stickEl.classList.remove('on'); knobEl.style.transform = ''; placeStickHome(); } }
  if (p.kind === 'fire') { let still = false; for (const q of ptrs.values()) if (q.kind === 'fire') still = true; if (!still) I.fire = false; }
}
export function fireHeldByTouch() { for (const [k, q] of ptrs) if (q.kind === 'fire') return true; return false; }
export function initInput(uiRoot) {
  ui = uiRoot;
  layer = document.getElementById('touch'); fireEl = document.getElementById('bfire');
  stickEl = document.querySelector('.stick'); knobEl = stickEl && stickEl.querySelector('.knob');
  // ── Touch Events (primary on phones/tablets)
  const onTS = e => {
    I.api = 'touch'; for (const k of [...ptrs.keys()]) if (k[0] === 'p') tEnd(k); // a real touch device: drop any pointer-tracked touches
    liveIds = new Set([...e.touches].map(t => t.identifier));
    if (!I.enabled) return;
    for (const t of e.changedTouches) {
      const tg = t.target && t.target.closest ? t.target : (t.target && t.target.parentElement);
      if (!tg) continue;
      if (tg.closest('#bfire')) { tStart('t' + t.identifier, t.clientX, t.clientY, 'fire'); continue; }
      if (tg.closest('#touch')) { tStart('t' + t.identifier, t.clientX, t.clientY, zoneKind(t.clientX, t.clientY)); if (e.cancelable && tg.closest('#touch')) e.preventDefault(); }
    }
  };
  const onTM = e => {
    liveIds = new Set([...e.touches].map(t => t.identifier)); let used = false;
    for (const t of e.changedTouches) if (tMove('t' + t.identifier, t.clientX, t.clientY)) used = true;
    if (used && e.cancelable) e.preventDefault();
  };
  const onTE = e => { liveIds = new Set([...e.touches].map(t => t.identifier)); for (const t of e.changedTouches) tEnd('t' + t.identifier); };
  document.addEventListener('touchstart', onTS, { passive: false, capture: true });
  document.addEventListener('touchmove', onTM, { passive: false, capture: true });
  document.addEventListener('touchend', onTE, { capture: true }); document.addEventListener('touchcancel', onTE, { capture: true });
  // ── Pointer Events (mouse/pen always; touch only when the browser never sends touch events)
  const ptrTouch = e => e.pointerType !== 'mouse' && I.api !== 'touch';
  layer.addEventListener('pointerdown', e => {
    if (!I.enabled) return; e.preventDefault();
    if (e.pointerType === 'mouse') {
      I.touchMode = false;
      if (!document.pointerLockElement && layer.requestPointerLock) { try { const p = layer.requestPointerLock(); p && p.catch && p.catch(() => { }); } catch (er) { } }
      if (e.button === 0) I.fire = true; I.mouseDrag = { x: e.clientX, y: e.clientY }; return;
    }
    if (!ptrTouch(e)) return;
    tStart('p' + e.pointerId, e.clientX, e.clientY, zoneKind(e.clientX, e.clientY));
    try { layer.setPointerCapture(e.pointerId); } catch (er) { }
  });
  layer.addEventListener('pointermove', e => {
    if (!I.enabled) return;
    if (e.pointerType === 'mouse') {
      if (document.pointerLockElement) { I.lookDX += e.movementX * 0.0022 * I.sens; I.lookDY += e.movementY * 0.0022 * I.sens * (I.invertY ? -1 : 1); }
      else if (I.mouseDrag && (e.buttons & 1)) { const dx = e.clientX - I.mouseDrag.x, dy = e.clientY - I.mouseDrag.y; I.mouseDrag = { x: e.clientX, y: e.clientY }; I.lookDX += dx * 0.0042 * I.sens; I.lookDY += dy * 0.0042 * I.sens * (I.invertY ? -1 : 1); }
      return;
    }
    if (!ptrTouch(e)) return; if (!ptrs.has('p' + e.pointerId)) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e]; const last = evs[evs.length - 1] || e;
    tMove('p' + e.pointerId, last.clientX, last.clientY);
  });
  const end = e => {
    if (e.pointerType === 'mouse') { if (e.button === 0 || e.type !== 'pointerup') I.fire = false; I.mouseDrag = null; return; }
    if (I.api === 'touch') return; tEnd('p' + e.pointerId);
  };
  layer.addEventListener('pointerup', end); layer.addEventListener('pointercancel', end); layer.addEventListener('lostpointercapture', end);
  // FIRE doubles as a look pad (pointer fallback path; the touch path handles it in onTS/onTM)
  if (fireEl) {
    fireEl.addEventListener('pointerdown', e => { if (!I.enabled || !ptrTouch(e)) return; tStart('p' + e.pointerId, e.clientX, e.clientY, 'fire'); });
    fireEl.addEventListener('pointermove', e => { if (!ptrTouch(e)) return; tMove('p' + e.pointerId, e.clientX, e.clientY); });
    const fe = e => { if (I.api !== 'touch' && e.pointerType !== 'mouse') tEnd('p' + e.pointerId); };
    fireEl.addEventListener('pointerup', fe); fireEl.addEventListener('pointercancel', fe); fireEl.addEventListener('lostpointercapture', fe);
  }
  addEventListener('keydown', e => {
    I.keys[e.code] = true; if (!I.enabled) return;
    const m = { KeyR: 'reload', KeyQ: 'swap', Digit1: 'w0', Digit2: 'w1', Digit3: 'w2', Digit4: 'w3', KeyF: 'melee', KeyE: 'call', Escape: 'pause', KeyP: 'pause', KeyT: 'autofire', KeyC: 'turn180', KeyX: 'turn180' }[e.code];
    if (m) I.pressed[m] = true; if (e.code === 'Space') I.fire = true;
    if (e.code.startsWith('Arrow')) e.preventDefault();
  });
  addEventListener('keyup', e => { I.keys[e.code] = false; if (e.code === 'Space') I.fire = false; });
  addEventListener('wheel', e => { if (I.enabled) I.pressed.swap = true; }, { passive: true });
  addEventListener('blur', () => { I.fire = false; I.move.x = I.move.y = 0; for (const k in I.keys) I.keys[k] = false; clearTouches(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { I.fire = false; for (const k in I.keys) I.keys[k] = false; clearTouches(true); } });
  placeStickHome();
  addEventListener('resize', placeStickHome);
}
function placeStickHome() { if (!stickEl) return; stickEl.style.left = (Math.max(90, innerWidth * 0.11)) + 'px'; stickEl.style.top = (innerHeight - Math.max(100, innerHeight * 0.2)) + 'px'; }
function updateStick(p) {
  const R = 56; let dx = p.x - p.x0, dy = p.y - p.y0; const d = Math.hypot(dx, dy);
  if (d > R * 1.6) { const k = (d - R * 1.6) / d; p.x0 += dx * k; p.y0 += dy * k; dx = p.x - p.x0; dy = p.y - p.y0; if (stickEl) { stickEl.style.left = p.x0 + 'px'; stickEl.style.top = p.y0 + 'px'; } }
  const dd = Math.min(R, Math.hypot(dx, dy)); const a = Math.atan2(dy, dx);
  const kx = Math.cos(a) * dd, ky = Math.sin(a) * dd;
  if (knobEl) knobEl.style.transform = `translate(${kx}px,${ky}px)`;
  const mag = dd / R; const dz = 0.12; const m2 = mag < dz ? 0 : (mag - dz) / (1 - dz);
  I.move.x = Math.cos(a) * m2; I.move.y = -Math.sin(a) * m2; I.sprint = Math.hypot(dx, dy) > R * 1.25;
}
export function bindButton(el, onDown, onUp) {
  el.classList.add('pe');
  el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); el.classList.add('down'); try { el.setPointerCapture(e.pointerId); } catch (er) { } onDown && onDown(e); });
  const up = e => { el.classList.remove('down'); onUp && onUp(e); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
}
// keyboard: WASD move/strafe, arrow keys turn (left/right) and look (up/down), C or X = 180
export function pollKeyboard(dt = 1 / 60) {
  const k = I.keys;
  if (I.enabled) { const turn = (k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0), tilt = (k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0); if (turn) I.lookDX += turn * 2.6 * dt; if (tilt) I.lookDY += tilt * 1.6 * dt; }
  if (I.touchMode && ptrs.size) return; let x = 0, y = 0;
  if (k.KeyW) y += 1; if (k.KeyS) y -= 1; if (k.KeyA) x -= 1; if (k.KeyD) x += 1;
  if (x || y) { const l = Math.hypot(x, y); I.move.x = x / l; I.move.y = y / l; I.sprint = !!(k.ShiftLeft || k.ShiftRight); I.kbMove = true; }
  else if (I.kbMove) { I.move.x = I.move.y = 0; I.kbMove = false; I.sprint = false; }
}
export function consumeLook() { const r = [I.lookDX, I.lookDY]; I.lookDX = I.lookDY = 0; return r; }
export function consumePressed() { const p = I.pressed; I.pressed = {}; return p; }
export function activeTouches() { const r = {}; for (const p of ptrs.values()) r[p.kind] = (r[p.kind] || 0) + 1; return r; }
// Clears stuck controls. Fingers that are still on the glass (per the latest touch event) keep working unless `all`.
export function clearTouches(all) {
  let stickLeft = false;
  for (const [k, p] of [...ptrs]) {
    const live = !all && k[0] === 't' && liveIds.has(+k.slice(1));
    if (live) { if (p.kind === 'stick') stickLeft = true; continue; }
    ptrs.delete(k);
  }
  if (!stickLeft) { I.move.x = I.move.y = 0; I.sprint = false; if (stickEl) { stickEl.classList.remove('on'); if (knobEl) knobEl.style.transform = ''; placeStickHome(); } }
  if (I.touchMode && !fireHeldByTouch()) I.fire = false; document.querySelectorAll('#ui .btn.down').forEach(b => { if (b.id !== 'bfire' || !fireHeldByTouch()) b.classList.remove('down'); });
}
export function resetInput() { I.fire = false; I.move.x = I.move.y = 0; I.lookDX = I.lookDY = 0; I.pressed = {}; ptrs.clear(); if (stickEl) { stickEl.classList.remove('on'); if (knobEl) knobEl.style.transform = ''; } }
