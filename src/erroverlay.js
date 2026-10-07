/* Tiny on-screen error box (inlined in <head> before the game) so a phone player can screenshot what broke. */
(function () {
  var box = null, n = 0;
  function show(msg) {
    try {
      msg = String(msg || 'unknown error'); if (/ResizeObserver loop|GPU stall/.test(msg)) return;
      if (!box) {
        box = document.createElement('div'); box.id = 'pberr';
        box.style.cssText = 'position:fixed;left:8px;right:8px;bottom:8px;z-index:2147483647;background:rgba(110,0,0,.94);color:#fff;font:13px/1.35 -apple-system,system-ui,sans-serif;padding:10px 12px;border-radius:10px;border:2px solid #ff8a80;max-height:38vh;overflow:auto;white-space:pre-wrap;word-break:break-word;pointer-events:auto;box-shadow:0 6px 20px rgba(0,0,0,.6)';
        box.innerHTML = '<b>PARABELLUM hit an error.</b> Screenshot this and send it over. <span style="opacity:.75">(tap to hide)</span>\n';
        box.addEventListener('click', function () { box.style.display = 'none'; });
        (document.body || document.documentElement).appendChild(box);
      }
      if (n++ < 6) box.appendChild(document.createTextNode('\n• ' + msg.slice(0, 300)));
      box.style.display = 'block';
    } catch (e) { }
  }
  window.__PBshowErr = show;
  window.addEventListener('error', function (e) { if (e && e.message) show(e.message + (e.filename ? ' (' + String(e.filename).split('/').pop().slice(0, 40) + ':' + e.lineno + ')' : '')); });
  window.addEventListener('unhandledrejection', function (e) { var r = e && e.reason; show('promise: ' + (r && (r.message || r) || 'rejected')); });
})();
