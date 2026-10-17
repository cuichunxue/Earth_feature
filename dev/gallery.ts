// 開発用：動物モデルを一覧で並べて、見た目をチェックするページ（npm run dev → /dev/gallery.html）
import * as THREE from 'three';
import { ANIMAL_FACTORIES } from '../src/globe/animals';

const params = new URLSearchParams(location.search);
const only = params.get('only')?.split(',');
const names = Object.keys(ANIMAL_FACTORIES).filter((n) => !only || only.includes(n)) as (keyof typeof ANIMAL_FACTORIES)[];
const cols = Number(params.get('cols') ?? 6);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#cfe8f7');
scene.add(new THREE.HemisphereLight('#ffffff', '#6a7aaa', 1.9));
const sun = new THREE.DirectionalLight('#fff6e0', 2.1);
sun.position.set(-2, 3, 3);
scene.add(sun);
const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.75 });
const rows = Math.ceil(names.length / cols);
const gap = 1.25;
names.forEach((n, i) => {
  const m = new THREE.Mesh(ANIMAL_FACTORIES[n](), material);
  const c = i % cols;
  const r = Math.floor(i / cols);
  m.position.set((c - (cols - 1) / 2) * gap, 0, (r - (rows - 1) / 2) * gap);
  m.rotation.y = Number(params.get('yaw') ?? -0.6);
  scene.add(m);
  (m as any).label = n;
});
const camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 100);
const dist = Math.max(cols, rows * 1.6) * 1.6;
camera.position.set(0, dist * 0.55, dist * 0.85);
camera.lookAt(0, 0.2, 0);
renderer.render(scene, camera);
const box = document.getElementById('names')!;
scene.children.forEach((o: any) => {
  if (!o.label) return;
  const p = o.position.clone().setY(-0.05).project(camera);
  const s = document.createElement('span');
  s.textContent = o.label;
  s.style.left = `${(p.x * 0.5 + 0.5) * window.innerWidth}px`;
  s.style.top = `${(-p.y * 0.5 + 0.5) * window.innerHeight}px`;
  box.append(s);
});
(window as any).ready = true;
