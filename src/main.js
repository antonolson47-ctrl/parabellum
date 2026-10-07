// Boot: DOM, CSS, engine, save, characters, HUD portrait, then the game.
import { CSS } from './style.js';
import { initEngine, E } from './engine.js';
import { load, S } from './save.js';
import { buildHUD, H } from './hud.js';
import { initChars } from './chars.js';
import { renderPortrait } from './story.js';
import { initGame } from './game.js';
window.__PB_ERRORS = [];
addEventListener('error', e => { window.__PB_ERRORS.push(String(e.message || e)); });
addEventListener('unhandledrejection', e => { window.__PB_ERRORS.push('rej: ' + String(e.reason && (e.reason.stack || e.reason.message) || e.reason)); });
async function boot() {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  document.body.insertAdjacentHTML('beforeend', `<canvas id="c"></canvas><div id="ui"></div><div class="load" id="boot"><div style="font-family:'Butcherman','Black Ops One';font-size:min(12vw,84px);color:#e8e2d0;text-shadow:0 0 18px rgba(255,0,0,.55),0 4px 0 #5a0000">PARABELLUM</div><div style="font-size:14px;color:#ffd84a;margin-top:6px">Scrubbing in…</div><div class="lb"><div id="bootbar"></div></div></div>`);
  load();
  initEngine(document.getElementById('c'), S.data.settings.quality);
  buildHUD(document.getElementById('ui'));
  try { await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]); await Promise.all(["400 20px 'Black Ops One'", "400 20px Butcherman", "400 20px 'Permanent Marker'", "500 20px Teko", "600 20px 'Barlow Condensed'", "800 20px 'Barlow Condensed'"].map(f => document.fonts.load(f).catch(() => { }))); } catch (e) { }
  const bar = document.getElementById('bootbar');
  await initChars(p => { bar.style.width = (p * 100) + '%'; });
  try { H.portimg.src = renderPortrait(); } catch (e) { console.warn('portrait', e); }
  initGame();
  document.getElementById('boot').remove();
  document.title = 'PARABELLUM';
}
function bootMsg(html) { const b = document.getElementById('boot'); if (!b) return; let m = document.getElementById('bootmsg'); if (!m) { m = document.createElement('div'); m.id = 'bootmsg'; m.style.cssText = 'margin-top:14px;max-width:86vw;font:600 15px/1.35 system-ui,-apple-system,sans-serif;color:#ffd0c8;text-align:center'; b.appendChild(m); } m.innerHTML = html; }
const retryBtn = '<br><button onclick="location.reload()" style="margin-top:10px;font:700 16px system-ui;padding:9px 18px;border-radius:10px;border:2px solid #ff9a8a;background:#a3170f;color:#fff">RETRY</button>';
const slow = setTimeout(() => bootMsg('Still loading… on a slow connection this can take a minute.' + retryBtn), 45000);
boot().then(() => clearTimeout(slow)).catch(e => { clearTimeout(slow); console.error(e); window.__PB_ERRORS.push('boot: ' + (e.stack || e.message)); document.title = 'ERR ' + e.message;
  bootMsg('The game failed to load: ' + String(e && e.message || e).replace(/</g, '&lt;') + retryBtn); window.__PBshowErr && window.__PBshowErr('boot: ' + (e && e.message || e)); });
