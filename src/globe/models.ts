import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * ローポリ（カクカクしたおもちゃっぽい）3Dモデルを、箱・円柱・球などの組み合わせで作ります。
 * どのモデルも「高さ約1・+X 方向が正面・地面が y=0」の大きさで作り、置くときに縮小します。
 * 色は頂点カラーとして1つの形に焼き込むので、1種類につき1回の描画で何百個でも描けます。
 */

type V3 = [number, number, number];
interface Place {
  p?: V3; // 位置
  r?: V3; // 回転（ラジアン）
  s?: V3; // 拡大
}

class Builder {
  private parts: THREE.BufferGeometry[] = [];

  add(geometry: THREE.BufferGeometry, color: string, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] }: Place = {}) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.deleteAttribute('uv');
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...p),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
        new THREE.Vector3(...s),
      ),
    );
    const c = new THREE.Color(color);
    const count = g.attributes.position.count;
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) c.toArray(colors, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.parts.push(g);
    return this;
  }

  build() {
    const merged = mergeGeometries(this.parts)!;
    merged.computeBoundingSphere();
    return merged;
  }
}

// ---- 形のパーツ（面の数を少なくしてカクカクに） ----
const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
const cone = (r: number, h: number, seg = 8) => new THREE.ConeGeometry(r, h, seg);
const ball = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
const gem = (r: number) => new THREE.IcosahedronGeometry(r, 0);

const Q = Math.PI / 4;

/** 建物の下に敷く丸い台（ジオラマっぽく見せる） */
function base(b: Builder, color: string, r = 0.55) {
  b.add(cyl(r, r + 0.05, 0.06, 10), color, { p: [0, 0.03, 0] });
}

const GRASS = '#7cc456';
const SAND = '#ecd39a';
const STONE = '#b9b2a6';
const SNOW = '#f4f8fc';

// =====================================================================
// ランドマーク
// =====================================================================

function latticeTower(legColor: string, midColor: string, topColor: string) {
  const b = new Builder();
  base(b, GRASS, 0.5);
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      b.add(box(0.07, 0.38, 0.07), legColor, { p: [sx * 0.15, 0.24, sz * 0.15], r: [-sz * 0.32, 0, sx * 0.32] });
  b.add(box(0.32, 0.035, 0.32), midColor, { p: [0, 0.42, 0] });
  b.add(cyl(0.05, 0.12, 0.34, 4), midColor, { p: [0, 0.6, 0], r: [0, Q, 0] });
  b.add(box(0.14, 0.03, 0.14), topColor, { p: [0, 0.77, 0] });
  b.add(cyl(0.012, 0.05, 0.24, 4), topColor, { p: [0, 0.9, 0], r: [0, Q, 0] });
  b.add(cyl(0.006, 0.006, 0.1, 4), topColor, { p: [0, 1.05, 0] });
  return b.build();
}

function pyramids() {
  const b = new Builder();
  base(b, SAND, 0.75);
  b.add(cone(0.55, 0.85, 4), '#e3be72', { p: [0, 0.48, 0], r: [0, Q, 0] });
  b.add(cone(0.38, 0.6, 4), '#d9b266', { p: [0.42, 0.36, 0.38], r: [0, Q, 0] });
  b.add(cone(0.24, 0.38, 4), '#cfa95e', { p: [-0.35, 0.25, 0.42], r: [0, Q, 0] });
  return b.build();
}

function stepPyramid() {
  const b = new Builder();
  base(b, GRASS, 0.6);
  for (let i = 0; i < 5; i++) b.add(box(0.8 - i * 0.14, 0.12, 0.8 - i * 0.14), i % 2 ? '#c9b48c' : '#bda67c', { p: [0, 0.12 + i * 0.12, 0] });
  b.add(box(0.18, 0.14, 0.18), '#a88f66', { p: [0, 0.73, 0] });
  b.add(box(0.1, 0.5, 0.12), '#d9c7a2', { p: [0.36, 0.33, 0], r: [0, 0, 0.75] }); // 階段
  return b.build();
}

function snowMountain(body: string, peaks: number) {
  const b = new Builder();
  b.add(cone(0.6, 1, 7), body, { p: [0, 0.5, 0] });
  b.add(cone(0.24, 0.4, 7), SNOW, { p: [0, 0.81, 0] });
  if (peaks > 1) {
    b.add(cone(0.42, 0.65, 6), body, { p: [0.4, 0.32, 0.25] });
    b.add(cone(0.16, 0.25, 6), SNOW, { p: [0.4, 0.53, 0.25] });
    b.add(cone(0.38, 0.55, 6), body, { p: [-0.38, 0.27, -0.2] });
    b.add(cone(0.14, 0.2, 6), SNOW, { p: [-0.38, 0.45, -0.2] });
  }
  return b.build();
}

function fuji() {
  const b = new Builder();
  b.add(cyl(0.12, 0.75, 0.85, 10), '#5f78b5', { p: [0, 0.425, 0] });
  b.add(cyl(0.12, 0.33, 0.38, 10), SNOW, { p: [0, 0.66, 0] });
  b.add(cyl(0.6, 0.85, 0.08, 10), GRASS, { p: [0, 0.04, 0] });
  return b.build();
}

function volcano() {
  const b = new Builder();
  b.add(cyl(0.2, 0.7, 0.75, 8), '#6b4f43', { p: [0, 0.375, 0] });
  b.add(cyl(0.17, 0.2, 0.04, 8), '#ff5a1f', { p: [0, 0.76, 0] });
  b.add(cone(0.12, 0.35, 5), '#ff8a1f', { p: [0.25, 0.45, 0], r: [0, 0, -0.55] }); // 溶岩の流れ
  b.add(gem(0.14), '#d7d7df', { p: [0, 0.95, 0] });
  b.add(gem(0.11), '#c3c3cf', { p: [0.08, 1.12, 0.05] });
  b.add(gem(0.08), '#b4b4c2', { p: [0.16, 1.25, 0] });
  return b.build();
}

function pagoda() {
  const b = new Builder();
  base(b, GRASS, 0.45);
  for (let i = 0; i < 5; i++) {
    const w = 0.36 - i * 0.05;
    const y = 0.06 + i * 0.16;
    b.add(box(w * 0.7, 0.1, w * 0.7), '#a5432f', { p: [0, y + 0.05, 0] });
    b.add(cone(w * 0.95, 0.09, 4), '#3e3d4f', { p: [0, y + 0.14, 0], r: [0, Q, 0] });
  }
  b.add(cyl(0.012, 0.012, 0.2), '#d9b13b', { p: [0, 0.98, 0] });
  return b.build();
}

function torii() {
  const b = new Builder();
  b.add(cyl(0.6, 0.6, 0.04, 12), '#4fb3e8', { p: [0, 0.02, 0] }); // 海
  const red = '#e0412b';
  for (const z of [-0.28, 0.28]) b.add(cyl(0.05, 0.06, 0.8, 8), red, { p: [0, 0.42, z] });
  b.add(box(0.12, 0.07, 0.9), '#2c2c34', { p: [0, 0.86, 0] });
  b.add(box(0.1, 0.06, 0.82), red, { p: [0, 0.79, 0] });
  b.add(box(0.07, 0.05, 0.7), red, { p: [0, 0.64, 0] });
  return b.build();
}

function greatWall() {
  const b = new Builder();
  b.add(ball(0.6, 8, 4), '#78b84e', { p: [0, 0, 0], s: [1.3, 0.55, 0.8] });
  const wall = '#c2ad86';
  const pts: [number, number, number][] = [
    [-0.7, 0.18, 0.1],
    [-0.35, 0.28, -0.1],
    [0, 0.33, 0.05],
    [0.35, 0.28, -0.12],
    [0.7, 0.16, 0.08],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1, z1] = pts[i];
    const [x2, y2, z2] = pts[i + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    b.add(box(len + 0.04, 0.1, 0.08), wall, {
      p: [(x1 + x2) / 2, (y1 + y2) / 2 + 0.05, (z1 + z2) / 2],
      r: [0, -Math.atan2(z2 - z1, x2 - x1), Math.atan2(y2 - y1, len)],
    });
  }
  for (const [x, y, z] of [pts[0], pts[2], pts[4]]) b.add(box(0.14, 0.22, 0.14), '#b09a72', { p: [x, y + 0.11, z] });
  return b.build();
}

function tajMahal() {
  const b = new Builder();
  base(b, GRASS, 0.6);
  const white = '#f7f3ec';
  b.add(box(0.85, 0.08, 0.85), '#e8e1d4', { p: [0, 0.1, 0] });
  b.add(box(0.42, 0.3, 0.42), white, { p: [0, 0.29, 0] });
  b.add(ball(0.17, 10, 8), white, { p: [0, 0.52, 0], s: [1, 1.25, 1] });
  b.add(cone(0.03, 0.14, 6), '#d9b13b', { p: [0, 0.78, 0] });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      b.add(cyl(0.025, 0.035, 0.45, 6), white, { p: [sx * 0.36, 0.36, sz * 0.36] });
      b.add(ball(0.045, 6, 4), white, { p: [sx * 0.36, 0.6, sz * 0.36] });
      b.add(ball(0.07, 6, 4), white, { p: [sx * 0.15, 0.46, sz * 0.15] });
    }
  return b.build();
}

function mosque() {
  const b = new Builder();
  base(b, STONE, 0.6);
  b.add(box(0.6, 0.3, 0.6), '#e2a98c', { p: [0, 0.21, 0] });
  b.add(cyl(0.22, 0.24, 0.1, 10), '#e2a98c', { p: [0, 0.41, 0] });
  b.add(ball(0.22, 10, 6), '#8ea2ba', { p: [0, 0.46, 0], s: [1, 0.7, 1] });
  for (const sx of [-1, 1])
    for (const sz of [-1, 1]) {
      b.add(cyl(0.025, 0.03, 0.62, 6), '#efe6da', { p: [sx * 0.4, 0.37, sz * 0.4] });
      b.add(cone(0.04, 0.14, 6), '#8ea2ba', { p: [sx * 0.4, 0.75, sz * 0.4] });
    }
  return b.build();
}

function colosseum() {
  const b = new Builder();
  base(b, GRASS, 0.62);
  const n = 18;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const broken = i > 11 && i < 16;
    const h = broken ? 0.22 + (i % 2) * 0.08 : 0.42;
    b.add(box(0.16, h, 0.07), i % 2 ? '#dcbf8f' : '#cfb07f', {
      p: [Math.cos(a) * 0.45, 0.06 + h / 2, Math.sin(a) * 0.32],
      r: [0, -a + Math.PI / 2, 0],
    });
  }
  b.add(cyl(0.36, 0.36, 0.02, 12), SAND, { p: [0, 0.07, 0], s: [1, 1, 0.7] });
  return b.build();
}

function leaningTower() {
  const b = new Builder();
  base(b, GRASS, 0.4);
  const tilt: V3 = [0, 0, -0.12];
  for (let i = 0; i < 6; i++) {
    const y = 0.13 + i * 0.13;
    b.add(cyl(0.13, 0.13, 0.12, 10), '#f4efe2', { p: [-Math.sin(0.12) * y, y, 0], r: tilt });
    b.add(cyl(0.145, 0.145, 0.02, 10), '#d6cdb8', { p: [-Math.sin(0.12) * (y + 0.065), y + 0.065, 0], r: tilt });
  }
  b.add(cyl(0.09, 0.1, 0.1, 10), '#f4efe2', { p: [-Math.sin(0.12) * 0.92, 0.92, 0], r: tilt });
  return b.build();
}

function bigBen() {
  const b = new Builder();
  base(b, GRASS, 0.5);
  const gold = '#c9a465';
  b.add(box(0.2, 0.72, 0.2), gold, { p: [0, 0.42, 0] });
  b.add(box(0.24, 0.16, 0.24), '#b8915a', { p: [0, 0.86, 0] });
  for (const [x, z, ry] of [
    [0.121, 0, Math.PI / 2],
    [-0.121, 0, Math.PI / 2],
    [0, 0.121, 0],
    [0, -0.121, 0],
  ])
    b.add(cyl(0.065, 0.065, 0.01, 10), '#fffaf0', { p: [x, 0.86, z], r: [Math.PI / 2, ry, 0] });
  b.add(cone(0.15, 0.3, 4), '#4b5d58', { p: [0, 1.09, 0], r: [0, Q, 0] });
  b.add(box(0.6, 0.22, 0.2), '#bf9a63', { p: [0.36, 0.17, 0.12] }); // 議事堂
  return b.build();
}

function statueOfLiberty() {
  const b = new Builder();
  base(b, GRASS, 0.42);
  b.add(box(0.3, 0.22, 0.3), '#b9ab94', { p: [0, 0.17, 0] });
  b.add(box(0.22, 0.12, 0.22), '#a8987f', { p: [0, 0.34, 0] });
  const green = '#79bba5';
  b.add(cyl(0.05, 0.12, 0.45, 7), green, { p: [0, 0.62, 0] });
  b.add(ball(0.06, 7, 5), green, { p: [0, 0.89, 0] });
  b.add(cone(0.08, 0.05, 7), green, { p: [0, 0.94, 0] });
  b.add(cyl(0.02, 0.025, 0.25, 5), green, { p: [0.04, 0.95, 0], r: [0, 0, -0.15] });
  b.add(cone(0.035, 0.08, 6), '#ffc93c', { p: [0.06, 1.1, 0] });
  b.add(box(0.08, 0.1, 0.02), green, { p: [0, 0.68, 0.1] }); // 本（独立宣言）
  return b.build();
}

function goldenGate() {
  const b = new Builder();
  b.add(box(1.4, 0.03, 0.5), '#4fb3e8', { p: [0, 0.015, 0] }); // 海
  const red = '#d0452f';
  b.add(box(1.4, 0.04, 0.1), red, { p: [0, 0.22, 0] });
  for (const x of [-0.38, 0.38]) {
    for (const z of [-0.06, 0.06]) b.add(box(0.05, 0.7, 0.05), red, { p: [x, 0.35, z] });
    b.add(box(0.06, 0.04, 0.16), red, { p: [x, 0.66, 0] });
    b.add(box(0.06, 0.04, 0.16), red, { p: [x, 0.45, 0] });
  }
  for (const [x1, x2] of [
    [-0.7, -0.38],
    [-0.38, 0],
    [0, 0.38],
    [0.38, 0.7],
  ]) {
    const y1 = Math.abs(x1) > 0.5 ? 0.24 : Math.abs(x1) > 0.2 ? 0.68 : 0.26;
    const y2 = Math.abs(x2) > 0.5 ? 0.24 : Math.abs(x2) > 0.2 ? 0.68 : 0.26;
    const len = Math.hypot(x2 - x1, y2 - y1);
    b.add(box(len, 0.015, 0.14), red, { p: [(x1 + x2) / 2, (y1 + y2) / 2, 0], r: [0, 0, Math.atan2(y2 - y1, x2 - x1)] });
  }
  return b.build();
}

function operaHouse() {
  const b = new Builder();
  b.add(cyl(0.6, 0.6, 0.04, 12), '#4fb3e8', { p: [0, 0.02, 0] });
  b.add(box(0.85, 0.1, 0.4), '#e2cfa8', { p: [0, 0.09, 0] });
  const white = '#fbfaf5';
  [0.35, 0.12, -0.12, -0.32].forEach((x, i) => {
    const h = 0.55 - i * 0.08;
    b.add(cone(0.15, h, 3), white, { p: [x, 0.12 + h / 2, 0.06], r: [0, Math.PI / 2, 0.45] });
    b.add(cone(0.11, h * 0.8, 3), '#efece4', { p: [x + 0.03, 0.1 + h * 0.4, -0.1], r: [0, Math.PI / 2, 0.4] });
  });
  return b.build();
}

function christRedeemer() {
  const b = new Builder();
  b.add(cone(0.65, 0.6, 7), '#5aa748', { p: [0, 0.3, 0] });
  const w = '#eceae4';
  b.add(box(0.1, 0.08, 0.1), '#d1cec6', { p: [0, 0.62, 0] });
  b.add(cyl(0.05, 0.08, 0.3, 6), w, { p: [0, 0.8, 0] });
  b.add(box(0.5, 0.05, 0.05), w, { p: [0, 0.91, 0] });
  b.add(ball(0.045, 6, 5), w, { p: [0, 1.0, 0] });
  return b.build();
}

function moai() {
  const b = new Builder();
  base(b, GRASS, 0.55);
  b.add(box(0.85, 0.08, 0.25), STONE, { p: [0, 0.1, 0] });
  for (const z of [-0.28, 0, 0.28]) {
    const g = '#80746a';
    b.add(cyl(0.11, 0.13, 0.55, 5), g, { p: [0, 0.42, z], s: [0.8, 1, 1] });
    b.add(box(0.08, 0.2, 0.06), '#6d6158', { p: [0.1, 0.5, z] }); // 鼻
    b.add(box(0.06, 0.04, 0.2), '#6d6158', { p: [0.08, 0.6, z] }); // まゆ
  }
  return b.build();
}

function stonehenge() {
  const b = new Builder();
  base(b, GRASS, 0.55);
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (i === 7) continue;
    b.add(box(0.09, 0.3, 0.07), '#9c9a94', { p: [Math.cos(a) * 0.38, 0.21, Math.sin(a) * 0.38], r: [0, -a, 0] });
    if (i % 2 === 0 && i < 6) {
      const a2 = a + Math.PI / n;
      b.add(box(0.07, 0.05, 0.28), '#8a8882', { p: [Math.cos(a2) * 0.38, 0.38, Math.sin(a2) * 0.38], r: [0, -a2, 0] });
    }
  }
  return b.build();
}

function windmill() {
  const b = new Builder();
  base(b, GRASS, 0.42);
  b.add(cyl(0.12, 0.2, 0.55, 8), '#b0503c', { p: [0, 0.34, 0] });
  b.add(cone(0.15, 0.18, 8), '#4b4b58', { p: [0, 0.7, 0] });
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.3;
    b.add(box(0.015, 0.42, 0.08), '#f4efe2', { p: [0.17, 0.62 + Math.cos(a) * 0.21, Math.sin(a) * 0.21], r: [a, 0, 0] });
  }
  b.add(box(0.04, 0.03, 0.03), '#4b4b58', { p: [0.15, 0.62, 0] });
  // チューリップ畑
  ['#ff4f6d', '#ffd23f', '#ff8fc5'].forEach((c, i) => b.add(box(0.12, 0.04, 0.5), c, { p: [-0.3 + i * 0.14, 0.08, 0.05] }));
  return b.build();
}

function onionDomes() {
  const b = new Builder();
  base(b, STONE, 0.5);
  b.add(box(0.55, 0.22, 0.55), '#b24a3a', { p: [0, 0.17, 0] });
  const domes: [number, number, number, string][] = [
    [0, 0, 0.85, '#e7b73c'],
    [0.22, 0.2, 0.55, '#3faa63'],
    [-0.22, 0.2, 0.5, '#4f8fd9'],
    [0.22, -0.2, 0.5, '#e65a4a'],
    [-0.22, -0.2, 0.58, '#2fb4a4'],
  ];
  for (const [x, z, h, c] of domes) {
    b.add(cyl(0.06, 0.07, h - 0.2, 8), '#d9c6a0', { p: [x, 0.18 + (h - 0.2) / 2, z] });
    b.add(ball(0.1, 8, 6), c, { p: [x, h, z], s: [1, 1.1, 1] });
    b.add(cone(0.04, 0.12, 6), c, { p: [x, h + 0.14, z] });
  }
  return b.build();
}

function castle() {
  const b = new Builder();
  b.add(cone(0.65, 0.3, 8), '#5aa748', { p: [0, 0.15, 0] });
  const w = '#f2efe8';
  const roof = '#4c6a9a';
  b.add(box(0.45, 0.3, 0.22), w, { p: [0, 0.45, 0] });
  b.add(cone(0.18, 0.18, 4), roof, { p: [0, 0.69, 0], s: [1.4, 1, 0.7], r: [0, Q, 0] });
  for (const [x, z, h] of [
    [-0.25, 0.1, 0.55],
    [0.25, -0.08, 0.7],
    [0.1, 0.14, 0.45],
  ]) {
    b.add(cyl(0.06, 0.06, h, 8), w, { p: [x, 0.3 + h / 2, z] });
    b.add(cone(0.08, 0.2, 8), roof, { p: [x, 0.3 + h + 0.1, z] });
  }
  return b.build();
}

function skyscraper() {
  const b = new Builder();
  base(b, SAND, 0.4);
  const c = '#b9cbe0';
  for (let i = 0; i < 6; i++) {
    const r = 0.15 - i * 0.022;
    b.add(cyl(r, r, 0.15, 6), i % 2 ? c : '#a7bdd6', { p: [0, 0.135 + i * 0.15, 0] });
  }
  b.add(cyl(0.008, 0.02, 0.22, 6), '#d8e2ee', { p: [0, 1.07, 0] });
  return b.build();
}

function twinTowers() {
  const b = new Builder();
  base(b, GRASS, 0.4);
  for (const z of [-0.14, 0.14]) {
    for (let i = 0; i < 5; i++) {
      const r = 0.09 - i * 0.012;
      b.add(cyl(r, r, 0.16, 8), i % 2 ? '#c8d2dc' : '#aebac8', { p: [0, 0.14 + i * 0.16, z] });
    }
    b.add(cone(0.02, 0.18, 6), '#d8e2ee', { p: [0, 1.0, z] });
  }
  b.add(box(0.06, 0.04, 0.2), '#8796a8', { p: [0, 0.5, 0] });
  return b.build();
}

function tvTower() {
  const b = new Builder();
  base(b, GRASS, 0.32);
  b.add(cyl(0.035, 0.07, 0.8, 8), '#e9ecef', { p: [0, 0.46, 0] });
  b.add(cyl(0.15, 0.1, 0.09, 10), '#d0d7df', { p: [0, 0.72, 0] });
  b.add(cyl(0.1, 0.13, 0.04, 10), '#7fb3e3', { p: [0, 0.79, 0] });
  b.add(cyl(0.01, 0.015, 0.22, 6), '#e0412b', { p: [0, 0.92, 0] });
  return b.build();
}

function machuPicchu() {
  const b = new Builder();
  b.add(cone(0.3, 0.95, 6), '#4f9a43', { p: [-0.28, 0.47, -0.1] });
  for (let i = 0; i < 4; i++) b.add(box(0.8 - i * 0.12, 0.07, 0.6 - i * 0.08), i % 2 ? '#7cc456' : '#9a8f80', { p: [0.15, 0.04 + i * 0.07, 0.05] });
  for (const [x, z] of [
    [0.05, 0.1],
    [0.25, -0.05],
    [0.35, 0.15],
  ]) {
    b.add(box(0.1, 0.07, 0.08), '#a69b8b', { p: [x, 0.33, z] });
    b.add(cone(0.08, 0.07, 4), '#8a6d48', { p: [x, 0.4, z], r: [0, Q, 0] });
  }
  return b.build();
}

function angkor() {
  const b = new Builder();
  base(b, GRASS, 0.6);
  const s = '#a89a7c';
  b.add(box(0.8, 0.08, 0.8), '#bcae8f', { p: [0, 0.1, 0] });
  b.add(box(0.6, 0.1, 0.6), s, { p: [0, 0.19, 0] });
  const tower = (x: number, z: number, h: number) => {
    b.add(cyl(0.03, 0.09, h, 6), '#968869', { p: [x, 0.24 + h / 2, z] });
    b.add(ball(0.05, 6, 4), '#968869', { p: [x, 0.24 + h * 0.4, z] });
  };
  tower(0, 0, 0.7);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) tower(sx * 0.22, sz * 0.22, 0.42);
  return b.build();
}

function sagrada() {
  const b = new Builder();
  base(b, STONE, 0.45);
  b.add(box(0.5, 0.28, 0.3), '#d8c39b', { p: [0, 0.2, 0] });
  const spires: [number, number, number][] = [
    [0, 0, 1.0],
    [-0.15, 0.1, 0.78],
    [0.15, 0.1, 0.8],
    [-0.15, -0.1, 0.72],
    [0.15, -0.1, 0.74],
    [0.3, 0, 0.6],
    [-0.3, 0, 0.62],
  ];
  for (const [x, z, h] of spires) {
    b.add(cone(0.06, h, 6), '#cdb385', { p: [x, 0.06 + h / 2, z] });
    b.add(ball(0.03, 5, 4), '#e8443a', { p: [x, 0.08 + h, z] });
  }
  return b.build();
}

function parthenon() {
  const b = new Builder();
  b.add(cyl(0.5, 0.65, 0.25, 7), '#b5a58a', { p: [0, 0.125, 0] }); // アクロポリスの丘
  b.add(box(0.75, 0.05, 0.42), '#efe7d6', { p: [0, 0.27, 0] });
  const w = '#f6f0e3';
  for (let i = 0; i < 6; i++)
    for (const z of [-0.16, 0.16]) b.add(cyl(0.025, 0.028, 0.3, 6), w, { p: [-0.3 + i * 0.12, 0.44, z] });
  b.add(box(0.75, 0.05, 0.42), '#efe7d6', { p: [0, 0.615, 0] });
  b.add(cyl(0.21, 0.21, 0.72, 3), '#e6dcc6', { p: [0, 0.7, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 0.45] });
  return b.build();
}

function uluru() {
  const b = new Builder();
  b.add(ball(0.6, 9, 5), '#c75b2f', { p: [0, 0, 0], s: [1.1, 0.55, 0.62] });
  b.add(ball(0.45, 7, 4), '#d16a39', { p: [0.15, 0.05, 0.1], s: [1, 0.55, 0.6] });
  return b.build();
}

function stupa() {
  const b = new Builder();
  base(b, STONE, 0.45);
  const gold = '#e8b830';
  b.add(box(0.55, 0.08, 0.55), '#d8cdb5', { p: [0, 0.1, 0] });
  b.add(box(0.42, 0.08, 0.42), gold, { p: [0, 0.18, 0] });
  b.add(ball(0.2, 10, 6), gold, { p: [0, 0.32, 0], s: [1, 1.1, 1] });
  b.add(cone(0.1, 0.55, 10), '#f0c442', { p: [0, 0.72, 0] });
  b.add(ball(0.025, 5, 4), '#ffffff', { p: [0, 1.0, 0] });
  return b.build();
}

function yurt() {
  const b = new Builder();
  base(b, GRASS, 0.5);
  b.add(cyl(0.32, 0.32, 0.22, 10), '#f6f1e6', { p: [0, 0.17, 0] });
  b.add(cone(0.36, 0.2, 10), '#efe5d1', { p: [0, 0.38, 0] });
  b.add(box(0.03, 0.15, 0.1), '#d0452f', { p: [0.32, 0.14, 0] });
  b.add(cyl(0.32 * 1.005, 0.32 * 1.005, 0.03, 10), '#4f8fd9', { p: [0, 0.25, 0] });
  return b.build();
}

// =====================================================================
// 動物（+X 方向を向いている）
// =====================================================================

function legs(b: Builder, color: string, xs: number[], zs: number[], h: number, r = 0.03) {
  for (const x of xs) for (const z of zs) b.add(cyl(r, r * 0.8, h, 5), color, { p: [x, h / 2, z] });
}

function giraffe() {
  const b = new Builder();
  const y = '#ebb24c';
  const brown = '#8a5527';
  legs(b, y, [-0.15, 0.15], [-0.07, 0.07], 0.45, 0.025);
  b.add(ball(0.2, 7, 5), y, { p: [0, 0.52, 0], s: [1.4, 0.8, 0.75] });
  b.add(cyl(0.04, 0.06, 0.5, 6), y, { p: [0.24, 0.78, 0], r: [0, 0, -0.45] });
  b.add(box(0.18, 0.08, 0.08), y, { p: [0.4, 1.02, 0] });
  b.add(cyl(0.01, 0.01, 0.07, 4), brown, { p: [0.36, 1.09, 0.025] });
  b.add(cyl(0.01, 0.01, 0.07, 4), brown, { p: [0.36, 1.09, -0.025] });
  for (const [x, yy, z] of [
    [0.05, 0.62, 0.13],
    [-0.12, 0.55, 0.14],
    [0.1, 0.5, -0.14],
    [-0.08, 0.6, -0.13],
    [0.22, 0.72, 0.05],
  ])
    b.add(gem(0.045), brown, { p: [x, yy, z], s: [1, 1, 0.5] });
  return b.build();
}

function elephant() {
  const b = new Builder();
  const g = '#97a0ab';
  legs(b, g, [-0.18, 0.18], [-0.12, 0.12], 0.32, 0.07);
  b.add(ball(0.3, 8, 6), g, { p: [0, 0.5, 0], s: [1.25, 0.9, 0.85] });
  b.add(ball(0.17, 7, 5), g, { p: [0.38, 0.62, 0] });
  for (const z of [-0.16, 0.16]) b.add(ball(0.15, 6, 4), '#a9b1ba', { p: [0.32, 0.62, z], s: [0.3, 1, 1] });
  b.add(cyl(0.035, 0.06, 0.4, 6), g, { p: [0.55, 0.42, 0], r: [0, 0, 0.25] });
  for (const z of [-0.06, 0.06]) b.add(cone(0.02, 0.15, 5), '#fffaf0', { p: [0.52, 0.5, z], r: [0, 0, -1.9] });
  b.add(cyl(0.01, 0.01, 0.2, 4), g, { p: [-0.38, 0.45, 0], r: [0, 0, -0.4] });
  return b.build();
}

function lion() {
  const b = new Builder();
  const c = '#dba24c';
  legs(b, c, [-0.18, 0.18], [-0.08, 0.08], 0.28, 0.035);
  b.add(ball(0.2, 7, 5), c, { p: [0, 0.38, 0], s: [1.45, 0.8, 0.8] });
  b.add(gem(0.2), '#9a5a22', { p: [0.27, 0.5, 0] });
  b.add(ball(0.12, 7, 5), c, { p: [0.36, 0.5, 0] });
  b.add(box(0.05, 0.04, 0.06), '#5a3a22', { p: [0.48, 0.5, 0] });
  b.add(cyl(0.012, 0.012, 0.3, 4), c, { p: [-0.38, 0.38, 0], r: [0, 0, 1.0] });
  b.add(gem(0.04), '#9a5a22', { p: [-0.5, 0.3, 0] });
  return b.build();
}

function zebra() {
  const b = new Builder();
  const w = '#f7f7f2';
  const k = '#26262c';
  legs(b, w, [-0.16, 0.16], [-0.07, 0.07], 0.34, 0.025);
  b.add(ball(0.18, 7, 5), w, { p: [0, 0.45, 0], s: [1.45, 0.85, 0.8] });
  for (const x of [-0.16, -0.06, 0.04, 0.14]) b.add(box(0.035, 0.32, 0.3), k, { p: [x, 0.45, 0], s: [1, 1, 1] });
  b.add(box(0.1, 0.28, 0.08), w, { p: [0.25, 0.62, 0], r: [0, 0, -0.5] });
  b.add(box(0.03, 0.26, 0.04), k, { p: [0.22, 0.66, 0], r: [0, 0, -0.5] });
  b.add(box(0.2, 0.09, 0.08), w, { p: [0.38, 0.74, 0], r: [0, 0, -0.3] });
  b.add(box(0.05, 0.08, 0.085), k, { p: [0.47, 0.71, 0], r: [0, 0, -0.3] });
  return b.build();
}

function kangaroo() {
  const b = new Builder();
  const c = '#be7f4c';
  b.add(box(0.28, 0.06, 0.07), c, { p: [0.05, 0.03, 0.08] });
  b.add(box(0.28, 0.06, 0.07), c, { p: [0.05, 0.03, -0.08] });
  b.add(ball(0.2, 7, 5), c, { p: [0, 0.38, 0], s: [0.85, 1.4, 0.85], r: [0, 0, -0.3] });
  b.add(ball(0.1, 7, 5), '#e6c39b', { p: [0.1, 0.32, 0], s: [0.7, 1.4, 1] });
  b.add(ball(0.09, 7, 5), c, { p: [0.15, 0.72, 0], s: [1.4, 1, 1] });
  for (const z of [-0.04, 0.04]) b.add(cone(0.03, 0.1, 4), c, { p: [0.1, 0.83, z] });
  b.add(cyl(0.025, 0.06, 0.5, 5), c, { p: [-0.3, 0.12, 0], r: [0, 0, 1.25] });
  return b.build();
}

function koala() {
  const b = new Builder();
  const g = '#9da3a9';
  b.add(cyl(0.06, 0.08, 1.0, 6), '#d8d2c4', { p: [-0.12, 0.5, 0] }); // ユーカリの木
  b.add(gem(0.22), '#5f9e55', { p: [-0.12, 1.05, 0] });
  b.add(ball(0.17, 7, 5), g, { p: [0.02, 0.45, 0], s: [0.9, 1.2, 0.9] });
  b.add(ball(0.14, 7, 5), g, { p: [0.06, 0.7, 0] });
  for (const z of [-0.13, 0.13]) b.add(ball(0.07, 6, 4), '#c9cdd1', { p: [0.04, 0.8, z] });
  b.add(ball(0.045, 5, 4), '#2c2c34', { p: [0.2, 0.68, 0], s: [0.7, 1.2, 0.8] });
  return b.build();
}

function panda() {
  const b = new Builder();
  const w = '#f7f7f2';
  const k = '#26262c';
  b.add(ball(0.22, 8, 6), w, { p: [0, 0.25, 0], s: [1, 1.05, 1] });
  b.add(ball(0.09, 6, 4), k, { p: [0.12, 0.08, 0.12] });
  b.add(ball(0.09, 6, 4), k, { p: [0.12, 0.08, -0.12] });
  b.add(ball(0.08, 6, 4), k, { p: [0.12, 0.35, 0.18] });
  b.add(ball(0.08, 6, 4), k, { p: [0.12, 0.35, -0.18] });
  b.add(ball(0.17, 8, 6), w, { p: [0.05, 0.58, 0] });
  for (const z of [-0.12, 0.12]) {
    b.add(ball(0.06, 6, 4), k, { p: [0.02, 0.72, z] });
    b.add(ball(0.04, 5, 4), k, { p: [0.18, 0.6, z * 0.5], s: [0.6, 1.2, 1] });
  }
  for (const [x, z] of [
    [0.3, 0.15],
    [0.35, -0.05],
  ])
    b.add(cyl(0.015, 0.015, 0.8, 5), '#69b84a', { p: [x, 0.4, z] });
  return b.build();
}

function penguin() {
  const b = new Builder();
  b.add(ball(0.17, 8, 6), '#2a2d38', { p: [0, 0.3, 0], s: [0.9, 1.6, 0.9] });
  b.add(ball(0.13, 8, 6), '#fbfaf5', { p: [0.06, 0.28, 0], s: [0.8, 1.6, 0.9] });
  b.add(ball(0.11, 7, 5), '#2a2d38', { p: [0, 0.6, 0] });
  b.add(ball(0.04, 5, 4), '#ffc93c', { p: [0.06, 0.52, 0.06] });
  b.add(ball(0.04, 5, 4), '#ffc93c', { p: [0.06, 0.52, -0.06] });
  b.add(cone(0.025, 0.08, 4), '#ff9f43', { p: [0.13, 0.6, 0], r: [0, 0, -Math.PI / 2] });
  b.add(box(0.08, 0.02, 0.05), '#ff9f43', { p: [0.04, 0.01, 0.05] });
  b.add(box(0.08, 0.02, 0.05), '#ff9f43', { p: [0.04, 0.01, -0.05] });
  for (const z of [-0.15, 0.15]) b.add(box(0.06, 0.22, 0.02), '#2a2d38', { p: [0, 0.32, z], r: [z > 0 ? 0.3 : -0.3, 0, 0] });
  return b.build();
}

function bear(color: string, snout: string) {
  const b = new Builder();
  legs(b, color, [-0.17, 0.17], [-0.1, 0.1], 0.22, 0.06);
  b.add(ball(0.24, 8, 6), color, { p: [0, 0.38, 0], s: [1.35, 0.9, 0.85] });
  b.add(ball(0.14, 7, 5), color, { p: [0.36, 0.42, 0] });
  b.add(ball(0.06, 6, 4), snout, { p: [0.48, 0.39, 0], s: [1.3, 0.9, 1] });
  b.add(ball(0.02, 4, 3), '#26262c', { p: [0.55, 0.4, 0] });
  for (const z of [-0.08, 0.08]) b.add(ball(0.04, 5, 4), color, { p: [0.33, 0.55, z] });
  return b.build();
}

function camel() {
  const b = new Builder();
  const c = '#cfa56c';
  legs(b, c, [-0.15, 0.15], [-0.07, 0.07], 0.45, 0.025);
  b.add(ball(0.19, 7, 5), c, { p: [0, 0.52, 0], s: [1.35, 0.75, 0.75] });
  b.add(ball(0.11, 6, 4), c, { p: [-0.07, 0.68, 0] });
  b.add(ball(0.1, 6, 4), c, { p: [0.12, 0.66, 0] });
  b.add(cyl(0.035, 0.05, 0.3, 5), c, { p: [0.3, 0.6, 0], r: [0, 0, 1.0] });
  b.add(cyl(0.035, 0.035, 0.18, 5), c, { p: [0.42, 0.75, 0], r: [0, 0, -0.3] });
  b.add(box(0.14, 0.07, 0.07), c, { p: [0.48, 0.84, 0] });
  return b.build();
}

function tiger() {
  const b = new Builder();
  const o = '#ea8a32';
  const k = '#2a2a2f';
  legs(b, o, [-0.18, 0.18], [-0.08, 0.08], 0.26, 0.035);
  b.add(ball(0.19, 7, 5), o, { p: [0, 0.36, 0], s: [1.6, 0.8, 0.8] });
  for (const x of [-0.2, -0.08, 0.04, 0.16]) b.add(box(0.03, 0.31, 0.31), k, { p: [x, 0.36, 0] });
  b.add(ball(0.12, 7, 5), o, { p: [0.36, 0.44, 0] });
  b.add(ball(0.06, 6, 4), '#fbfaf5', { p: [0.45, 0.41, 0] });
  for (const z of [-0.08, 0.08]) b.add(cone(0.035, 0.06, 4), o, { p: [0.33, 0.56, z] });
  b.add(cyl(0.015, 0.015, 0.35, 4), o, { p: [-0.42, 0.42, 0], r: [0, 0, 0.8] });
  return b.build();
}

function llama() {
  const b = new Builder();
  const c = '#f1e6d2';
  legs(b, c, [-0.13, 0.13], [-0.06, 0.06], 0.32, 0.025);
  b.add(gem(0.18), c, { p: [0, 0.42, 0], s: [1.35, 0.85, 0.8] });
  b.add(cyl(0.045, 0.055, 0.38, 6), c, { p: [0.18, 0.66, 0] });
  b.add(box(0.15, 0.08, 0.08), c, { p: [0.23, 0.87, 0] });
  for (const z of [-0.03, 0.03]) b.add(cone(0.015, 0.08, 4), c, { p: [0.16, 0.95, z] });
  b.add(box(0.2, 0.04, 0.28), '#e0412b', { p: [0, 0.55, 0] }); // カラフルな布
  return b.build();
}

function toucan() {
  const b = new Builder();
  b.add(cyl(0.02, 0.02, 0.5, 5), '#7a5233', { p: [0, 0.25, 0] });
  b.add(box(0.4, 0.03, 0.03), '#7a5233', { p: [0, 0.5, 0] });
  b.add(ball(0.11, 7, 5), '#22242c', { p: [0, 0.65, 0], s: [1, 1.4, 0.9] });
  b.add(ball(0.07, 6, 4), '#fff4c2', { p: [0.06, 0.72, 0] });
  b.add(cone(0.05, 0.22, 6), '#ff8f1f', { p: [0.2, 0.75, 0], r: [0, 0, -Math.PI / 2] });
  b.add(cone(0.02, 0.05, 4), '#22242c', { p: [-0.1, 0.48, 0], r: [0, 0, 2.6] });
  return b.build();
}

function whale() {
  const b = new Builder();
  const c = '#4f73a8';
  b.add(ball(0.3, 9, 6), c, { p: [0, 0.08, 0], s: [1.7, 0.6, 0.8] });
  b.add(ball(0.22, 8, 5), '#d9e3ef', { p: [0.08, 0.0, 0], s: [1.6, 0.4, 0.8] });
  b.add(cone(0.08, 0.3, 4), c, { p: [-0.55, 0.12, 0], r: [0, 0, Math.PI / 2] });
  b.add(box(0.12, 0.02, 0.32), c, { p: [-0.7, 0.18, 0], r: [0, 0, 0.4] });
  b.add(cone(0.05, 0.25, 6), '#dff4ff', { p: [0.2, 0.42, 0] });
  b.add(gem(0.06), '#dff4ff', { p: [0.2, 0.55, 0.05] });
  b.add(gem(0.05), '#dff4ff', { p: [0.2, 0.55, -0.06] });
  return b.build();
}

function gorilla() {
  const b = new Builder();
  const k = '#3a3a42';
  b.add(ball(0.22, 7, 5), k, { p: [0, 0.38, 0], s: [1.1, 1.1, 1] });
  b.add(ball(0.12, 6, 4), k, { p: [0.12, 0.66, 0] });
  b.add(ball(0.07, 6, 4), '#6b6670', { p: [0.21, 0.63, 0] });
  for (const z of [-0.2, 0.2]) {
    b.add(cyl(0.05, 0.06, 0.4, 5), k, { p: [0.15, 0.25, z], r: [z > 0 ? -0.2 : 0.2, 0, 0.3] });
    b.add(cyl(0.05, 0.06, 0.2, 5), k, { p: [-0.08, 0.1, z * 0.6] });
  }
  b.add(ball(0.12, 6, 4), '#5c5862', { p: [0.15, 0.4, 0], s: [0.5, 1, 1] });
  return b.build();
}

function sheep() {
  const b = new Builder();
  const w = '#fbfaf5';
  legs(b, '#2a2a2f', [-0.1, 0.1], [-0.06, 0.06], 0.18, 0.02);
  for (const [x, y, z] of [
    [0, 0.3, 0],
    [0.1, 0.32, 0.06],
    [-0.1, 0.31, -0.05],
    [0.02, 0.38, -0.06],
    [-0.06, 0.37, 0.07],
  ])
    b.add(gem(0.13), w, { p: [x, y, z] });
  b.add(box(0.14, 0.11, 0.1), '#2a2a2f', { p: [0.22, 0.34, 0] });
  return b.build();
}

function flamingo() {
  const b = new Builder();
  const p = '#f58fb3';
  b.add(cyl(0.008, 0.008, 0.45, 4), p, { p: [0, 0.225, 0] });
  b.add(ball(0.12, 7, 5), p, { p: [0, 0.5, 0], s: [1.5, 0.8, 0.8] });
  b.add(cyl(0.02, 0.02, 0.3, 5), p, { p: [0.12, 0.68, 0], r: [0, 0, -0.35] });
  b.add(ball(0.045, 5, 4), p, { p: [0.18, 0.83, 0] });
  b.add(cone(0.02, 0.08, 4), '#2a2a2f', { p: [0.21, 0.79, 0], r: [0, 0, 2.6] });
  b.add(cyl(0.18, 0.18, 0.02, 10), '#4fb3e8', { p: [0, 0.01, 0] });
  return b.build();
}

function tortoise() {
  const b = new Builder();
  b.add(ball(0.25, 8, 4), '#5c6b3c', { p: [0, 0.1, 0], s: [1.2, 0.85, 1] });
  b.add(gem(0.09), '#76874c', { p: [0, 0.3, 0] });
  b.add(ball(0.07, 6, 4), '#8f8a78', { p: [0.32, 0.15, 0] });
  for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) b.add(cyl(0.04, 0.04, 0.1, 5), '#8f8a78', { p: [x, 0.05, z] });
  return b.build();
}

function bison() {
  const b = new Builder();
  const c = '#5a3a24';
  legs(b, '#3e2818', [-0.15, 0.15], [-0.08, 0.08], 0.22, 0.04);
  b.add(ball(0.18, 7, 5), c, { p: [-0.05, 0.36, 0], s: [1.4, 0.9, 0.85] });
  b.add(gem(0.2), '#6e4a2e', { p: [0.13, 0.45, 0] });
  b.add(ball(0.1, 6, 4), '#3e2818', { p: [0.3, 0.33, 0] });
  for (const z of [-0.09, 0.09]) b.add(cone(0.015, 0.06, 4), '#e8e1d4', { p: [0.3, 0.43, z] });
  return b.build();
}

// =====================================================================
// 景色（木・サボテンなど）
// =====================================================================

function roundTree() {
  const b = new Builder();
  b.add(cyl(0.05, 0.07, 0.35, 5), '#8a5a3c', { p: [0, 0.175, 0] });
  b.add(gem(0.3), '#4fae4a', { p: [0, 0.55, 0] });
  b.add(gem(0.2), '#62c45a', { p: [0.1, 0.72, 0.05] });
  return b.build();
}

function conifer() {
  const b = new Builder();
  b.add(cyl(0.04, 0.05, 0.2, 5), '#7a4e2d', { p: [0, 0.1, 0] });
  b.add(cone(0.28, 0.45, 6), '#2f8a4f', { p: [0, 0.4, 0] });
  b.add(cone(0.2, 0.38, 6), '#3a9c5c', { p: [0, 0.68, 0] });
  return b.build();
}

function palm() {
  const b = new Builder();
  b.add(cyl(0.035, 0.05, 0.7, 5), '#a47a4c', { p: [0.05, 0.35, 0], r: [0, 0, -0.15] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add(box(0.4, 0.02, 0.1), '#3fae4f', { p: [0.1 + Math.cos(a) * 0.17, 0.66, Math.sin(a) * 0.17], r: [0, -a, -0.45] });
  }
  return b.build();
}

function cactus() {
  const b = new Builder();
  const g = '#4f9e57';
  b.add(cyl(0.07, 0.08, 0.65, 6), g, { p: [0, 0.325, 0] });
  b.add(cyl(0.045, 0.045, 0.2, 6), g, { p: [0.14, 0.3, 0], r: [0, 0, Math.PI / 2] });
  b.add(cyl(0.045, 0.045, 0.22, 6), g, { p: [0.22, 0.42, 0] });
  b.add(cyl(0.04, 0.04, 0.16, 6), g, { p: [-0.12, 0.42, 0], r: [0, 0, Math.PI / 2] });
  b.add(cyl(0.04, 0.04, 0.18, 6), g, { p: [-0.19, 0.52, 0] });
  return b.build();
}

function baobab() {
  const b = new Builder();
  b.add(cyl(0.12, 0.18, 0.75, 7), '#a8836a', { p: [0, 0.375, 0] });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add(gem(0.12), '#5aa748', { p: [Math.cos(a) * 0.2, 0.8, Math.sin(a) * 0.2] });
  }
  return b.build();
}

function iceberg() {
  const b = new Builder();
  b.add(cyl(0.2, 0.35, 0.4, 5), '#eef7ff', { p: [0, 0.2, 0] });
  b.add(cone(0.18, 0.3, 5), '#ffffff', { p: [0.08, 0.5, 0] });
  b.add(cyl(0.3, 0.38, 0.04, 6), '#b8e2f8', { p: [0, 0.02, 0] });
  return b.build();
}

/** モデルの一覧。キーの名前で data/features.ts から呼び出します */
export const MODEL_FACTORIES = {
  eiffel: () => latticeTower('#8b5e3c', '#7a5133', '#6b462c'),
  tokyoTower: () => latticeTower('#e8452e', '#fbfaf5', '#e8452e'),
  pyramids,
  stepPyramid,
  fuji,
  snowPeaks: () => snowMountain('#7d8a99', 3),
  snowPeak: () => snowMountain('#8a7f72', 1),
  kilimanjaro: () => snowMountain('#6f8f4f', 1),
  volcano,
  pagoda,
  torii,
  greatWall,
  tajMahal,
  mosque,
  colosseum,
  leaningTower,
  bigBen,
  statueOfLiberty,
  goldenGate,
  operaHouse,
  christRedeemer,
  moai,
  stonehenge,
  windmill,
  onionDomes,
  castle,
  skyscraper,
  twinTowers,
  tvTower,
  machuPicchu,
  angkor,
  sagrada,
  parthenon,
  uluru,
  stupa,
  yurt,
  giraffe,
  elephant,
  lion,
  zebra,
  kangaroo,
  koala,
  panda,
  penguin,
  polarBear: () => bear('#f3f0e6', '#e3ddd0'),
  brownBear: () => bear('#7a4e2d', '#a8784f'),
  camel,
  tiger,
  llama,
  toucan,
  whale,
  gorilla,
  sheep,
  flamingo,
  tortoise,
  bison,
  roundTree,
  conifer,
  palm,
  cactus,
  baobab,
  iceberg,
} satisfies Record<string, () => THREE.BufferGeometry>;

export type ModelKind = keyof typeof MODEL_FACTORIES;
