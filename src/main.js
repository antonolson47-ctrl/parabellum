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
boot().catch(e => { console.error(e); window.__PB_ERRORS.push('boot: ' + (e.stack || e.message)); document.title = 'ERR ' + e.message; });
