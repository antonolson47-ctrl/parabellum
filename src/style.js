export const CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;overflow:hidden;-webkit-text-size-adjust:100%;text-size-adjust:100%;background:#000;color:#fff;overscroll-behavior:none;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;font-family:'Barlow Condensed',sans-serif}
#c{position:fixed;inset:0;display:block;touch-action:none}
#ui{position:fixed;inset:0;pointer-events:none;touch-action:none}
#ui *{pointer-events:none}
#ui .pe,#ui .pe *{pointer-events:auto}
/* menus + cinematics are interactive. Must use #ui-scoped selectors: a bare .screen * loses to #ui * on specificity, which made every menu ignore taps */
#ui .screen,#ui .screen *,#ui .cine,#ui .cine *{pointer-events:auto}
#ui .screen button,#ui .lvl,#ui .buybtn{touch-action:manipulation;-webkit-tap-highlight-color:rgba(255,255,255,.15);-webkit-user-select:none;user-select:none}
#ui button:disabled{opacity:.55;filter:grayscale(.6)}
#touch{position:absolute;inset:0;pointer-events:auto;touch-action:none}
.hud{position:absolute;inset:0;font-family:'Teko',sans-serif;letter-spacing:.5px}
.hud.hidden{display:none}
.vign{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(0,0,0,.5) 100%)}
.bloodv{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,transparent 45%,rgba(150,0,0,.75) 100%);opacity:0;transition:opacity .15s}
.lowhp{position:absolute;inset:0;box-shadow:inset 0 0 90px 30px rgba(200,0,0,.6);opacity:0;animation:pulse 1s infinite}
@keyframes pulse{50%{opacity:.35}}
.stick{position:absolute;width:128px;height:128px;margin:-64px 0 0 -64px;border-radius:50%;border:2px solid rgba(255,255,255,.35);background:radial-gradient(circle,rgba(255,255,255,.08),rgba(255,255,255,.02));opacity:.55;transition:opacity .2s}
.stick.on{opacity:1}
.stick .knob{position:absolute;left:50%;top:50%;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:radial-gradient(circle at 40% 35%,rgba(255,255,255,.7),rgba(200,220,210,.3));border:2px solid rgba(255,255,255,.6)}
.lbl{position:absolute;left:0;right:0;bottom:-16px;text-align:center;font-size:11px;opacity:.7;font-family:'Barlow Condensed';font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#fff}
.btn{position:absolute;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.45);background:rgba(20,24,26,.42);box-shadow:0 2px 10px rgba(0,0,0,.4);font-family:'Black Ops One';color:#fff;touch-action:none}
.btn.down{transform:scale(.92);filter:brightness(1.4)}
.btn.fire{right:calc(28px + env(safe-area-inset-right));bottom:calc(30px + env(safe-area-inset-bottom));width:96px;height:96px;background:radial-gradient(circle at 40% 35%,rgba(255,80,60,.8),rgba(150,10,10,.7));border-color:rgba(255,190,170,.8);font-size:20px;box-shadow:0 0 20px rgba(255,40,20,.45)}
.btn.reload{right:calc(138px + env(safe-area-inset-right));bottom:calc(22px + env(safe-area-inset-bottom));width:56px;height:56px;font-size:24px}
.btn.swap{right:calc(122px + env(safe-area-inset-right));bottom:calc(100px + env(safe-area-inset-bottom));width:60px;height:60px}
.btn.melee{right:calc(34px + env(safe-area-inset-right));bottom:calc(144px + env(safe-area-inset-bottom));width:56px;height:56px;font-size:22px}
.btn.melee.call{background:radial-gradient(circle,rgba(60,170,255,.85),rgba(10,60,140,.8));border-color:#9fe0ff;box-shadow:0 0 18px #3af;animation:callp .8s infinite}
@keyframes callp{50%{box-shadow:0 0 34px #6cf;transform:scale(1.08)}}
.btn.swap.glow{box-shadow:0 0 18px #ffd84a;border-color:#ffd84a}
.pill{position:absolute;padding:2px 9px;border-radius:12px;border:1.5px solid rgba(255,255,255,.5);background:rgba(10,12,14,.5);font-family:'Barlow Condensed';font-weight:800;font-size:12px;letter-spacing:1px}
.pill.on{border-color:#7dffa8;color:#b9ffd0;box-shadow:0 0 8px rgba(80,255,140,.5)}
.autofire{right:calc(190px + env(safe-area-inset-right));bottom:calc(132px + env(safe-area-inset-bottom))}
.ammo{position:absolute;right:calc(190px + env(safe-area-inset-right));bottom:calc(156px + env(safe-area-inset-bottom));text-align:right;line-height:.85;text-shadow:0 2px 4px #000}
.ammo b{font-size:36px;font-weight:500}.ammo span{font-size:21px;opacity:.75}.ammo i{display:block;font-style:normal;font-size:13px;opacity:.9;font-family:'Barlow Condensed';font-weight:800;letter-spacing:1px}
.ammo.reloading b{color:#ffd84a}
.vitals{position:absolute;left:calc(12px + env(safe-area-inset-left));top:calc(10px + env(safe-area-inset-top));display:flex;gap:8px;align-items:center}
.port{width:46px;height:46px;border-radius:50%;border:2px solid #57d68d;background:#123;overflow:hidden;box-shadow:0 0 8px rgba(0,0,0,.6)}
.port img{width:100%;height:100%;object-fit:cover}
.monitor{background:rgba(4,14,10,.72);border:1.5px solid rgba(87,214,141,.6);border-radius:6px;padding:3px 8px 4px;width:162px;overflow:hidden}
.monitor .row{display:flex;justify-content:space-between;font-size:15px;line-height:1;color:#7dffa8}
.monitor .row .hr{color:#ff6b6b}
.monitor .ecg{height:16px;overflow:hidden;position:relative}
.monitor .ecg svg{position:absolute;left:0;top:0;animation:ecg 1.2s linear infinite}
@keyframes ecg{to{transform:translateX(-50px)}}
.monitor .bar{height:7px;background:rgba(255,255,255,.12);border-radius:3px;margin-top:3px;overflow:hidden}.monitor .bar div{height:100%;width:100%;background:linear-gradient(90deg,#26c46a,#a6ff6b);transition:width .2s}
.monitor.low .bar div{background:linear-gradient(90deg,#c42626,#ff8a6b)}
.kbar{position:absolute;left:calc(12px + env(safe-area-inset-left));top:calc(64px + env(safe-area-inset-top));display:none;align-items:center;gap:6px;background:rgba(4,10,20,.7);border:1.5px solid rgba(120,190,255,.6);border-radius:6px;padding:2px 8px;font-size:14px;color:#9fd4ff}
.kbar .bar{width:90px;height:6px;background:rgba(255,255,255,.15);border-radius:3px;overflow:hidden}.kbar .bar div{height:100%;background:linear-gradient(90deg,#3a8dff,#9fe0ff)}
.obj{position:absolute;left:50%;top:calc(8px + env(safe-area-inset-top));transform:translateX(-50%);text-align:center;text-shadow:0 2px 3px #000;white-space:nowrap}
.obj .t{font-size:16px;line-height:1;font-family:'Black Ops One';letter-spacing:1px;color:#ffd84a}
.obj .s{font-size:15px;line-height:1.1;opacity:.95}
.prog{width:220px;height:7px;margin:3px auto 0;background:rgba(255,255,255,.15);border-radius:4px;position:relative}
.prog div{height:100%;border-radius:4px;background:linear-gradient(90deg,#ff9b3d,#ffd84a);width:0;transition:width .3s}
.prog .half{position:absolute;left:50%;top:-4px;width:2px;height:15px;background:#7dd3ff;box-shadow:0 0 6px #7dd3ff}
.prog .halflbl{position:absolute;left:50%;top:10px;transform:translateX(-50%);font-size:10px;color:#9fe0ff;white-space:nowrap;font-family:'Barlow Condensed';font-weight:800}
.boss{position:absolute;left:50%;top:calc(66px + env(safe-area-inset-top));transform:translateX(-50%);width:min(420px,60vw);text-align:center;display:none}
.boss .n{font-family:'Black Ops One';font-size:14px;color:#ff8080;text-shadow:0 2px 2px #000}
.boss .bar{height:10px;border:1.5px solid rgba(255,120,120,.8);background:rgba(40,0,0,.6);border-radius:5px;overflow:hidden}.boss .bar div{height:100%;background:linear-gradient(90deg,#a00,#ff4a3a);width:100%;transition:width .15s}
.res{position:absolute;right:calc(56px + env(safe-area-inset-right));top:calc(10px + env(safe-area-inset-top));display:flex;gap:6px}
.chip{display:flex;align-items:center;gap:4px;background:rgba(10,10,12,.6);border:1.5px solid rgba(255,255,255,.25);border-radius:14px;padding:1px 9px 0 5px;font-size:18px;line-height:1.3}
.chip svg{width:18px;height:18px}.chip .e{font-size:15px}
.chip.bump{animation:bump .35s}@keyframes bump{40%{transform:scale(1.25);border-color:#ffd84a}}
.pausebtn{position:absolute;right:calc(14px + env(safe-area-inset-right));top:calc(10px + env(safe-area-inset-top));width:34px;height:34px;border-radius:8px;background:rgba(10,10,12,.6);border:1.5px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;gap:4px}
.pausebtn i{width:4px;height:13px;background:#fff;border-radius:1px}
.resetv{position:absolute;right:calc(14px + env(safe-area-inset-right));top:calc(52px + env(safe-area-inset-top));height:30px;padding:0 8px 0 6px;border-radius:8px;background:rgba(10,10,12,.62);border:1.5px solid rgba(255,216,74,.7);display:flex;align-items:center;gap:4px;font-family:'Barlow Condensed';font-weight:800;font-size:13px;letter-spacing:1px;color:#ffe9a0;touch-action:none;box-shadow:0 0 8px rgba(0,0,0,.5)}
.resetv.down{transform:scale(.92);filter:brightness(1.4)}
html.pagezoomed .resetv{background:#c8231d;border-color:#ffd84a;color:#fff;animation:callp .8s infinite}
.xh{position:absolute;left:50%;top:50%;width:28px;height:28px;margin:-14px 0 0 -14px;transition:transform .05s}
.xh:before,.xh:after{content:"";position:absolute;background:rgba(255,255,255,.92);box-shadow:0 0 3px #000}
.xh:before{left:13px;top:0;width:2px;height:28px;clip-path:polygon(0 0,100% 0,100% 35%,0 35%,0 65%,100% 65%,100% 100%,0 100%)}
.xh:after{top:13px;left:0;height:2px;width:28px;clip-path:polygon(0 0,35% 0,35% 100%,0 100%,65% 0,100% 0,100% 100%,65% 100%)}
.xh.hit:before,.xh.hit:after{background:#ff3b3b}
.hitm{position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;opacity:0}
.hitm:before,.hitm:after{content:"";position:absolute;left:10px;top:-2px;width:2px;height:26px;background:#fff;transform:rotate(45deg);box-shadow:0 0 2px #000}.hitm:after{transform:rotate(-45deg)}
.hitm.show{animation:hm .18s}.hitm.head:before,.hitm.head:after{background:#ff4040}
@keyframes hm{from{opacity:1;transform:scale(1.3)}to{opacity:0;transform:scale(1)}}
.lock{position:absolute;width:52px;height:52px;display:none}
.lock i{position:absolute;width:12px;height:12px;border-color:#ff4040;border-style:solid;filter:drop-shadow(0 0 3px #f00)}
.lock i:nth-child(1){left:0;top:0;border-width:2px 0 0 2px}.lock i:nth-child(2){right:0;top:0;border-width:2px 2px 0 0}.lock i:nth-child(3){left:0;bottom:0;border-width:0 0 2px 2px}.lock i:nth-child(4){right:0;bottom:0;border-width:0 2px 2px 0}
.float{position:absolute;font-family:'Black Ops One';color:#ffd84a;text-shadow:0 0 6px rgba(0,0,0,.9),0 2px 0 #7a1010;white-space:nowrap;transform:translate(-50%,-50%);animation:flt 1.1s ease-out forwards}
@keyframes flt{0%{opacity:0;transform:translate(-50%,-30%) scale(.7)}15%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}100%{opacity:0;transform:translate(-50%,-160%) scale(1)}}
.sub{position:absolute;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);max-width:min(560px,48vw);background:rgba(0,0,0,.66);border-radius:6px;padding:5px 12px;font-family:'Barlow Condensed';font-size:16px;font-weight:600;line-height:1.2;text-align:center;opacity:0;transition:opacity .2s}
.sub.show{opacity:1}
.sub b{color:#7dffa8}.sub b.k{color:#8fd0ff}.sub b.kl{color:#ff8a8a}.sub b.kw{color:#ff9ad5}
.rule{position:absolute;left:calc(14px + env(safe-area-inset-left));top:calc(92px + env(safe-area-inset-top));width:200px;background:rgba(255,248,220,.95);color:#2a1a0a;border-radius:4px;padding:6px 9px 7px;transform:rotate(-2deg) translateX(-260px);box-shadow:0 3px 10px rgba(0,0,0,.6);font-family:'Barlow Condensed';font-size:13px;line-height:1.15;font-weight:600;transition:transform .35s}
.rule.show{transform:rotate(-2deg) translateX(0)}
.rule h4{margin:0 0 2px;font-family:'Permanent Marker';font-size:14px;color:#b0123a;font-weight:400}
.toast{position:absolute;left:50%;top:calc(88px + env(safe-area-inset-top));transform:translateX(-50%);background:linear-gradient(90deg,rgba(13,71,120,0),rgba(13,71,120,.92) 15%,rgba(13,71,120,.92) 85%,rgba(13,71,120,0));padding:4px 44px;font-family:'Black Ops One';font-size:16px;letter-spacing:1px;color:#fff;text-shadow:0 2px 2px #000;white-space:nowrap;opacity:0;transition:opacity .25s}
.toast.show{opacity:1}.toast.red{background:linear-gradient(90deg,rgba(120,13,13,0),rgba(120,13,13,.92) 15%,rgba(120,13,13,.92) 85%,rgba(120,13,13,0))}
.toast small{display:block;font-family:'Barlow Condensed';font-weight:600;font-size:13px;color:#bfe6ff;text-align:center;letter-spacing:.5px}
.marker{position:absolute;transform:translate(-50%,-50%);font-family:'Black Ops One';font-size:13px;color:#7dffa8;text-shadow:0 0 6px #000;text-align:center;display:none}
.marker:before{content:"";display:block;margin:0 auto 2px;width:16px;height:16px;border:2px solid #7dffa8;transform:rotate(45deg);box-shadow:0 0 8px #7dffa8}
.portraitHint{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);background:rgba(0,0,0,.75);padding:10px 16px;border-radius:10px;font-size:16px;text-align:center;display:none}

/* 180 quick-turn */
.btn.turn{right:calc(104px + env(safe-area-inset-right));bottom:calc(172px + env(safe-area-inset-bottom));width:50px;height:50px;background:rgba(20,24,26,.5);border-color:rgba(255,216,74,.75)}
.btn.turn .lbl{bottom:-15px;color:#ffe9a0}
/* off-screen threat arrows + directional hit flash */
.threats{position:absolute;inset:0;overflow:hidden}
.thr{position:absolute;left:0;top:0;width:48px;height:48px;margin:-24px 0 0 -24px;display:none;will-change:transform,opacity}
.thr svg{position:absolute;left:0;top:0;display:block}
.thr.close svg{animation:thrp .35s infinite alternate}
@keyframes thrp{to{transform:scale(1.22)}} /* transform only: animating CSS filters crashed WebKit */
.hitdir i{position:absolute;opacity:0;pointer-events:none}
.hitdir .hl{left:0;top:0;bottom:0;width:22vw;background:linear-gradient(90deg,rgba(220,0,0,.85),rgba(220,0,0,0))}
.hitdir .hr{right:0;top:0;bottom:0;width:22vw;background:linear-gradient(270deg,rgba(220,0,0,.85),rgba(220,0,0,0))}
.hitdir .ht{left:0;right:0;top:0;height:22vh;background:linear-gradient(180deg,rgba(220,0,0,.7),rgba(220,0,0,0))}
.hitdir .hb{left:0;right:0;bottom:0;height:26vh;background:linear-gradient(0deg,rgba(220,0,0,.85),rgba(220,0,0,0))}
.lookhint{position:absolute;right:calc(30% + env(safe-area-inset-right));top:32%;transform:translateY(-50%);max-width:36vw;text-align:center;display:none;flex-direction:column;align-items:center;gap:1px;padding:6px 12px;border-radius:12px;background:rgba(0,0,0,.5);border:1.5px dashed rgba(255,255,255,.6);font-family:'Barlow Condensed';font-weight:800;font-size:15px;letter-spacing:1px;color:#fff;text-shadow:0 1px 2px #000;transition:opacity .4s}
.lookhint .hand{display:inline-block;font-size:18px;animation:lh 1.4s ease-in-out infinite}
.lookhint small{font-size:12px;opacity:.85;font-weight:700}
@keyframes lh{0%,100%{transform:translateX(-10px)}50%{transform:translateX(10px)}}
/* screens */
.screen{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;pointer-events:auto}
.screen *{pointer-events:auto}
.title{background:radial-gradient(ellipse at 50% 40%,rgba(80,0,0,.25),rgba(0,0,0,.75))}
.title h1{margin:0;font-family:'Butcherman','Black Ops One';font-weight:400;font-size:min(13vw,128px);line-height:.95;color:#e8e2d0;text-shadow:0 0 18px rgba(255,0,0,.55),0 5px 0 #5a0000,0 9px 20px #000;letter-spacing:2px}
.title h2{margin:6px 0 0;font-family:'Black Ops One';font-weight:400;font-size:min(3.6vw,26px);color:#ffd84a;text-shadow:0 2px 3px #000;max-width:92vw}
.title .age{margin-top:10px;display:inline-block;border:2px solid #ff4a4a;color:#ff8080;padding:2px 10px;border-radius:6px;font-family:'Black Ops One';font-size:14px;background:rgba(0,0,0,.6)}
.title .age small{display:block;font-family:'Barlow Condensed';font-weight:600;color:#ffbdbd;font-size:12px}
.menu{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap;justify-content:center}
.b{font-family:'Black Ops One';font-size:18px;color:#fff;background:linear-gradient(#c8231d,#7c0d0b);border:2px solid #ff9a8a;border-radius:10px;padding:9px 20px;box-shadow:0 4px 0 #3a0503,0 6px 14px rgba(0,0,0,.6);cursor:pointer;letter-spacing:1px}
.b.alt{background:linear-gradient(#2c3a44,#151c22);border-color:#7a95a8;box-shadow:0 4px 0 #05080a,0 6px 14px rgba(0,0,0,.6)}
.b.small{font-size:14px;padding:6px 12px}
.b:active{transform:translateY(2px)}
.b[disabled]{opacity:.4}
.load{position:absolute;inset:0;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:50;font-family:'Black Ops One'}
.load .lb{width:240px;height:8px;border:1px solid #844;border-radius:4px;margin-top:12px;overflow:hidden}.load .lb div{height:100%;background:#c22;width:0}
.cine{position:absolute;inset:0;pointer-events:auto}
.cine .bars:before,.cine .bars:after{content:"";position:absolute;left:0;right:0;height:9vh;background:#000}
.cine .bars:before{top:0}.cine .bars:after{bottom:0}
.cine .line{position:absolute;left:50%;bottom:calc(11vh + env(safe-area-inset-bottom));transform:translateX(-50%);width:min(760px,86vw);background:rgba(0,0,0,.72);border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:8px 16px 10px;text-align:left}
.cine .line .who{font-family:'Black Ops One';font-size:15px;letter-spacing:1px}
.cine .line .txt{font-size:clamp(15px,2.6vw,21px);font-weight:600;line-height:1.2}
.cine .skip{position:absolute;right:calc(14px + env(safe-area-inset-right));top:calc(11vh + 6px);font-size:13px}
.cine .tap{position:absolute;right:24px;bottom:calc(11vh - 22px);font-size:12px;opacity:.6}
.cine .card{position:absolute;left:50%;top:14vh;transform:translateX(-50%);font-family:'Black Ops One';font-size:clamp(18px,4vw,34px);color:#ffd84a;text-shadow:0 3px 4px #000;white-space:nowrap}
.cine .card small{display:block;font-family:'Barlow Condensed';font-weight:600;color:#fff;font-size:clamp(13px,2.2vw,18px);letter-spacing:1px}
.panel{background:rgba(8,10,12,.92);border:2px solid #3a4a55;border-radius:14px;padding:14px 18px;max-width:94vw;max-height:88vh;overflow:auto;text-align:left}
.panel h3{margin:0 0 8px;font-family:'Black Ops One';font-weight:400;color:#ffd84a;font-size:22px}
.row{display:flex;gap:10px;align-items:center;margin:6px 0;font-size:16px;font-weight:600}
.row label{flex:1}
.row select,.row input{font-size:15px;font-family:'Barlow Condensed';font-weight:600}
.shop{position:absolute;inset:0;background:radial-gradient(ellipse at 30% 20%,#23313a,#0a0e11);display:flex;flex-direction:column;padding:calc(10px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(14px + env(safe-area-inset-left))}
.shop .hd{display:flex;align-items:center;gap:12px}
.shop .hd h3{margin:0;font-family:'Black Ops One';font-weight:400;font-size:clamp(18px,3vw,26px);color:#ffd84a;flex:1}
.shop .vendy{font-family:'Permanent Marker';font-size:13px;color:#9fe0ff;max-width:46vw}
.shop .grid{flex:1;overflow:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;margin-top:8px;align-content:start}
.item{background:rgba(255,255,255,.06);border:1.5px solid rgba(255,255,255,.15);border-radius:10px;padding:7px 9px;display:flex;flex-direction:column;gap:2px}
.item .n{font-family:'Black Ops One';font-size:14px;color:#fff}
.item .d{font-size:13px;opacity:.85;line-height:1.1;flex:1}
.item .lv{font-size:12px;color:#7dffa8}
.item.owned{border-color:#57d68d}
.item .ico{display:block;width:100%;height:58px;object-fit:contain;margin:-2px 0 2px;background:radial-gradient(ellipse at center,rgba(200,215,235,.30),rgba(200,215,235,0) 68%);border-radius:8px;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5))}
.buybtn{margin-top:4px;font-family:'Black Ops One';font-size:13px;color:#111;background:#ffd84a;border:0;border-radius:6px;padding:5px 8px;display:flex;align-items:center;justify-content:center;gap:4px}
.buybtn[disabled]{background:#555;color:#999}
.buybtn svg{width:15px;height:15px}
.results{font-size:18px;line-height:1.4}
.results b{color:#ffd84a}
@media (orientation:portrait){
 .obj{top:calc(96px + env(safe-area-inset-top))}
 .obj .t{font-size:13px}.obj .s{font-size:13px}.prog{width:160px}
 .res{top:calc(62px + env(safe-area-inset-top));right:calc(8px + env(safe-area-inset-right));gap:4px}
 .resetv{top:calc(96px + env(safe-area-inset-top));right:calc(8px + env(safe-area-inset-right))}
 .chip{font-size:14px;padding:0 6px 0 4px}
 .monitor{width:132px}.monitor .row{font-size:13px;white-space:nowrap}.port{width:38px;height:38px}
 .vitals{top:calc(8px + env(safe-area-inset-top))}
 .kbar{top:calc(62px + env(safe-area-inset-top));font-size:12px;padding:1px 6px}.kbar .bar{width:56px}
 .boss{top:calc(150px + env(safe-area-inset-top))}
 .btn.fire{width:84px;height:84px;bottom:calc(40px + env(safe-area-inset-bottom))}
 .btn.reload{right:calc(120px + env(safe-area-inset-right))}
 .btn.swap{right:calc(104px + env(safe-area-inset-right));bottom:calc(96px + env(safe-area-inset-bottom))}
 .ammo{right:calc(20px + env(safe-area-inset-right));bottom:calc(220px + env(safe-area-inset-bottom))}
 .autofire{right:calc(20px + env(safe-area-inset-right));bottom:calc(200px + env(safe-area-inset-bottom))}
 .btn.melee{bottom:calc(140px + env(safe-area-inset-bottom))}
 .btn.turn{right:calc(158px + env(safe-area-inset-right));bottom:calc(166px + env(safe-area-inset-bottom));width:48px;height:48px}
 .lookhint{top:46%;right:4%;max-width:60vw;font-size:13px}
 .sub{max-width:90vw;bottom:calc(150px + env(safe-area-inset-bottom))}
 .rule{top:calc(172px + env(safe-area-inset-top))}
 .toast{top:calc(158px + env(safe-area-inset-top))}
 .title h1{font-size:17vw}.title h2{font-size:4.6vw}
}
`;
