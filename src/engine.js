// Renderer, scene, camera, quality presets and dynamic resolution.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { isMobile } from './util.js';

export const E = { dt: 0, time: 0, frame: 0, dynScale: 1, fps: 60 };
export const QUALITY = {
  low: { pr: 0.75, shadows: false, shadowSize: 512, bloom: false, maxZ: 12, flashShadow: false },
  medium: { pr: 1.25, shadows: true, shadowSize: 1024, bloom: false, maxZ: 16, flashShadow: false },
  high: { pr: 2, shadows: true, shadowSize: 2048, bloom: true, maxZ: 22, flashShadow: true },
};
export function defaultQuality() { return isMobile() ? 'medium' : 'high'; }

export function initEngine(canvas, quality) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: !isMobile(), powerPreference: 'high-performance', stencil: false });
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0; r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  E.renderer = r; E.scene = new THREE.Scene();
  E.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 160); E.scene.add(E.camera);
  setQuality(quality);
  addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));
  resize();
  return E;
}
export function setQuality(q) {
  E.qname = QUALITY[q] ? q : 'medium'; E.q = QUALITY[E.qname];
  E.renderer.shadowMap.enabled = E.q.shadows; E.renderer.shadowMap.needsUpdate = true;
  E.composer = null; E.dynScale = 1; resize();
}
export function resize() {
  const w = innerWidth, h = innerHeight; const r = E.renderer; if (!r) return;
  const pr = Math.min(devicePixelRatio || 1, E.q.pr) * E.dynScale;
  r.setPixelRatio(pr); r.setSize(w, h, false); r.domElement.style.width = w + 'px'; r.domElement.style.height = h + 'px';
  const asp = w / h; E.camera.aspect = asp;
  // keep a ~92 deg horizontal FOV in landscape; widen vertical FOV in portrait so you can still see
  const hfov = 92 * Math.PI / 180; let vfov = 2 * Math.atan(Math.tan(hfov / 2) / asp) * 180 / Math.PI;
  E.camera.fov = Math.max(52, Math.min(vfov, 92)); E.camera.updateProjectionMatrix(); E.portrait = asp < 1;
  if (E.composer) { E.composer.setPixelRatio(pr); E.composer.setSize(w, h); }
}
function ensureComposer() {
  if (!E.q.bloom) return null;
  if (!E.composer) {
    const c = new EffectComposer(E.renderer); c.addPass(new RenderPass(E.scene, E.camera));
    E.bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.5, 0.88); c.addPass(E.bloom); c.addPass(new OutputPass());
    E.composer = c; resize();
  }
  return E.composer;
}
let ftAcc = 0, ftN = 0, lastAdj = 0;
export function render(cam) {
  const c = ensureComposer();
  if (c && (!cam || cam === E.camera)) c.render(); else E.renderer.render(E.scene, cam || E.camera);
}
// dynamic resolution: keep ~55+ fps
export function trackFrame(dt) {
  ftAcc += dt; ftN++; E.time += dt; E.frame++;
  if (ftN >= 30) {
    const avg = ftAcc / ftN; E.fps = 1 / avg; ftAcc = 0; ftN = 0;
    if (E.time - lastAdj > 1.5 && !E.fixedRes) {
      let s = E.dynScale;
      if (avg > 1 / 45 && s > 0.55) s -= 0.1; else if (avg < 1 / 58 && s < 1) s += 0.05;
      if (s !== E.dynScale) { E.dynScale = Math.max(0.55, Math.min(1, s)); lastAdj = E.time; resize(); }
    }
  }
}
