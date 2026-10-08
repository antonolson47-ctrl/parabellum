// PARABELLUM character factory: rigged CC0 bodies + procedural clothing shader + bone-attached accessories.
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { loadGLB, loadTex } from './assets.js';

export const LIB = { clips: {} };
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export async function initChars(onProgress) {
  const names = ['female', 'male', 'hair_long', 'hair_buzzedfemale', 'hair_buzzed', 'hair_buns', 'hair_simpleparted', 'anims'];
  let done = 0;
  await Promise.all(names.map(async n => { LIB[n] = await loadGLB(n + '.glb'); onProgress && onProgress(++done / (names.length + 2)); }));
  LIB.femaleLight = await loadTex('female_light.jpg'); LIB.maleLight = await loadTex('male_light.jpg');
  onProgress && onProgress(1);
  for (const c of LIB.anims.animations) {
    c.tracks = c.tracks.filter(t => (!t.name.endsWith('.position') || t.name === 'pelvis.position') && !t.name.endsWith('.scale'));
    LIB.clips[c.name] = c;
  }
  for (const k of ['female', 'male']) {
    const sc = LIB[k].scene; sc.updateMatrixWorld(true);
    const info = { scene: sc };
    sc.traverse(m => { if (m.isSkinnedMesh) { bakeBind(m); if (m.name === 'Eyes') info.eyes = m; else if (m.name === 'Eyebrows') info.brows = m; else info.body = m; } });
    info.bodyTex = info.body.material.map; info.lightTex = k === 'female' ? LIB.femaleLight : LIB.maleLight;
    info.lightTex.wrapS = info.lightTex.wrapT = info.bodyTex.wrapS; info.lightTex.channel = info.bodyTex.channel;
    const bp = {}; sc.traverse(b => { if (b.isBone) bp[b.name] = b.getWorldPosition(new THREE.Vector3()); });
    info.bp = bp; info.H = k === 'female' ? 1.767 : 1.81;
    info.weld = buildWeld(info.body.geometry);
    LIB[k + 'Info'] = info;
  }
}

// ---------- geometry helpers ----------
// meshopt quantization folds a scale/offset into inverse bind matrices; bake to float bind-pose positions so
// geometry space == model space (needed for clothing classification & accessory placement).
function bakeBind(m) {
  const g = m.geometry, pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
  const P = new Float32Array(n * 3), N = new Float32Array(n * 3), v = new THREE.Vector3(), v2 = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.toArray(P, i * 3);
    v.fromBufferAttribute(pos, i); v2.fromBufferAttribute(nor, i).multiplyScalar(0.01).add(v); m.applyBoneTransform(i, v2); m.applyBoneTransform(i, v.fromBufferAttribute(pos, i));
    v2.sub(v).normalize(); v2.toArray(N, i * 3);
  }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  const si = g.attributes.skinIndex; if (!(si.array instanceof Uint16Array)) g.setAttribute('skinIndex', new THREE.BufferAttribute(Uint16Array.from(si.array), 4));
  const sw = g.attributes.skinWeight; if (sw.normalized || !(sw.array instanceof Float32Array)) { const a = new Float32Array(sw.count * 4); for (let i = 0; i < sw.count; i++) for (let k = 0; k < 4; k++) a[i * 4 + k] = sw.getComponent(i, k); g.setAttribute('skinWeight', new THREE.BufferAttribute(a, 4)); }
  m.updateMatrixWorld(true); m.bindMatrix.copy(m.matrixWorld); m.bindMatrixInverse.copy(m.matrixWorld).invert(); m.skeleton.calculateInverses();
  g.computeBoundingBox(); g.computeBoundingSphere();
}
function buildWeld(g) {
  const pos = g.attributes.position, n = pos.count, map = new Map(), wid = new Int32Array(n); let c = 0;
  for (let i = 0; i < n; i++) { const k = Math.round(pos.getX(i) * 2000) + ',' + Math.round(pos.getY(i) * 2000) + ',' + Math.round(pos.getZ(i) * 2000); let w = map.get(k); if (w === undefined) { w = c++; map.set(k, w); } wid[i] = w; }
  const nb = Array.from({ length: c }, () => new Set()); const idx = g.index.array;
  for (let t = 0; t < idx.length; t += 3) { const a = wid[idx[t]], b = wid[idx[t + 1]], d = wid[idx[t + 2]]; nb[a].add(b).add(d); nb[b].add(a).add(d); nb[d].add(a).add(b); }
  const rep = new Int32Array(c).fill(-1); for (let i = 0; i < n; i++) if (rep[wid[i]] < 0) rep[wid[i]] = i;
  return { wid, nb: nb.map(s => Int32Array.from(s)), count: c, rep };
}
function domJoint(g, bones, i) {
  const si = g.attributes.skinIndex, sw = g.attributes.skinWeight; let best = 0, bw = -1;
  for (let k = 0; k < 4; k++) { const w = sw.getComponent(i, k); if (w > bw) { bw = w; best = si.getComponent(i, k); } }
  return bones[best].name;
}

// Clothing: vertex level decides which verts are "clothed" (get smoothed + inflated, margins generous);
// the fragment shader makes crisp cuts (sleeves, hems, necklines, open jackets) from bind-pose position.
function cutParams(info, o) {
  const bp = info.bp, top = o.top, pants = o.pants;
  const neckBase = bp.neck_01.y - 0.025, pelvisY = bp.pelvis.y, kneeY = bp.calf_l.y, ankleY = bp.foot_l.y + 0.05;
  const shoulderX = bp.upperarm_l.x, elbowX = bp.lowerarm_l.x, wristX = bp.hand_l.x;
  const sl = top && top.sleeve || 'short';
  const sleeveX = !top ? 0 : sl === 'long' ? wristX - 0.03 : sl === 'three' ? (elbowX + wristX) / 2 : sl === 'none' ? shoulderX - 0.005 : shoulderX + (elbowX - shoulderX) * 0.5;
  const hemY = top ? pelvisY + (top.hem !== undefined ? top.hem : 0.05) : 99;
  const len = pants && pants.length || 'long';
  const pantsY = !pants ? 99 : len === 'long' ? ankleY : len === 'capri' ? kneeY - 0.17 : len === 'shorts' ? kneeY + 0.17 : kneeY;
  const neckType = !top ? 0 : ({ crew: 1, v: 2, scoop: 3, hood: 4, turtle: 4 })[top.neck || 'crew'];
  const gownY = top && top.gown ? kneeY + 0.06 : 99;
  const flags = (pants ? 1 : 0) + (o.shoes ? 2 : 0) + (top ? 4 : 0);
  return { neckBase, pelvisY, kneeY, ankleY, shoulderX, sleeveX, hemY, pantsY, neckType, gownY, flags, top, pants, shoes: o.shoes };
}
function classify(info, o) {
  const g = info.body.geometry, bones = info.body.skeleton.bones, pos = g.attributes.position, n = pos.count, c = cutParams(info, o), m = 0.035;
  const gar = new Float32Array(n), arm = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), ax = Math.abs(x); const j = domJoint(g, bones, i);
    let id = 0; const isArm = (/upperarm|lowerarm/.test(j) || /clavicle/.test(j)) && ax > c.shoulderX - 0.02;
    if (/^hand|thumb|index|middle|ring|pinky/.test(j)) { id = 0; arm[i] = 1; }
    else if (/^Head/.test(j)) id = 0;
    else if (/neck/.test(j)) id = c.top && y < c.neckBase + 0.06 ? 1 : 0;
    else if (isArm) { arm[i] = 1; id = c.top && ax < c.sleeveX + m ? 1 : 0; }
    else {
      if (c.top && (y >= c.hemY - m || y > c.gownY - m)) id = 1;
      if (!id && c.pants && y > c.pantsY - m) id = y > c.hemY ? 1 : 3;
      if (c.shoes && y < c.ankleY + m && !/^thigh/.test(j)) id = id === 3 ? 3 : 4;
      if (c.shoes && /^foot|ball/.test(j)) id = 4;
    }
    gar[i] = id;
  }
  return { gar, arm, c };
}

function tailorGeometry(info, o) {
  const src = info.body.geometry, g = src.clone(), W = info.weld; const pos = g.attributes.position, nor = g.attributes.normal, n = pos.count;
  const { gar, arm } = classify(info, o);
  const wg = new Int8Array(W.count), P = new Float32Array(W.count * 3), N = new Float32Array(W.count * 3);
  for (let i = 0; i < n; i++) { const w = W.wid[i]; wg[w] = Math.max(wg[w], gar[i]); P[w * 3] = pos.getX(i); P[w * 3 + 1] = pos.getY(i); P[w * 3 + 2] = pos.getZ(i); }
  const edge = new Uint8Array(W.count);
  for (let w = 0; w < W.count; w++) { for (const k of W.nb[w]) if ((wg[k] > 0) !== (wg[w] > 0)) { edge[w] = 1; break; } }
  const iters = [0, o.top && o.top.smooth !== undefined ? o.top.smooth : 5, 4, 3, 2, 0];
  const thick = [0, o.top && o.top.thick || 0.011, 0.008, o.pants && o.pants.thick || 0.01, 0.014, 0.002];
  const maxIt = Math.max(...iters); const T = new Float32Array(P);
  for (let it = 0; it < maxIt; it++) {
    for (let w = 0; w < W.count; w++) {
      const id = wg[w]; if (!id || it >= iters[id] || edge[w]) continue; const nb = W.nb[w]; let sx = 0, sy = 0, sz = 0;
      for (const k of nb) { sx += P[k * 3]; sy += P[k * 3 + 1]; sz += P[k * 3 + 2]; }
      const mm = nb.length; T[w * 3] = P[w * 3] * 0.45 + sx / mm * 0.55; T[w * 3 + 1] = P[w * 3 + 1] * 0.45 + sy / mm * 0.55; T[w * 3 + 2] = P[w * 3 + 2] * 0.45 + sz / mm * 0.55;
    }
    P.set(T);
  }
  const NN = new Float32Array(W.count * 3); const idx = g.index.array; const a = V(), b = V(), cc = V(), e1 = V(), e2 = V();
  for (let t = 0; t < idx.length; t += 3) {
    const A = W.wid[idx[t]], B = W.wid[idx[t + 1]], C = W.wid[idx[t + 2]];
    a.fromArray(P, A * 3); b.fromArray(P, B * 3); cc.fromArray(P, C * 3); e1.subVectors(b, a); e2.subVectors(cc, a); e1.cross(e2);
    for (const w of [A, B, C]) { NN[w * 3] += e1.x; NN[w * 3 + 1] += e1.y; NN[w * 3 + 2] += e1.z; }
  }
  const PS = new Float32Array(P);
  for (let w = 0; w < W.count; w++) {
    const id = wg[w]; if (!id) continue; a.fromArray(NN, w * 3).normalize(); a.toArray(N, w * 3);
    const th = thick[id] * (edge[w] ? 0.4 : 1); P[w * 3] += a.x * th; P[w * 3 + 1] += a.y * th; P[w * 3 + 2] += a.z * th;
  }
  const ga = new Float32Array(n), bpos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const w = W.wid[i]; bpos[i * 3] = PS[w * 3]; bpos[i * 3 + 1] = PS[w * 3 + 1]; bpos[i * 3 + 2] = PS[w * 3 + 2];
    if (wg[w]) { pos.setXYZ(i, P[w * 3], P[w * 3 + 1], P[w * 3 + 2]); nor.setXYZ(i, N[w * 3], N[w * 3 + 1], N[w * 3 + 2]); }
    ga[i] = wg[w] ? 1 : 0;
  }
  g.setAttribute('garment', new THREE.BufferAttribute(ga, 1)); g.setAttribute('garm', new THREE.BufferAttribute(arm, 1)); g.setAttribute('bpos', new THREE.BufferAttribute(bpos, 3));
  g.deleteAttribute('color');
  g.computeBoundingSphere(); g.boundingSphere.radius *= 1.3;
  return g;
}

// ---------- shaders ----------
const NOISE = `
float pbH(vec3 p){ return fract(sin(dot(p, vec3(127.1,311.7,74.7)))*43758.5453); }
float pbN(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(pbH(i),pbH(i+vec3(1,0,0)),f.x),mix(pbH(i+vec3(0,1,0)),pbH(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(pbH(i+vec3(0,0,1)),pbH(i+vec3(1,0,1)),f.x),mix(pbH(i+vec3(0,1,1)),pbH(i+vec3(1,1,1)),f.x),f.y),f.z); }
float pbF(vec3 p){ return pbN(p)*.5+pbN(p*2.03)*.25+pbN(p*4.1)*.125; }
`;
function bodyMaterial(baseMat, spec) {
  const m = baseMat.clone(); m.vertexColors = false; m.side = THREE.FrontSide;
  if (spec.tex) m.map = spec.tex;
  const U = {
    uGC: { value: spec.gcol }, uGC2: { value: spec.gcol2 }, uGP: { value: spec.gpar },
    uSkin: { value: spec.skin }, uZomb: { value: spec.zomb }, uBlood: { value: 0 }, uFlash: { value: 0 }, uOpen: { value: spec.open || new THREE.Vector3(0, 0, 0) }, uCut1: { value: spec.cut1 }, uCut2: { value: spec.cut2 },
  };
  m.userData.U = U;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float garment; attribute float garm; attribute vec3 bpos; varying float vGar; varying float vArm; varying vec3 vBP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvGar = garment; vArm = garm; vBP = bpos;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying float vGar; varying float vArm; varying vec3 vBP;
uniform vec4 uCut1; uniform vec4 uCut2;
uniform vec3 uGC[6]; uniform vec3 uGC2[6]; uniform vec4 uGP[6]; uniform vec4 uSkin; uniform vec4 uZomb; uniform float uBlood; uniform float uFlash; uniform vec3 uOpen;
${NOISE}
float gid; vec4 gp; float isG; float fabH; int gi; float zWound; float bloodM;
vec3 pbPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float fd){ vec3 vSigmaX=normalize(dFdx(surf_pos)); vec3 vSigmaY=normalize(dFdy(surf_pos)); vec3 vN=surf_norm; vec3 R1=cross(vSigmaY,vN); vec3 R2=cross(vN,vSigmaX); float fDet=dot(vSigmaX,R1)*fd; vec3 vGrad=sign(fDet)*(dHdxy.x*R1+dHdxy.y*R2); return normalize(abs(fDet)*surf_norm-vGrad); }
float fabricHeight(vec3 p, float pat){
  float folds = pbF(p*vec3(9.,30.,9.)) ;            // horizontal-ish wrinkles
  float h = folds*0.6;
  if (pat > 1.5 && pat < 2.5) h += sin((p.x+p.y+p.z)*900.)*0.04;        // denim twill
  else if (pat > 2.5 && pat < 3.5) h += sin(p.x*700.)*0.05;              // knit rib
  else h += pbN(p*400.)*0.05;                                           // weave grain
  return h;
}
`)
      .replace('#include <map_fragment>', `#include <map_fragment>
vec3 p = vBP; float ax = abs(p.x); gi = 0; float hemD = 1.;
{
  float sleeveX = uCut1.x, hemY = uCut1.y, pantsY = uCut1.z, ankleY = uCut1.w;
  float neckT = uCut2.x, neckBase = uCut2.y, gownY = uCut2.z; float fl = uCut2.w;
  bool hasP = mod(fl, 2.) > 0.5, hasS = mod(floor(fl/2.), 2.) > 0.5, hasT = fl > 3.5;
  if (vGar > 0.5) {
    if (vArm > 0.5) { if (hasT && ax < sleeveX) { gi = 1; hemD = sleeveX - ax; } }
    else if (hasT && (p.y >= hemY || p.y > gownY)) { gi = 1; hemD = p.y > gownY ? min(p.y - hemY + 1., p.y - gownY) : p.y - hemY; if (p.y >= hemY && hasP) hemD = 1.; if (!hasP && p.y < hemY + 0.5 && gownY > 50.) hemD = p.y - hemY; }
    else if (hasP && p.y > pantsY && p.y > ankleY - 0.001) { gi = 3; hemD = p.y - pantsY; }
    if (hasS && p.y < ankleY && vArm < 0.5) { gi = 4; hemD = ankleY - p.y; }
    if (gi == 1 && vArm < 0.5) {
      float nd = 1.;
      if (neckT > 0.5 && neckT < 1.5) nd = p.z > -0.015 ? (length(vec2(ax / 0.078, (p.y - neckBase - 0.035) / 0.06)) - 1.) * 0.06 : (ax < 0.07 ? neckBase + 0.012 - p.y : 1.);
      else if (neckT > 1.5 && neckT < 2.5) { float apex = neckBase - 0.105; nd = (p.y > apex - 0.05) ? (p.z > -0.015 ? ((ax - ((p.y - apex) * 0.62 + 0.012)) * 0.85) : (ax < 0.07 ? neckBase + 0.01 - p.y : 1.)) : 1.; if (p.z > -0.015 && ax > 0.1) nd = 1.; }
      else if (neckT > 2.5 && neckT < 3.5) nd = p.z > 0. ? length(vec2(ax / 0.095, (p.y - neckBase - 0.02) / 0.09)) - 1. : (ax < 0.095 ? neckBase - p.y : 1.);
      else if (neckT > 3.5) nd = neckBase + 0.035 - p.y;
      nd *= (neckT > 2.5 && neckT < 3.5) ? 0.09 : 1.;
      if (nd < 0.) gi = 0; else hemD = min(hemD, nd);
    }
  }
  if (gi == 1 && uOpen.x > 0. && p.z > 0.0 && p.y > uOpen.y && p.y < uOpen.z && vArm < 0.5) {
    float w = uOpen.x + (p.y - uOpen.y) * 0.04;
    if (ax < w) { gi = 2; } else if (ax < w + 0.016) { hemD = min(hemD, (ax - w) * 0.6); }
  }
}
gid = float(gi); isG = gi > 0 ? 1. : 0.; gp = uGP[gi];
fabH = fabricHeight(p, gp.x);
if (gi == 1 && gp.x > 0.5 && gp.x < 1.5 && vArm < 0.5 && p.z > 0. && ax < 0.012) { hemD = min(hemD, ax * 0.6); } // shirt placket
if (isG > 0.5) {
  vec3 c = uGC[gi], c2 = uGC2[gi];
  float pat = gp.x;
  if (pat > 0.5 && pat < 1.5) { // flannel check (overlapping bands)
    vec2 q = vec2(p.x*0.8 + p.z*0.6, p.y) * 7.5;
    float a = smoothstep(0.24,0.26,abs(fract(q.x)-0.5)), b = smoothstep(0.24,0.26,abs(fract(q.y)-0.5));
    float th = smoothstep(0.488,0.495, abs(fract(q.x*3.)-0.5)) + smoothstep(0.488,0.495, abs(fract(q.y*3.)-0.5));
    vec3 mid = mix(c, c2, 0.5); c = (a > 0.5 && b > 0.5) ? c2 : ((a > 0.5 || b > 0.5) ? mid : c);
    c = mix(c, vec3(0.9,0.85,0.75), clamp(th,0.,1.)*0.1);
  } else if (pat > 8.5) { c = c2 * 0.6;
  } else if (pat > 1.5 && pat < 2.5) { // denim
    c *= 0.86 + 0.18*pbN(p*vec3(60.,9.,60.)) + 0.06*sin((p.x+p.y)*900.);
    c = mix(c, c*1.35, smoothstep(0.55,0.9,pbN(p*vec3(5.,3.,5.)))*0.5);
  } else if (pat > 3.5 && pat < 4.5) { // stripes (gown print)
    float d = step(0.5, fract((p.x+p.y)*45.)); c = mix(c, c2, d*0.25 + step(0.82, pbN(p*90.))*0.6);
  } else {
    c *= 0.93 + 0.1*pbN(p*120.);
  }
  float crease = smoothstep(0.35, 0.75, fabH);
  c *= 0.78 + 0.3*crease;
  // hem / seam darkening + stitch dashes
  float st = step(0.5, fract((p.x*1.3+p.y+p.z)*170.)) * (1. - smoothstep(0.0012, 0.002, abs(hemD - 0.0065)));
  c *= 0.72 + 0.28*smoothstep(0.0, 0.012, hemD); c = mix(c, c2*1.15+0.06, st*0.55);
  if (gi == 1 && gp.x > 0.5 && gp.x < 1.5 && vArm < 0.5 && p.z > 0. && ax < 0.008) { float bt = length(vec2(ax, mod(p.y, 0.075) - 0.037)); c = mix(c, vec3(0.9,0.88,0.8), 1. - smoothstep(0.004, 0.005, bt)); }
  diffuseColor.rgb = c;
} else {
  vec3 sc = diffuseColor.rgb; float l = dot(sc, vec3(.299,.587,.114));
  diffuseColor.rgb = mix(sc, vec3(l), uSkin.a) * uSkin.rgb;
}
// zombie decay
zWound = 0.; bloodM = 0.;
if (uZomb.x > 0.) {
  float s = uZomb.y;
  if (isG < 0.5) {
    vec3 sc = diffuseColor.rgb; float l = dot(sc, vec3(.299,.587,.114));
    vec3 dead = mix(vec3(l)*vec3(0.78,0.92,0.72), vec3(0.42,0.5,0.36)*l*2.2, 0.5);
    float bruise = smoothstep(0.55, 0.8, pbF(p*7.+s));
    dead = mix(dead, vec3(0.28,0.18,0.3)*l*2., bruise*0.6);
    float vein = smoothstep(0.03, 0.0, abs(pbN(p*38.+s)-0.5)) * 0.5;
    dead = mix(dead, vec3(0.2,0.28,0.3), vein*uZomb.x);
    diffuseColor.rgb = mix(sc, dead, uZomb.x);
  }
  float w = pbF(p*vec3(6.,5.,6.) + s*3.);
  zWound = smoothstep(0.66, 0.70, w) * uZomb.z;
  float stain = smoothstep(0.5, 0.75, pbF(p*4. + s*1.7 + 9.));
  bloodM = max(stain * uZomb.w * (0.4 + 0.6*isG), zWound);
}
bloodM = max(bloodM, smoothstep(1.0 - uBlood, 1.0 - uBlood + 0.15, pbF(p*5.3 + 4.)) * step(0.01, uBlood));
diffuseColor.rgb = mix(diffuseColor.rgb, mix(vec3(0.33,0.02,0.02), vec3(0.12,0.0,0.0), zWound), bloodM*0.92);
if (zWound > 0.5) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.55,0.08,0.07), smoothstep(0.7,0.76,pbF(p*vec3(6.,5.,6.) + uZomb.y*3.))*0.6);
`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, gp.y, isG); roughnessFactor = mix(roughnessFactor, 0.25, bloodM*0.8);`)
      .replace('#include <normal_fragment_maps>', `
if (isG < 0.5) {
  #include <normal_fragment_maps>
} else {
  vec2 dH = vec2(dFdx(fabH), dFdy(fabH)) * 0.6;
  normal = pbPerturb(-vViewPosition, normal, dH, faceDirection);
}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
totalEmissiveRadiance += vec3(1.0,0.25,0.15) * uFlash;`);
  };
  m.customProgramCacheKey = () => 'pbbody';
  return m;
}

function hairMaterial(base, color, rough = 0.55) {
  const m = base.clone(); m.vertexColors = false; m.userData.hc = new THREE.Color(color);
  m.color.set(0xffffff); m.roughness = rough; m.side = THREE.DoubleSide;
  m.onBeforeCompile = sh => {
    sh.uniforms.uHair = { value: m.userData.hc };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHair;')
      .replace('#include <map_fragment>', `#include <map_fragment>
{ float l = dot(diffuseColor.rgb, vec3(.299,.587,.114)); diffuseColor.rgb = uHair * (0.35 + 1.5*l); }`);
  };
  m.customProgramCacheKey = () => 'pbhair';
  return m;
}

// ---------- accessories ----------
const ACC_MATS = {};
function mat(key, f) { return ACC_MATS[key] || (ACC_MATS[key] = f()); }
const M = {
  black: () => mat('black', () => new THREE.MeshStandardMaterial({ color: 0x0c0c0e, roughness: 0.35, metalness: 0.1 })),
  gold: () => mat('gold', () => new THREE.MeshStandardMaterial({ color: 0xd8b25a, roughness: 0.25, metalness: 1 })),
  silver: () => mat('silver', () => new THREE.MeshStandardMaterial({ color: 0xc8ccd2, roughness: 0.2, metalness: 1 })),
  lens: () => mat('lens', () => new THREE.MeshStandardMaterial({ color: 0x9fb8c8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.22, depthWrite: false })),
  aviLens: () => mat('avil', () => new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.05, metalness: 0.6, transparent: true, opacity: 0.8 })),
  tortoise: () => mat('tort', () => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#5a3412'; x.fillRect(0, 0, 64, 64); for (let i = 0; i < 40; i++) { x.fillStyle = Math.random() < 0.5 ? '#2a1606' : '#a8692a'; x.beginPath(); x.arc(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 6, 0, 7); x.fill(); } const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(36, 36); /* frame UVs are in metres -> tile so every frame shows the mottled pattern */ return new THREE.MeshStandardMaterial({ map: t, roughness: 0.3 }); }),
  tube: () => mat('tube', () => new THREE.MeshStandardMaterial({ color: 0x1b1b1f, roughness: 0.45 })),
  white: () => mat('white', () => new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.5 })),
  pink: () => mat('pink', () => new THREE.MeshStandardMaterial({ color: 0xff5fa8, roughness: 0.8 })),
  clear: () => mat('clear', () => new THREE.MeshStandardMaterial({ color: 0xe8f4ff, roughness: 0.08, transparent: true, opacity: 0.35, depthWrite: false })),
};
function frameRing(w, h, r, t, d) {
  const s = new THREE.Shape(); const rr = (sh, w, h, r) => { sh.moveTo(-w / 2 + r, -h / 2); sh.lineTo(w / 2 - r, -h / 2); sh.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); sh.lineTo(w / 2, h / 2 - r); sh.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); sh.lineTo(-w / 2 + r, h / 2); sh.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); sh.lineTo(-w / 2, -h / 2 + r); sh.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); };
  rr(s, w, h, r); const hole = new THREE.Path(); rr(hole, w - t * 2, h - t * 2, Math.max(0.001, r - t)); s.holes.push(hole);
  return new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false, curveSegments: 6 });
}
// half-width of the head at a given depth (z) around eye level, from the bind-pose mesh (cached per base body)
const SIDE_CACHE = {};
function headSide(info, eyeY) {
  const key = info.H + ':' + eyeY.toFixed(4); if (SIDE_CACHE[key]) return SIDE_CACHE[key];
  const pos = info.body.geometry.attributes.position; const zs = []; for (let z = 0.1; z >= -0.06; z -= 0.01) zs.push(z);
  const w = zs.map(z => { let m = 0; for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - eyeY - 0.006) < 0.007 && Math.abs(pos.getZ(i) - z) < 0.006) m = Math.max(m, Math.abs(pos.getX(i))); return m; });
  const f = z => { if (z >= zs[0]) return w[0]; for (let i = 1; i < zs.length; i++) if (z >= zs[i]) { const t = (z - zs[i]) / (zs[i - 1] - zs[i]); return w[i] + (w[i - 1] - w[i]) * t; } return w[w.length - 1]; };
  return (SIDE_CACHE[key] = f);
}
function glasses(kind, faceZ, eyeY, eyeX, headW, temples = true, side = null) {
  const g = new THREE.Group(); const isAvi = kind === 'aviator';
  const fm = kind === 'tortoise' ? M.tortoise() : isAvi ? M.gold() : M.black();
  const w = isAvi ? 0.044 : 0.046, h = isAvi ? 0.036 : 0.03, t = isAvi ? 0.0025 : 0.005;
  for (const sx of [-1, 1]) {
    const ring = new THREE.Mesh(frameRing(w, h, isAvi ? 0.014 : 0.007, t, 0.004), fm); ring.position.set(sx * eyeX, 0, 0); if (isAvi) ring.rotation.z = sx * 0.12; g.add(ring);
    const lens = new THREE.Mesh(new THREE.PlaneGeometry(w - t, h - t), isAvi ? M.aviLens() : M.lens()); lens.position.set(sx * eyeX, 0, 0.002); g.add(lens);
    if (temples && side) { // hinge on the frame's outer edge, then the arm hugs the side of the head back to the ear
      const hx = eyeX + w / 2 - 0.001, pts = [V(sx * hx, h * 0.25, -0.002)];
      for (const zz of [-0.02, -0.045, -0.07, -0.095]) { const zw = faceZ + zz; pts.push(V(sx * Math.max(hx + 0.002, side(zw) + 0.0028), h * 0.25 + 0.003 * (-zz / 0.095), zz)); }
      const arm = new THREE.Mesh(taperedTube(pts, 0.0021, 0.0019, 16, 5), fm); g.add(arm);
      const hinge = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.006), fm); hinge.position.set(sx * hx, h * 0.25, -0.001); g.add(hinge);
    } else if (temples) { const temple = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.004, 0.11), fm); temple.position.set(sx * (headW), 0.006, -0.055); temple.rotation.y = sx * 0.06; g.add(temple); }
  }
  const br = new THREE.Mesh(new THREE.BoxGeometry(eyeX * 2 - w + 0.004, 0.004, 0.004), fm); br.position.set(0, h * 0.28, 0.002); g.add(br);
  g.position.set(0, eyeY, faceZ);
  return g;
}
function taperedTube(points, r0, r1, seg = 24, radial = 10) {
  const curve = new THREE.CatmullRomCurve3(points); const geo = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const pos = geo.attributes.position; const fr = curve.computeFrenetFrames(seg, false);
  for (let i = 0; i <= seg; i++) { const t = i / seg, r = r0 + (r1 - r0) * t, c = curve.getPointAt(t); for (let j = 0; j <= radial; j++) { const k = i * (radial + 1) + j; const p = V(pos.getX(k), pos.getY(k), pos.getZ(k)).sub(c).multiplyScalar(r).add(c); pos.setXYZ(k, p.x, p.y, p.z); } }
  geo.computeVertexNormals(); return geo;
}
function strandMaterial(color) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.5 });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + NOISE)
      .replace('#include <map_fragment>', '#include <map_fragment>\n{ vec2 u = vUvS; float s = pbN(vec3(u.y*260., u.x*6., 0.)); diffuseColor.rgb *= 0.65 + 0.6*s; }')
      .replace('void main() {', 'varying vec2 vUvS;\nvoid main() {');
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec2 vUvS;\nvoid main() {').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUvS = uv;');
  };
  m.customProgramCacheKey = () => 'strand'; return m;
}
function curlCluster(info, color, seed = 1) {
  // tight curls on the top/front/sides of the head, built from tiny tori, sampled from scalp vertices
  const g = info.body.geometry, pos = g.attributes.position, nor = g.attributes.normal, bones = info.body.skeleton.bones; const rnd = mulberry(seed);
  const eyeY = info.bp.Head.y + 0.1, geos = []; const base = new THREE.TorusGeometry(0.011, 0.0055, 5, 9);
  const W = info.weld; const used = new Set();
  for (let w = 0; w < W.count; w++) {
    const i = W.rep[w]; const y = pos.getY(i), z = pos.getZ(i), x = pos.getX(i); if (domJoint(g, bones, i) !== 'Head') continue;
    const ny = nor.getY(i), nz = nor.getZ(i);
    const ok = (y > eyeY + 0.035 && (nz < 0.75 || y > eyeY + 0.06)) || (y > eyeY - 0.02 && nz < -0.2) || (y > eyeY - 0.005 && Math.abs(x) > 0.065 && nz < 0.3 && ny > -0.3);
    if (!ok || y < eyeY - 0.06) continue;
    const key = Math.round(x * 55) + ',' + Math.round(y * 55) + ',' + Math.round(z * 55); if (used.has(key)) continue; used.add(key);
    for (let k = 0; k < 2; k++) {
      const t = base.clone(); const s = 0.8 + rnd() * 0.6; t.scale(s, s, s * 1.3);
      t.rotateX(rnd() * 6.28); t.rotateY(rnd() * 6.28); t.rotateZ(rnd() * 6.28);
      const off = 0.012 + rnd() * 0.012 + (y > eyeY + 0.06 ? 0.01 : 0);
      t.translate(x + nor.getX(i) * off + (rnd() - 0.5) * 0.012, y + ny * off + (rnd() - 0.5) * 0.012, z + nz * off + (rnd() - 0.5) * 0.012); geos.push(t);
    }
  }
  const merged = mergeGeometries(geos.map(t => { t.deleteAttribute('uv'); return t; }));
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.62 });
  return new THREE.Mesh(merged, m);
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function faceProfile(info) {
  // max z of head vertices near x=0 at given y
  const g = info.body.geometry, pos = g.attributes.position; return (y, x = 0, tol = 0.006) => { let z = -1; for (let i = 0; i < pos.count; i++) { if (Math.abs(pos.getY(i) - y) < tol && Math.abs(pos.getX(i) - x) < tol * 1.5) z = Math.max(z, pos.getZ(i)); } return z; };
}
function surfZ(info, y, x, tol = 0.012) { return faceProfile(info)(y, x, tol); }

// ---------- facial hair: a skinned, surface-fitted strand mustache ----------
// Built in bind-pose model space on top of the real upper-lip surface (raycast), then bound to the same skeleton with
// the lip's own skin weights, so it moves exactly like the skin under it (Head + a little neck_01) in every animation.
const MUST_CACHE = {};
function lipFeatures(info, eyeY) {
  // centre-line profile below the eyes -> nose tip, subnasale (under the nose), mouth seam
  const pos = info.body.geometry.attributes.position; const zAt = y => { let z = -1; for (let i = 0; i < pos.count; i++) if (Math.abs(pos.getY(i) - y) < 0.0022 && Math.abs(pos.getX(i)) < 0.006) z = Math.max(z, pos.getZ(i)); return z; };
  const prof = []; for (let d = 0.02; d <= 0.1; d += 0.002) prof.push([eyeY - d, zAt(eyeY - d)]);
  const ok = prof.filter(p => p[1] > 0); let tip = ok[0]; for (const p of ok) if (p[0] > eyeY - 0.065 && p[1] > tip[1]) tip = p;
  let sub = null; for (const p of ok) if (p[0] < tip[0] - 0.006 && p[0] > tip[0] - 0.03 && (!sub || p[1] < sub[1])) sub = p;
  if (!sub) sub = [tip[0] - 0.016, tip[1] - 0.02];
  let lipTop = null; for (const p of ok) if (p[0] < sub[0] - 0.002 && p[0] > sub[0] - 0.016 && (!lipTop || p[1] > lipTop[1])) lipTop = p;
  let seam = null; for (const p of ok) if (lipTop && p[0] < lipTop[0] - 0.004 && p[0] > lipTop[0] - 0.02 && (!seam || p[1] < seam[1])) seam = p;
  return { tipY: tip[0], subY: sub[0], lipY: lipTop ? lipTop[0] : sub[0] - 0.009, seamY: seam ? seam[0] : sub[0] - 0.02 };
}
function faceSampler(info, y0, y1, xr) {
  // front-most surface z(x,y) of the face region, by raycasting a small triangle subset of the bind-pose body
  const g = info.body.geometry, pos = g.attributes.position, idx = g.index.array; const P = []; const inR = i => { const y = pos.getY(i), x = pos.getX(i); return y > y0 && y < y1 && Math.abs(x) < xr && pos.getZ(i) > 0.03; };
  for (let t = 0; t < idx.length; t += 3) { const a = idx[t], b = idx[t + 1], c = idx[t + 2]; if (!(inR(a) || inR(b) || inR(c))) continue; for (const k of [a, b, c]) P.push(pos.getX(k), pos.getY(k), pos.getZ(k)); }
  const mg = new THREE.BufferGeometry(); mg.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); const mesh = new THREE.Mesh(mg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const rc = new THREE.Raycaster(); const o = V(), d = V(0, 0, -1), n = V(); const hits = [];
  return (x, y, outN) => { o.set(x, y, 0.4); rc.set(o, d); hits.length = 0; mesh.raycast(rc, hits); if (!hits.length) return null; let h = hits[0]; for (const q of hits) if (q.point.z > h.point.z) h = q; if (outN) { outN.copy(h.face.normal); if (outN.z < 0) outN.negate(); } return h.point.z; };
}
function mustacheGeometry(info, eyeY) {
  const key = info.H + ':' + eyeY.toFixed(4); if (MUST_CACHE[key]) return MUST_CACHE[key];
  const F = lipFeatures(info, eyeY); const S = faceSampler(info, F.seamY - 0.03, F.tipY + 0.01, 0.06); const rnd = mulberry(11);
  // outline (model units, relative to centre line): classic "chevron" — sits right under the nose, hangs just over the
  // top of the lip, reaches a little past the mouth corners and droops slightly at the tips
  const HW = 0.03, topC = F.subY - 0.0015, botC = (F.lipY + F.seamY) / 2 + 0.001;
  const top = u => topC + 0.004 * Math.abs(u) - 0.010 * Math.pow(Math.abs(u), 2.2);           // follows the nostril line, then curves down
  const bot = u => botC - 0.0065 * Math.pow(Math.abs(u), 1.6);                                   // drooping lower edge
  const thick = u => Math.max(0, top(u) - bot(u)) * (1 - Math.pow(Math.abs(u), 2.4) * 0.55 - Math.pow(Math.abs(u), 8) * 0.4); // fuller in the middle, tapers to the tips
  const surf = (x, y, off, nOut) => { const nn = nOut || V(); let z = S(x, y, nn); if (z === null) { z = S(x * 0.8, y, nn); if (z === null) return null; } return V(x, y, z).addScaledVector(nn, off); };
  const geos = [];
  // 1) base pad: thin shell that hugs the skin so no skin shows between strands
  { const NU = 26, NV = 7; const P = [], UV = [], I = [];
    for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) { const u = (i / NU * 2 - 1) * 0.93, v = 0.06 + j / NV * 0.78; const yt = top(u), yb = yt - thick(u); const y = yt + (yb - yt) * v; const x = u * HW;
      const off = 0.0009 + 0.0012 * Math.sin(Math.PI * v) * (1 - Math.abs(u) * 0.6); const p = surf(x, y, off) || V(x, y, 0.09); P.push(p.x, p.y, p.z); UV.push(v, (u + 1) / 2); }
    for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; I.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2)); g.setIndex(I); g.computeVertexNormals(); geos.push(g); }
  // 2) strands: short tapered hairs rooted under the nose, combed down and out, lying on the skin
  const n = V(); const N = 700;
  for (let s = 0; s < N; s++) {
    const u = (rnd() * 2 - 1) * 0.98; const yt = top(u), th = thick(u); if (th < 0.0015) continue;
    const v0 = Math.pow(rnd(), 1.5) * 0.6; const x0 = u * HW, y0 = yt - th * v0; const len = th * (1.08 - v0) * (0.8 + rnd() * 0.45); // a few overshoot the edge -> soft, hairy fringe
    const ang = -Math.PI / 2 + Math.sign(u) * (0.25 + Math.abs(u) * 0.55) + (rnd() - 0.5) * 0.25; const dx = Math.cos(ang), dy = Math.sin(ang);
    const pts = []; let ok = true;
    for (let k = 0; k <= 3; k++) { const t = k / 3; const lift = 0.0011 + 0.0017 * Math.sin(Math.PI * Math.min(1, t * 1.2)) + rnd() * 0.0004; const p = surf(x0 + dx * len * t, y0 + dy * len * t, lift, n); if (!p) { ok = false; break; } pts.push(p); }
    if (!ok) continue;
    const r0 = 0.00042 + rnd() * 0.00022; const g = taperedTube(pts, r0, 0.0001, 3, 3); const shade = 0.75 + rnd() * 0.5; const uv = g.attributes.uv; for (let q = 0; q < uv.count; q++) uv.setY(q, uv.getY(q) * 0.2 + shade * 0.8); geos.push(g);
  }
  const merged = mergeGeometries(geos.map(g => { g = g.index ? g : g; if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2)); if (g.attributes.normal === undefined) g.computeVertexNormals(); return g; }));
  // skin weights: copy from the nearest bind-pose face vertex (lip skin is ~85% Head, ~15% neck_01)
  const bg = info.body.geometry, bpos = bg.attributes.position, bsi = bg.attributes.skinIndex, bsw = bg.attributes.skinWeight; const cand = [];
  for (let i = 0; i < bpos.count; i++) { const y = bpos.getY(i), x = bpos.getX(i), z = bpos.getZ(i); if (y > F.seamY - 0.025 && y < F.tipY + 0.01 && Math.abs(x) < 0.05 && z > 0.04) cand.push(i); }
  const mp = merged.attributes.position, SI = new Uint16Array(mp.count * 4), SW = new Float32Array(mp.count * 4);
  for (let i = 0; i < mp.count; i++) { const x = mp.getX(i), y = mp.getY(i), z = mp.getZ(i); let best = cand[0], bd = 1e9; for (const c of cand) { const d = (bpos.getX(c) - x) ** 2 + (bpos.getY(c) - y) ** 2 + (bpos.getZ(c) - z) ** 2; if (d < bd) { bd = d; best = c; } }
    for (let k = 0; k < 4; k++) { SI[i * 4 + k] = bsi.getComponent(best, k); SW[i * 4 + k] = bsw.getComponent(best, k); } }
  merged.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4)); merged.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4));
  merged.computeBoundingBox(); merged.computeBoundingSphere(); merged.userData.features = F;
  return (MUST_CACHE[key] = merged);
}
function mustacheMaterial(color) {
  const m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(1.35), roughness: 0.55, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\n' + NOISE)
      .replace('#include <map_fragment>', '#include <map_fragment>\n{ vec2 u = vUvS; float s = pbN(vec3(u.y*180., u.x*5., 0.)); diffuseColor.rgb *= 0.7 + 0.55*s; }')
      .replace('void main() {', 'varying vec2 vUvS;\nvoid main() {');
    sh.vertexShader = sh.vertexShader.replace('void main() {', 'varying vec2 vUvS;\nvoid main() {').replace('#include <begin_vertex>', '#include <begin_vertex>\nvUvS = uv;');
  };
  m.customProgramCacheKey = () => 'pbmust'; return m;
}

// ---------- character spec presets ----------
const C = s => new THREE.Color(s);
export const CAST = {
  shayla: { base: 'female', tex: 'dark', skin: [1.15, 1.0, 0.88, 0], hair: { mesh: 'hair_long', color: '#22140c' }, brow: '#1a0f08',
    outfit: { top: { color: '#2e7d5b', color2: '#24644a', pat: 0, rough: 0.85, neck: 'v', sleeve: 'short', hem: 0.07 }, pants: { color: '#2e7d5b', color2: '#24644a', pat: 0, rough: 0.85 }, shoes: { color: '#f1f1f1', color2: '#9aa' } },
    acc: ['badge', 'stethoscope', 'watch'], scale: 1.0 },
  kennedy: { base: 'male', tex: 'light', skin: [1.02, 0.8, 0.64, 0.05], hair: { mesh: 'hair_buzzed', color: '#1a120c' }, curls: '#1d140d', brow: '#160e08',
    outfit: { top: { color: '#a8322a', color2: '#2c1c16', pat: 1, rough: 0.9, neck: 'crew', sleeve: 'long', thick: 0.013, hem: 0.0 }, pants: { color: '#3d5a86', color2: '#2a3d5c', pat: 2, rough: 0.8 }, shoes: { color: '#3a2a1e', color2: '#1a120c' } },
    acc: ['mustache'], scale: 1.06 },
  kelly: { base: 'female', tex: 'light', skin: [1.65, 1.38, 1.28, 0.38], hair: { mesh: 'hair_long', color: '#9c9078' }, brow: '#6c6250',
    outfit: { top: { color: '#d8323c', color2: '#a52430', pat: 3, rough: 0.95, neck: 'hood', sleeve: 'long', hem: -0.02, thick: 0.013 }, pants: { color: '#141416', color2: '#2a2a2e', pat: 0, rough: 0.8 }, shoes: { color: '#e9e9e9', color2: '#888' } },
    acc: ['glasses_black', 'hood', 'crossbag'], scale: 0.98 },
  kayleigh: { base: 'female', tex: 'light', skin: [1.6, 1.32, 1.2, 0.35], hair: { mesh: 'hair_buzzedfemale', color: '#1d1517' }, brow: '#1d1517',
    outfit: { top: { color: '#1f5fbf', color2: '#163f80', pat: 0, rough: 0.7, neck: 'crew', sleeve: 'long', open: 0.06, thick: 0.012 }, inner: { color: '#111114', color2: '#333' }, pants: { color: '#121214', color2: '#2a2a2e', pat: 0, rough: 0.8 }, shoes: { color: '#1a1a1a', color2: '#555' } },
    acc: ['glasses_tortoise', 'bun'], scale: 0.97 },
  kambree: { base: 'female', tex: 'light', skin: [1.6, 1.34, 1.22, 0.35], hair: { mesh: 'hair_buzzedfemale', color: '#3a2416' }, brow: '#2a170c', angry: true,
    outfit: { top: { color: '#151517', color2: '#2c2c30', pat: 0, rough: 0.35, neck: 'crew', sleeve: 'long', open: 0.07, thick: 0.013 }, inner: { color: '#ff6fae', color2: '#d64d8c' }, pants: { color: '#2a2a30', color2: '#444', pat: 0, rough: 0.8 }, shoes: { color: '#f4f4f4', color2: '#ff6fae' } },
    acc: ['ponytail', 'aviators_head', 'hoops', 'pin'], scale: 0.96 },
};
const ZOMBIE_OUTFITS = {
  gown: { top: { color: '#a9c6d6', color2: '#6f93a8', pat: 4, rough: 0.9, neck: 'crew', sleeve: 'short', gown: true }, shoes: null },
  scrubs: { top: { color: '#5d84b8', color2: '#46699a', pat: 0, rough: 0.85, neck: 'v', sleeve: 'short' }, pants: { color: '#5d84b8', color2: '#46699a', pat: 0, rough: 0.85 }, shoes: { color: '#ddd', color2: '#999' } },
  custard: { top: { color: '#1aa7a0', color2: '#f5d33c', pat: 0, rough: 0.8, neck: 'crew', sleeve: 'short' }, pants: { color: '#202024', color2: '#333', pat: 0 }, shoes: { color: '#222', color2: '#444' } },
  librarian: { top: { color: '#7c5a8a', color2: '#4a3352', pat: 3, rough: 0.95, neck: 'crew', sleeve: 'long', hem: -0.04 }, pants: { color: '#5a4a3a', color2: '#3a2e24', pat: 0 }, shoes: { color: '#3a2a1e', color2: '#222' } },
  farmer: { top: { color: '#6a8a3a', color2: '#e6d9b8', pat: 1, rough: 0.9, neck: 'crew', sleeve: 'long' }, pants: { color: '#4a5f80', color2: '#2a3d5c', pat: 2 }, shoes: { color: '#4a3020', color2: '#222' } },
  hipster: { top: { color: '#2b2b2b', color2: '#c84a2a', pat: 1, rough: 0.9, neck: 'crew', sleeve: 'long' }, pants: { color: '#20283a', color2: '#2a3d5c', pat: 2, length: 'capri' }, shoes: { color: '#e8e2d0', color2: '#a33' } },
  bachelorette: { top: { color: '#ff4fa0', color2: '#ffd1e6', pat: 0, rough: 0.4, neck: 'scoop', sleeve: 'none', hem: -0.1, gown: true }, shoes: { color: '#111', color2: '#f0c' } },
  frat: { top: { color: '#c41e2e', color2: '#fff', pat: 0, rough: 0.9, neck: 'crew', sleeve: 'short' }, pants: { color: '#b8a888', color2: '#8a7a5a', pat: 0, length: 'shorts' }, shoes: { color: '#eee', color2: '#999' } },
  graduate: { top: { color: '#1a1a1a', color2: '#9d2235', pat: 0, rough: 0.6, neck: 'v', sleeve: 'long', gown: true }, shoes: { color: '#111', color2: '#333' } },
  jogger: { top: { color: '#28c0e0', color2: '#111', pat: 0, rough: 0.5, neck: 'crew', sleeve: 'none' }, pants: { color: '#111', color2: '#28c0e0', pat: 0, length: 'shorts' }, shoes: { color: '#ff7a1a', color2: '#fff' } },
  kweepie: { top: { color: '#ffb3d1', color2: '#ffffff', pat: 4, rough: 0.9, neck: 'crew', sleeve: 'short', gown: true }, shoes: { color: '#fff', color2: '#ffb3d1' } },
};
export const ZOMBIE_TYPES = Object.keys(ZOMBIE_OUTFITS);

function gArrays(o) {
  const gcol = Array.from({ length: 6 }, () => C('#888')), gcol2 = Array.from({ length: 6 }, () => C('#444')), gpar = Array.from({ length: 6 }, () => new THREE.Vector4(0, 0.85, 0, 0));
  const set = (i, s) => { if (!s) return; gcol[i] = C(s.color); gcol2[i] = C(s.color2 || s.color); gpar[i] = new THREE.Vector4(s.pat || 0, s.rough !== undefined ? s.rough : 0.85, 0, 0); };
  set(1, o.top); set(2, o.inner || o.top); set(3, o.pants); set(4, o.shoes); set(5, o.gloves);
  if (o.inner) gpar[2].x = 0;
  for (const c of [...gcol, ...gcol2]) c.convertSRGBToLinear && 0;
  return { gcol, gcol2, gpar };
}

const GEO_CACHE = new Map();
function hairMesh(name, skeletonBones, color, rough) {
  const src = LIB[name]; let hm; src.scene.traverse(m => { if (m.isSkinnedMesh) hm = m; });
  const byName = {}; for (const b of skeletonBones) byName[b.name] = b;
  const bones = hm.skeleton.bones.map(b => byName[b.name]);
  const mesh = new THREE.SkinnedMesh(hm.geometry, hairMaterial(hm.material, color, rough));
  mesh.bind(new THREE.Skeleton(bones, hm.skeleton.boneInverses), hm.bindMatrix);
  mesh.castShadow = true; mesh.frustumCulled = false; return mesh;
}

export function makeCharacter(key, opts = {}) {
  const spec = typeof key === 'string' ? CAST[key] : key; const info = LIB[spec.base + 'Info'];
  const root = SkeletonUtils.clone(info.scene); root.name = 'char';
  let body, eyes, brows; root.traverse(m => { if (m.isSkinnedMesh) { if (m.name === 'Eyes') eyes = m; else if (m.name === 'Eyebrows') brows = m; else body = m; } });
  const bones = body.skeleton.bones; const bone = {}; for (const b of bones) bone[b.name] = b;
  const cacheKey = spec.base + JSON.stringify(spec.outfit);
  let geo = GEO_CACHE.get(cacheKey); if (!geo) { geo = tailorGeometry(info, spec.outfit); GEO_CACHE.set(cacheKey, geo); }
  body.geometry = geo;
  const ga = gArrays(spec.outfit); const top = spec.outfit.top || {};
  { const c = cutParams(info, spec.outfit); ga.cut1 = new THREE.Vector4(c.sleeveX, c.hemY, c.pantsY, c.ankleY); ga.cut2 = new THREE.Vector4(c.neckType, c.neckBase, c.gownY, c.flags); }
  if (top.open) ga.open = new THREE.Vector3(top.open, info.bp.pelvis.y - 0.02, info.bp.neck_01.y - 0.03);
  const zomb = spec.zomb || new THREE.Vector4(0, 0, 0, 0);
  body.material = bodyMaterial(info.body.material, { tex: spec.tex === 'light' ? info.lightTex : null, ...ga, skin: new THREE.Vector4(...spec.skin), zomb });
  body.castShadow = true; body.receiveShadow = true; body.frustumCulled = false;
  eyes.material = eyes.material.clone(); eyes.material.vertexColors = false;
  if (spec.eyeGlow) { eyes.material.emissive = new THREE.Color(spec.eyeGlow); eyes.material.emissiveIntensity = 1.6; eyes.material.color.set(spec.eyeGlow); }
  brows.material = hairMaterial(brows.material, spec.brow || '#222', 0.8);
  if (spec.hair && spec.hair.mesh) { const h = hairMesh(spec.hair.mesh, bones, spec.hair.color, spec.hair.rough); body.parent.add(h); }
  const ch = { root, body, eyes, brows, bone, spec, info, mats: [body.material], acc: [] };
  const head = bone.Head, prof = faceProfile(info), bp = info.bp;
  const eyeY = (info.eyes.geometry.boundingBox || (info.eyes.geometry.computeBoundingBox(), info.eyes.geometry.boundingBox)).getCenter(V()).y;
  const eyeFront = info.eyes.geometry.boundingBox.max.z, eyeX = info.eyes.geometry.boundingBox.max.x * 0.62;
  const attach = (obj, b) => { root.updateMatrixWorld(true); obj.updateMatrixWorld(true); (b || head).attach(obj); obj.traverse(o => { if (o.isMesh) { o.castShadow = true; } }); ch.acc.push(obj); return obj; };
  // scene is in bind pose; accessory world coords == model coords since root at origin
  for (const a of spec.acc || []) {
    if (a.startsWith('glasses')) { const gl = glasses(a.split('_')[1], eyeFront + 0.016, eyeY, eyeX * 1.02, 0.068, true, headSide(info, eyeY)); attach(gl); }
    if (a === 'aviators_head') { const gl = glasses('aviator', eyeFront + 0.03, eyeY + 0.105, eyeX, 0.08, false); gl.rotation.x = -0.55; gl.position.z -= 0.0; attach(gl); }
    if (a === 'mustache') { // skinned to the same bones as the lip skin -> stays glued to the upper lip in every pose
      const mg = mustacheGeometry(info, eyeY); const mm = new THREE.SkinnedMesh(mg, mustacheMaterial(spec.curls || (spec.hair && spec.hair.color) || spec.brow || '#1d140d'));
      mm.name = 'Mustache'; mm.position.copy(body.position); mm.quaternion.copy(body.quaternion); mm.scale.copy(body.scale);
      mm.bind(body.skeleton, body.bindMatrix); mm.frustumCulled = false; mm.castShadow = false; mm.receiveShadow = true; body.parent.add(mm); ch.mustache = mm;
    }
    if (a === 'hoops') for (const sx of [-1, 1]) { const t = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.0015, 6, 20), M.gold()); t.position.set(sx * 0.077, eyeY - 0.045, -0.01); t.rotation.y = Math.PI / 2; attach(t); }
    if (a === 'bun') {
      const g = new THREE.SphereGeometry(0.048, 20, 16); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const v = V(p.getX(i), p.getY(i), p.getZ(i)); const ang = Math.atan2(v.z, v.x) + v.y * 60; v.multiplyScalar(1 + Math.sin(ang * 3) * 0.06); p.setXYZ(i, v.x, v.y * 0.8, v.z); } g.computeVertexNormals();
      const bun = new THREE.Mesh(g, strandMaterial(C(spec.hair.color))); bun.position.set(0, eyeY + 0.135, -0.055); attach(bun);
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.007, 8, 18), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.7 })); t.position.set(0, eyeY + 0.105, -0.05); t.rotation.x = Math.PI / 2 + 0.6; attach(t);
    }
    if (a === 'ponytail') {
      const top = V(0, eyeY + 0.12, -0.07); const pts = [top, V(0, eyeY + 0.135, -0.12), V(0, eyeY + 0.07, -0.17), V(0, eyeY - 0.06, -0.165), V(0.01, eyeY - 0.17, -0.14)];
      const pony = new THREE.Mesh(taperedTube(pts, 0.03, 0.006, 30, 12), strandMaterial(C(spec.hair.color))); attach(pony);
      const sc = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.011, 8, 18), M.pink()); sc.position.copy(top).add(V(0, 0.006, -0.02)); sc.rotation.x = 1.0; attach(sc);
    }
    if (a === 'hood') {
      const pts = []; for (let i = 0; i <= 16; i++) { const t = i / 16 * Math.PI * 1.25 - Math.PI * 0.125; pts.push(V(Math.cos(t) * 0.11, bp.neck_01.y - 0.03 + Math.sin(t) * 0.025, -Math.sin(t) * 0.09 - 0.04)); }
      const hood = new THREE.Mesh(taperedTube(pts, 0.025, 0.025, 30, 10), new THREE.MeshStandardMaterial({ color: spec.outfit.top.color, roughness: 0.95 })); attach(hood, bone.spine_03);
      for (const sx of [-1, 1]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.14, 5), M.white()); s.position.set(sx * 0.03, bp.neck_01.y - 0.13, surfZ(info, bp.neck_01.y - 0.1, sx * 0.03) + 0.016); attach(s, bone.spine_03); }
    }
    if (a === 'crossbag') {
      const y0 = bp.spine_03.y; const pts = [V(-0.13, bp.neck_01.y - 0.035, 0.0), V(-0.06, y0 + 0.03, surfZ(info, y0 + 0.03, -0.06) + 0.012), V(0.03, y0 - 0.12, surfZ(info, y0 - 0.12, 0.03) + 0.016), V(0.12, bp.pelvis.y + 0.06, surfZ(info, bp.pelvis.y + 0.06, 0.12) + 0.02)];
      attach(new THREE.Mesh(taperedTube(pts, 0.005, 0.005, 20, 5), M.black()), bone.spine_02);
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.11, 0.05), M.clear()); bag.position.set(0.15, bp.pelvis.y + 0.0, 0.05); attach(bag, bone.pelvis);
      const stuff = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.02), new THREE.MeshStandardMaterial({ color: 0xffd2e4 })); stuff.position.set(0.13, bp.pelvis.y - 0.01, 0.05); attach(stuff, bone.pelvis);
    }
    if (a === 'badge') {
      const y = bp.spine_03.y + 0.04, x = 0.085; const cv = document.createElement('canvas'); cv.width = 64; cv.height = 96; const k = cv.getContext('2d'); k.fillStyle = '#fff'; k.fillRect(0, 0, 64, 96); k.fillStyle = '#c33'; k.fillRect(0, 0, 64, 18); k.fillStyle = '#fff'; k.font = 'bold 12px sans-serif'; k.fillText('OMR', 20, 14); k.fillStyle = '#8a6a50'; k.fillRect(16, 26, 32, 34); k.fillStyle = '#111'; k.font = 'bold 11px sans-serif'; k.fillText('SHAYLA', 8, 76); k.font = '9px sans-serif'; k.fillText('RN', 26, 90);
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.052, 0.003), [M.white(), M.white(), M.white(), M.white(), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }), M.white()]);
      b.position.set(x, y, surfZ(info, y, x) + 0.014); attach(b, bone.spine_03);
    }
    if (a === 'stethoscope') {
      const y = bp.neck_01.y; const pts = [V(0.045, y - 0.12, surfZ(info, y - 0.12, 0.045) + 0.014), V(0.07, y - 0.05, 0.04), V(0.075, y + 0.005, -0.01), V(0, y + 0.01, -0.075), V(-0.075, y + 0.005, -0.01), V(-0.07, y - 0.05, 0.04), V(-0.05, y - 0.13, surfZ(info, y - 0.13, -0.05) + 0.014), V(-0.045, y - 0.2, surfZ(info, y - 0.2, -0.045) + 0.016)];
      attach(new THREE.Mesh(taperedTube(pts, 0.0045, 0.0045, 40, 6), M.tube()), bone.spine_03);
      const cp = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.008, 16), M.silver()); cp.rotation.x = Math.PI / 2; cp.position.set(-0.045, y - 0.215, surfZ(info, y - 0.215, -0.045) + 0.02); attach(cp, bone.spine_03);
    }
    if (a === 'watch') { const hx = bp.hand_l.x - 0.04; const w = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 6, 16), M.black()); w.rotation.y = Math.PI / 2; w.position.set(hx, bp.hand_l.y, bp.hand_l.z + 0.005); attach(w, bone.lowerarm_l); }
    if (a === 'pin') { const y = bp.spine_03.y + 0.05, x = 0.1; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.004, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x331122 })); p.rotation.x = Math.PI / 2; p.position.set(x, y, surfZ(info, y, x) + 0.018); attach(p, bone.spine_03); }
  }
  if (spec.curls) { const cm = curlCluster(info, spec.curls, 7); attach(cm); }
  if (spec.angry) { root.userData.angry = true; brows.position.y -= 0.0; }
  if (spec.scale) root.scale.setScalar(spec.scale);
  // animation
  ch.mixer = new THREE.AnimationMixer(root); ch.actions = {}; ch.cur = null;
  ch.play = (name, fade = 0.2, opt = {}) => {
    const clip = LIB.clips[name]; if (!clip) return null; let a = ch.actions[name]; if (!a) { a = ch.actions[name] = ch.mixer.clipAction(clip); }
    if (opt.once) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; } else a.setLoop(THREE.LoopRepeat, Infinity);
    a.timeScale = opt.speed || 1; if (ch.cur === a && !opt.restart) return a;
    a.reset().play(); if (ch.cur && fade > 0) ch.cur.crossFadeTo(a, fade, false); else if (ch.cur) ch.cur.stop(); ch.cur = a; return a;
  };
  return ch;
}

export function makeZombie(type, seed = 1, female = false) {
  const o = ZOMBIE_OUTFITS[type] || ZOMBIE_OUTFITS.gown; const r = mulberry(seed * 977 + 13);
  const hairs = female ? ['hair_long', 'hair_buns', 'hair_buzzedfemale', 'hair_simpleparted'] : ['hair_buzzed', 'hair_simpleparted', null, 'hair_buzzed'];
  const hc = ['#2a1d14', '#5a4630', '#8a8478', '#1a1a1a', '#6a3a20'][Math.floor(r() * 5)];
  const spec = { base: female ? 'female' : 'male', tex: r() < 0.5 ? 'light' : 'dark', skin: [1, 1, 1, 0], hair: { mesh: hairs[Math.floor(r() * hairs.length)], color: hc, rough: 0.9 }, brow: hc,
    outfit: o, acc: [], zomb: new THREE.Vector4(0.85, r() * 50, 0.7 + r() * 0.3, 0.6 + r() * 0.4), eyeGlow: '#e8ff4a', scale: 0.95 + r() * 0.12 };
  const ch = makeCharacter(spec); ch.zombie = true; return ch;
}
