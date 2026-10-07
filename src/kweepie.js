// The Kweepie: original parody doll (pink bonnet, ruffle collar, button eyes with red pupils, stitched grin, KWEEPIE tag).
import * as THREE from 'three';
import { canvasTex } from './util.js';
let faceT, tagT;
function faceTex(angry) {
  return canvasTex(256, 256, (x) => {
    x.fillStyle = '#f6e3d6'; x.fillRect(0, 0, 256, 256);
    const g = x.createRadialGradient(80, 150, 2, 80, 150, 30); g.addColorStop(0, 'rgba(255,120,140,.7)'); g.addColorStop(1, 'rgba(255,120,140,0)'); x.fillStyle = g; x.fillRect(40, 110, 80, 80); const g2 = x.createRadialGradient(176, 150, 2, 176, 150, 30); g2.addColorStop(0, 'rgba(255,120,140,.7)'); g2.addColorStop(1, 'rgba(255,120,140,0)'); x.fillStyle = g2; x.fillRect(136, 110, 80, 80);
    for (const ex of [88, 168]) { x.fillStyle = '#111'; x.beginPath(); x.arc(ex, 112, 25, 0, 7); x.fill(); x.fillStyle = '#2a2a2a'; x.beginPath(); x.arc(ex, 112, 19, 0, 7); x.fill(); x.fillStyle = angry ? '#ff1010' : '#d01818'; x.beginPath(); x.arc(ex + 2, 110, 7, 0, 7); x.fill(); x.fillStyle = '#fff'; x.beginPath(); x.arc(ex - 8, 102, 4, 0, 7); x.fill(); x.strokeStyle = '#444'; x.lineWidth = 2; for (let a = 0; a < 4; a++) { x.beginPath(); x.arc(ex + Math.cos(a * 1.57 + .8) * 11, 112 + Math.sin(a * 1.57 + .8) * 11, 2.5, 0, 7); x.stroke(); } }
    x.strokeStyle = '#5a0a14'; x.lineWidth = 4; x.beginPath(); x.moveTo(70, 172); x.quadraticCurveTo(128, 214, 186, 172); x.stroke();
    x.lineWidth = 3; for (let i = 0; i <= 8; i++) { const t = i / 8, px = 70 + t * 116, py = 172 + Math.sin(t * Math.PI) * 21; x.beginPath(); x.moveTo(px, py - 9); x.lineTo(px, py + 9); x.stroke(); }
    x.strokeStyle = '#3a2a2a'; x.lineWidth = 3; x.beginPath(); x.moveTo(62, 78); x.lineTo(108, angry ? 92 : 82); x.moveTo(194, 78); x.lineTo(148, angry ? 92 : 82); x.stroke();
  });
}
export function makeKweepie(height = 1, angry = false) {
  const g = new THREE.Group(); const s = height; // modelled at 1m tall then scaled
  const porcelain = new THREE.MeshStandardMaterial({ color: 0xf6e6da, roughness: 0.25 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xff8ec5, roughness: 0.65 }); const pinkD = new THREE.MeshStandardMaterial({ color: 0xe35a9c, roughness: 0.7 }); const white = new THREE.MeshStandardMaterial({ color: 0xfaf7f2, roughness: 0.8 });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), [porcelain]); head.position.y = 0.72;
  const face = new THREE.Mesh(new THREE.SphereGeometry(0.201, 24, 18, -Math.PI * 0.32 - Math.PI / 2 + Math.PI, Math.PI * 0.64, Math.PI * 0.22, Math.PI * 0.56), new THREE.MeshStandardMaterial({ map: faceTex(angry), roughness: 0.3 }));
  face.position.y = 0.72; g.add(head, face); g.userData.head = head;
  const bon = new THREE.Mesh(new THREE.SphereGeometry(0.235, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), pink); bon.position.set(0, 0.74, -0.03); bon.rotation.x = -0.5; g.add(bon);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 8, 24), pinkD); brim.position.set(0, 0.78, 0.06); brim.rotation.x = -0.5 + Math.PI / 2 - 0.9; g.add(brim);
  const bow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), pinkD); bow.scale.set(1.8, 0.8, 0.6); bow.position.set(0, 0.56, 0.12); g.add(bow);
  const ruff = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 6, 20), white); ruff.rotation.x = Math.PI / 2; ruff.position.y = 0.53; ruff.scale.set(1, 1, 0.6); g.add(ruff);
  const dress = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.48, 20, 1, true), pink); dress.position.y = 0.26; dress.material.side = THREE.DoubleSide; g.add(dress);
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.025, 6, 24), white); hem.rotation.x = Math.PI / 2; hem.position.y = 0.03; g.add(hem);
  for (const sx of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.2, 4, 8), porcelain); arm.position.set(sx * 0.17, 0.4, 0.03); arm.rotation.z = sx * 0.5; arm.rotation.x = -0.4; g.add(arm); g.userData['arm' + sx] = arm; const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.08, 4, 8), porcelain); leg.position.set(sx * 0.08, 0.02, 0.03); g.add(leg); }
  tagT = tagT || canvasTex(128, 48, (x) => { x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 48); x.strokeStyle = '#e35a9c'; x.lineWidth = 4; x.strokeRect(2, 2, 124, 44); x.fillStyle = '#c0186a'; x.font = "bold 26px 'Black Ops One'"; x.textAlign = 'center'; x.fillText('KWEEPIE', 64, 34); });
  const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.045), new THREE.MeshStandardMaterial({ map: tagT, roughness: 0.6 })); tag.position.set(0.1, 0.35, 0.215); tag.rotation.set(-0.45, 0.25, 0.15); g.add(tag);
  g.scale.setScalar(s); g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  if (angry) { const eyeL = new THREE.PointLight(0xff2020, 2, 3 * s); eyeL.position.set(0, 0.73, 0.3); g.add(eyeL); }
  return g;
}
