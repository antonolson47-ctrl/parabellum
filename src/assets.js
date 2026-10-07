// Asset access: in the bundled build, window.__PB_ASSETS holds base64 strings; in dev, fetch from build_assets/.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
function b64ToBuf(b64) { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
export async function getBuf(name) {
  if (window.__PB_ASSETS && window.__PB_ASSETS[name]) return b64ToBuf(window.__PB_ASSETS[name]);
  const r = await fetch((window.__PB_ASSET_BASE || '../build_assets/') + name + (window.__PB_VER ? '?v=' + window.__PB_VER : '')); if (!r.ok) throw new Error('asset ' + name); return r.arrayBuffer();
}
export async function loadGLB(name) { const buf = await getBuf(name); return loader.parseAsync(buf, ''); }
export async function loadTex(name) {
  const buf = await getBuf(name); const blob = new Blob([buf], { type: 'image/jpeg' });
  let bmp; try { bmp = await createImageBitmap(blob, { imageOrientation: 'none' }); } catch (e) { // older iOS: no createImageBitmap options -> plain <img>
    bmp = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('texture ' + name)); im.src = URL.createObjectURL(blob); }); }
  const t = new THREE.Texture(bmp); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.needsUpdate = true; return t;
}
