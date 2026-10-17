import * as THREE from 'three';
import { Builder, box, cyl, cone, ball, gem, type V3 } from './modelKit';

/**
 * 動物のローポリ3Dモデル。
 * どの動物も「+X 方向が前・地面が y=0・大人の背の高さが だいたい 0.6〜1」の大きさで作ります。
 *
 * 見た目を良くするための約束ごと：
 *  - 目はかならず入れる（黒目 ＋ 小さな白いハイライト）→ 生きている感じが出る
 *  - おなかは少し明るい色にする（2トーン）→ 立体感が出る
 *  - 本物の特徴を1つ以上入れる（キリンのもよう、ゾウの耳と鼻、トナカイの角 など）
 */

const EYE = '#1d1b26';
const WHITE = '#ffffff';
const NOSE = '#2a2530';

/** 球を少しなめらかにしたもの（体・頭用） */
const blob = () => ball(1, 10, 7);

function eyes(b: Builder, x: number, y: number, z: number, r: number) {
  for (const s of [-1, 1]) {
    b.add(ball(r, 7, 5), EYE, { p: [x, y, s * z] });
    b.add(ball(r * 0.38, 4, 3), WHITE, { p: [x + r * 0.5, y + r * 0.45, s * (z + r * 0.45)] });
  }
}

/** 2つの点を円柱でつなぐ（角・しっぽ・枝などを、ねらった向きにぴったり曲げるため） */
function seg(b: Builder, from: V3, to: V3, r0: number, r1: number, color: string, sides = 5) {
  const a = new THREE.Vector3(...from);
  const d = new THREE.Vector3(...to).sub(a);
  const len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  const mid = a.addScaledVector(d, 0.5);
  b.add(cyl(r1, r0, len, sides), color, { p: [mid.x, mid.y, mid.z], r: [e.x, e.y, e.z] });
}

/** 点をつないだ折れ線（角やしっぽのカーブ）。太さは r0 から r1 へだんだん細く */
function curve(b: Builder, pts: V3[], r0: number, r1: number, color: string, sides = 5) {
  for (let i = 0; i < pts.length - 1; i++) {
    const t0 = i / (pts.length - 1);
    const t1 = (i + 1) / (pts.length - 1);
    seg(b, pts[i], pts[i + 1], r0 + (r1 - r0) * t0, r0 + (r1 - r0) * t1, color, sides);
    if (i > 0) b.add(ball(r0 + (r1 - r0) * t0, sides, 4), color, { p: pts[i] });
  }
}

// =====================================================================
// 4本足の動物をつくる共通の部品
// =====================================================================

interface QuadSpec {
  body: string;
  belly?: string;
  leg?: string;
  hoof?: string;
  len: number;
  h: number;
  w: number;
  legH: number;
  legR?: number;
  neck?: { len: number; tilt: number; r: number; color?: string };
  head: { l: number; h: number; w: number; color?: string; tilt?: number };
  /** 頭の位置を直接きめる（首を自分で描く動物用） */
  headAt?: [number, number];
  snout?: { len: number; h?: number; color?: string };
  nose?: string | null;
  eye?: number;
  ears?: { type: 'point' | 'round' | 'long' | 'droop'; size: number; color?: string; inner?: string };
  tail?: { type: 'thin' | 'bushy' | 'tuft' | 'short'; len: number; color?: string; tip?: string; angle?: number; r?: number };
}

interface QuadAnchors {
  bodyY: number;
  hx: number;
  hy: number;
}

function quad(b: Builder, q: QuadSpec): QuadAnchors {
  const { len, h, w, legH } = q;
  const legR = q.legR ?? Math.min(len, w) * 0.09;
  const bodyY = legH + h * 0.42;

  // 体とおなか
  b.add(blob(), q.body, { p: [0, bodyY, 0], s: [len / 2, h / 2, w / 2] });
  if (q.belly) b.add(blob(), q.belly, { p: [0.02, bodyY - h * 0.16, 0], s: [len * 0.4, h * 0.34, w * 0.45] });

  // 足（ひづめ付き）
  const legLen = bodyY;
  for (const x of [len * 0.3, -len * 0.3])
    for (const z of [w * 0.27, -w * 0.27]) {
      b.add(cyl(legR, legR * 0.8, legLen, 6), q.leg ?? q.body, { p: [x, legLen / 2, z] });
      if (q.hoof) b.add(cyl(legR * 0.95, legR * 1.05, legLen * 0.1, 6), q.hoof, { p: [x, legLen * 0.05, z] });
    }

  // 首と頭
  let hx: number;
  let hy: number;
  if (q.neck) {
    const bx = len * 0.36;
    const by = bodyY + h * 0.15;
    const dx = Math.sin(q.neck.tilt);
    const dy = Math.cos(q.neck.tilt);
    b.add(cyl(q.neck.r * 0.8, q.neck.r, q.neck.len, 7), q.neck.color ?? q.body, {
      p: [bx + (dx * q.neck.len) / 2, by + (dy * q.neck.len) / 2, 0],
      r: [0, 0, -q.neck.tilt],
    });
    hx = bx + dx * q.neck.len + q.head.l * 0.22;
    hy = by + dy * q.neck.len;
  } else if (q.headAt) {
    [hx, hy] = q.headAt;
  } else {
    hx = len * 0.5 + q.head.l * 0.28;
    hy = bodyY + h * 0.22;
  }
  const hc = q.head.color ?? q.body;
  b.add(blob(), hc, { p: [hx, hy, 0], s: [q.head.l / 2, q.head.h / 2, q.head.w / 2], r: [0, 0, q.head.tilt ?? 0] });

  // 鼻先と鼻
  let noseX = hx + q.head.l * 0.48;
  let noseY = hy - q.head.h * 0.05;
  if (q.snout) {
    const sh = q.snout.h ?? q.head.h * 0.55;
    const sx = hx + q.head.l * 0.38 + q.snout.len * 0.32;
    const sy = hy - q.head.h * 0.16;
    b.add(blob(), q.snout.color ?? hc, { p: [sx, sy, 0], s: [q.snout.len / 2 + q.head.l * 0.1, sh / 2, q.head.w * 0.32] });
    noseX = sx + q.snout.len / 2 + q.head.l * 0.08;
    noseY = sy + sh * 0.12;
  }
  if (q.nose !== null) b.add(ball(q.head.w * 0.09, 5, 4), q.nose ?? NOSE, { p: [noseX, noseY, 0], s: [0.8, 0.8, 1.2] });

  // 目
  eyes(b, hx + q.head.l * 0.2, hy + q.head.h * 0.14, q.head.w * 0.36, q.eye ?? q.head.h * 0.1);

  // 耳
  if (q.ears) {
    const e = q.ears;
    const c = e.color ?? hc;
    for (const s of [-1, 1]) {
      const ex = hx - q.head.l * 0.12;
      const ez = s * q.head.w * 0.3;
      if (e.type === 'point') {
        b.add(cone(e.size * 0.45, e.size, 5), c, { p: [ex, hy + q.head.h * 0.42 + e.size * 0.4, ez], r: [s * 0.3, 0, 0] });
        if (e.inner) b.add(cone(e.size * 0.25, e.size * 0.6, 4), e.inner, { p: [ex + e.size * 0.12, hy + q.head.h * 0.42 + e.size * 0.35, ez], r: [s * 0.3, 0, 0] });
      } else if (e.type === 'round') {
        b.add(ball(e.size * 0.5, 7, 5), c, { p: [ex, hy + q.head.h * 0.42, ez * 1.25], s: [0.45, 1, 1] });
        if (e.inner) b.add(ball(e.size * 0.3, 6, 4), e.inner, { p: [ex + e.size * 0.15, hy + q.head.h * 0.42, ez * 1.25], s: [0.4, 1, 1] });
      } else if (e.type === 'long') {
        b.add(cone(e.size * 0.22, e.size * 1.4, 5), c, { p: [ex - e.size * 0.2, hy + q.head.h * 0.45 + e.size * 0.55, ez], r: [s * 0.2, 0, 0.35] });
      } else {
        b.add(ball(e.size * 0.5, 6, 4), c, { p: [ex, hy + q.head.h * 0.05, s * (q.head.w * 0.5 + e.size * 0.12)], s: [0.6, 1.3, 0.35] });
      }
    }
  }

  // しっぽ
  if (q.tail) {
    const t = q.tail;
    const a = t.angle ?? 1.0;
    const bx = -len * 0.48;
    const by = bodyY + h * 0.12;
    const dx = -Math.cos(a);
    const dy = -Math.sin(a);
    const c = t.color ?? q.body;
    if (t.type === 'thin' || t.type === 'tuft') {
      const r = t.r ?? len * 0.022;
      b.add(cyl(r * 0.7, r, t.len, 5), c, { p: [bx + (dx * t.len) / 2, by + (dy * t.len) / 2, 0], r: [0, 0, Math.PI / 2 + a] });
      if (t.type === 'tuft' || t.tip) b.add(gem(r * 2.6), t.tip ?? c, { p: [bx + dx * t.len, by + dy * t.len, 0] });
    } else if (t.type === 'bushy') {
      b.add(blob(), c, { p: [bx + (dx * t.len) / 2, by + (dy * t.len) / 2, 0], s: [t.len * 0.55, t.len * 0.2, t.len * 0.2], r: [0, 0, -a + Math.PI] });
      if (t.tip) b.add(ball(t.len * 0.15, 6, 4), t.tip, { p: [bx + dx * t.len * 0.95, by + dy * t.len * 0.95, 0] });
    } else {
      b.add(ball(t.len * 0.5, 6, 4), c, { p: [bx, by, 0] });
    }
  }

  return { bodyY, hx, hy };
}

function horns(b: Builder, hx: number, hy: number, hw: number, color: string, len: number, back: number, spread = 0.25) {
  for (const s of [-1, 1]) {
    b.add(cone(len * 0.09, len, 5), color, { p: [hx - len * 0.35 * Math.sin(back), hy + len * 0.5 * Math.cos(back), s * hw * 0.25], r: [s * spread, 0, back] });
  }
}

/** 体のまわりにぐるっと巻いたしま模様（体のふくらみに合わせて太さを変える） */
function stripes(b: Builder, color: string, xs: number[], bodyY: number, len: number, h: number, w: number, thick = 0.03) {
  for (const x of xs) {
    const k = Math.sqrt(Math.max(0, 1 - (2 * x / len) ** 2));
    b.add(ball(1, 10, 6), color, { p: [x, bodyY, 0], s: [thick, (h / 2) * k * 1.04 + 0.002, (w / 2) * k * 1.04 + 0.002] });
  }
}

/**
 * 体（だ円の球）の表面にぴったり乗るもよう。
 * pts は [前後の位置 x, 体の中心からの高さ dy, 右(1)か左(-1)か]
 */
function bodySpots(b: Builder, color: string, a: { bodyY: number }, len: number, h: number, w: number, pts: [number, number, number][], r: number) {
  for (const [x, dy, side] of pts) {
    const k = 1 - (x / (len / 2)) ** 2 - (dy / (h / 2)) ** 2;
    if (k <= 0) continue;
    const z = (w / 2) * Math.sqrt(k) * side;
    // 表面の向き（法線）にあわせて平たく置く
    const n = new THREE.Vector3(x / (len / 2) ** 2, dy / (h / 2) ** 2, z / (w / 2) ** 2).normalize();
    const e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n));
    b.add(ball(r, 6, 4), color, { p: [x + n.x * 0.002, a.bodyY + dy + n.y * 0.002, z + n.z * 0.002], r: [e.x, e.y, e.z], s: [1, 0.85, 0.25] });
  }
}

function spots(b: Builder, color: string, pts: [number, number, number][], r: number) {
  for (const [x, y, z] of pts) b.add(gem(r), color, { p: [x, y, z], s: [1, 0.85, 0.35] });
}

// =====================================================================
// 鳥をつくる共通の部品
// =====================================================================

interface BirdSpec {
  body: string;
  belly?: string;
  head?: string;
  wing?: string;
  beak: string;
  beakLen: number;
  leg?: string;
  legH: number;
  bl: number; // 体の長さ
  bh: number;
  bw: number;
  headR: number;
  neck?: { len: number; tilt: number; r: number; color?: string };
  upright?: number; // 体の傾き（ペンギンのように立つ）
  tail?: { color: string; len: number; up?: number };
}

function bird(b: Builder, s: BirdSpec) {
  const bodyY = s.legH + s.bh * 0.45;
  const up = s.upright ?? 0.15;
  b.add(blob(), s.body, { p: [0, bodyY, 0], s: [s.bl / 2, s.bh / 2, s.bw / 2], r: [0, 0, up] });
  if (s.belly) b.add(blob(), s.belly, { p: [s.bl * 0.08, bodyY - s.bh * 0.08, 0], s: [s.bl * 0.38, s.bh * 0.4, s.bw * 0.44], r: [0, 0, up] });
  if (s.wing)
    for (const z of [-1, 1]) b.add(blob(), s.wing, { p: [-s.bl * 0.05, bodyY + s.bh * 0.05, z * s.bw * 0.42], s: [s.bl * 0.4, s.bh * 0.32, s.bw * 0.12], r: [0, 0, up + 0.1] });
  if (s.tail) b.add(box(s.tail.len, 0.02, s.bw * 0.5), s.tail.color, { p: [-s.bl * 0.5 - s.tail.len * 0.35, bodyY + s.bh * 0.05, 0], r: [0, 0, s.tail.up ?? 0.3] });

  let hx = s.bl * 0.45 * Math.cos(up) + s.headR * 0.3;
  let hy = bodyY + s.bh * 0.35 + s.bl * 0.45 * Math.sin(up);
  if (s.neck) {
    const bx = s.bl * 0.35;
    const by = bodyY + s.bh * 0.2;
    const dx = Math.sin(s.neck.tilt);
    const dy = Math.cos(s.neck.tilt);
    b.add(cyl(s.neck.r * 0.8, s.neck.r, s.neck.len, 6), s.neck.color ?? s.body, { p: [bx + (dx * s.neck.len) / 2, by + (dy * s.neck.len) / 2, 0], r: [0, 0, -s.neck.tilt] });
    hx = bx + dx * s.neck.len;
    hy = by + dy * s.neck.len;
  }
  b.add(ball(s.headR, 8, 6), s.head ?? s.body, { p: [hx, hy, 0] });
  b.add(cone(s.headR * 0.38, s.beakLen, 6), s.beak, { p: [hx + s.headR * 0.8 + s.beakLen * 0.4, hy - s.headR * 0.1, 0], r: [0, 0, -Math.PI / 2] });
  eyes(b, hx + s.headR * 0.45, hy + s.headR * 0.25, s.headR * 0.62, s.headR * 0.2);
  // 足
  const leg = s.leg ?? '#e8a33c';
  for (const z of [-1, 1]) {
    b.add(cyl(s.bw * 0.05, s.bw * 0.05, s.legH + s.bh * 0.2, 4), leg, { p: [0, (s.legH + s.bh * 0.2) / 2, z * s.bw * 0.2] });
    b.add(box(s.bw * 0.35, 0.02, s.bw * 0.2), leg, { p: [s.bw * 0.12, 0.01, z * s.bw * 0.2] });
  }
  return { hx, hy, bodyY };
}

// =====================================================================
// アフリカ
// =====================================================================

function giraffe() {
  const b = new Builder();
  const y = '#f0b84f';
  const brown = '#8a5527';
  const a = quad(b, {
    body: y, belly: '#f7d79a', hoof: '#4a3a30', len: 0.42, h: 0.26, w: 0.2, legH: 0.42, legR: 0.024,
    neck: { len: 0.5, tilt: 0.42, r: 0.045 },
    head: { l: 0.17, h: 0.09, w: 0.08, tilt: -0.2 }, snout: { len: 0.05, color: '#e9c48a' },
    ears: { type: 'point', size: 0.05 }, tail: { type: 'tuft', len: 0.2, tip: '#3e2a1c', angle: 1.25 },
  });
  // 角（オシコーン）
  for (const z of [-0.02, 0.02]) {
    b.add(cyl(0.008, 0.01, 0.07, 5), brown, { p: [a.hx - 0.03, a.hy + 0.07, z] });
    b.add(ball(0.014, 5, 4), '#3e2a1c', { p: [a.hx - 0.03, a.hy + 0.105, z] });
  }
  // あみ目のようなもよう
  const pts: [number, number, number][] = [];
  for (const x of [-0.15, -0.07, 0.01, 0.09, 0.16]) for (const dy of [-0.04, 0.03, 0.09]) for (const side of [1, -1]) pts.push([x + (dy > 0 ? 0.03 : 0), dy, side]);
  bodySpots(b, brown, a, 0.42, 0.26, 0.2, pts, 0.026);
  for (const [x, y] of [[0.25, 0.8], [0.29, 0.9], [0.33, 1.0]]) for (const z of [-1, 1]) b.add(ball(0.018, 5, 4), brown, { p: [x, y, z * 0.037], s: [1, 1, 0.3] });
  // たてがみ
  b.add(box(0.025, 0.42, 0.012), '#a8652e', { p: [0.24, 0.84, 0], r: [0, 0, -0.42] });
  return b.build();
}

function elephant(size = 1, tusks = true) {
  const b = new Builder();
  const g = '#9aa3ae';
  const a = quad(b, {
    body: g, belly: '#aab2bc', leg: '#939ca7', hoof: '#d9d4c8', len: 0.62 * size, h: 0.42 * size, w: 0.4 * size, legH: 0.2 * size, legR: 0.065 * size,
    head: { l: 0.28 * size, h: 0.28 * size, w: 0.26 * size }, nose: null, eye: 0.018 * size,
    tail: { type: 'tuft', len: 0.2 * size, tip: '#4a4f58', angle: 1.35 },
  });
  // 大きな耳（アフリカゾウはアフリカ大陸の形のような大きな耳）
  for (const s of [-1, 1]) {
    b.add(blob(), '#a7b0ba', { p: [a.hx - 0.08 * size, a.hy - 0.02 * size, s * 0.17 * size], s: [0.03 * size, 0.15 * size, 0.13 * size], r: [s * 0.3, s * 0.4, 0] });
    b.add(blob(), '#d8b4b4', { p: [a.hx - 0.07 * size, a.hy - 0.02 * size, s * 0.16 * size], s: [0.02 * size, 0.11 * size, 0.09 * size], r: [s * 0.3, s * 0.4, 0] });
  }
  // 長い鼻（3つに分けて、くるんと曲げる）
  const segs: [number, number, number, number][] = [
    [0.15, -0.08, 0.055, 0.25],
    [0.2, -0.2, 0.045, 0.05],
    [0.23, -0.3, 0.035, -0.4],
  ];
  for (const [dx, dy, r, rot] of segs) b.add(cyl(r * 0.85 * size, r * size, 0.14 * size, 7), g, { p: [a.hx + dx * size, a.hy + dy * size, 0], r: [0, 0, rot] });
  if (tusks) for (const s of [-1, 1]) b.add(cone(0.018 * size, 0.16 * size, 6), '#fffaf0', { p: [a.hx + 0.16 * size, a.hy - 0.12 * size, s * 0.06 * size], r: [0, 0, -2.2] });
  return b.build();
}

function lion() {
  const b = new Builder();
  const c = '#e0a752';
  const a = quad(b, {
    body: c, belly: '#f0c98a', len: 0.5, h: 0.24, w: 0.22, legH: 0.18, legR: 0.035,
    head: { l: 0.15, h: 0.15, w: 0.15 }, snout: { len: 0.06, color: '#f3d7a6' }, nose: '#6b3b2a',
    ears: { type: 'round', size: 0.05 }, tail: { type: 'tuft', len: 0.3, tip: '#7a4320', angle: 0.6 },
  });
  // たてがみ（オス）
  for (let i = 0; i < 10; i++) {
    const t = (i / 10) * Math.PI * 2;
    b.add(gem(0.07), i % 2 ? '#9a5a22' : '#b06a2a', { p: [a.hx - 0.04, a.hy + Math.sin(t) * 0.1, Math.cos(t) * 0.1] });
  }
  b.add(gem(0.09), '#9a5a22', { p: [a.hx - 0.08, a.hy, 0] });
  return b.build();
}

function zebra() {
  const b = new Builder();
  const w = '#fbfbf7';
  const k = '#23232b';
  const a = quad(b, {
    body: w, len: 0.46, h: 0.25, w: 0.2, legH: 0.26, legR: 0.025, hoof: k,
    neck: { len: 0.2, tilt: 0.75, r: 0.05 },
    head: { l: 0.2, h: 0.09, w: 0.085, tilt: -0.55 }, snout: { len: 0.05, color: '#3a3a42' }, nose: null,
    ears: { type: 'point', size: 0.055 }, tail: { type: 'tuft', len: 0.22, tip: k, angle: 1.3 },
  });
  stripes(b, k, [-0.16, -0.1, -0.04, 0.02, 0.08, 0.14], a.bodyY, 0.46, 0.25, 0.2, 0.014);
  for (const [x, y] of [[0.3, 0.46], [0.36, 0.52]]) b.add(box(0.02, 0.1, 0.105), k, { p: [x, y, 0], r: [0, 0, -0.75] });
  // 足のしま
  for (const x of [0.138, -0.138]) for (const z of [0.054, -0.054]) for (const y of [0.1, 0.17]) b.add(cyl(0.027, 0.027, 0.02, 6), k, { p: [x, y, z] });
  // たてがみ
  b.add(box(0.03, 0.22, 0.02), k, { p: [0.32, 0.5, 0], r: [0, 0, -0.75] });
  return b.build();
}

function rhino() {
  const b = new Builder();
  const g = '#8e8a86';
  const a = quad(b, {
    body: g, belly: '#a39f9a', len: 0.62, h: 0.32, w: 0.32, legH: 0.14, legR: 0.055, hoof: '#5d5955',
    head: { l: 0.26, h: 0.15, w: 0.15, tilt: -0.35 }, nose: null,
    ears: { type: 'point', size: 0.06 }, tail: { type: 'tuft', len: 0.12, tip: '#4f4b48', angle: 1.4 },
  });
  b.add(cone(0.035, 0.16, 6), '#d6cfbf', { p: [a.hx + 0.12, a.hy + 0.02, 0], r: [0, 0, -0.35] });
  b.add(cone(0.025, 0.08, 6), '#d6cfbf', { p: [a.hx + 0.04, a.hy + 0.07, 0], r: [0, 0, -0.2] });
  return b.build();
}

function wildebeest() {
  const b = new Builder();
  const c = '#6e6863';
  const a = quad(b, {
    body: c, belly: '#7f7974', len: 0.44, h: 0.24, w: 0.2, legH: 0.24, legR: 0.024, hoof: '#2e2b29',
    neck: { len: 0.14, tilt: 0.85, r: 0.06 },
    head: { l: 0.2, h: 0.09, w: 0.09, tilt: -0.7 }, snout: { len: 0.05, color: '#3a3532' }, nose: null,
    tail: { type: 'tuft', len: 0.2, tip: '#2e2b29', angle: 1.2 },
  });
  for (const s of [-1, 1]) b.add(cone(0.015, 0.1, 5), '#d9d0bd', { p: [a.hx - 0.06, a.hy + 0.06, s * 0.06], r: [s * 1.1, 0, -0.3] });
  b.add(box(0.04, 0.16, 0.02), '#2e2b29', { p: [0.26, 0.46, 0], r: [0, 0, -0.85] }); // たてがみ
  b.add(box(0.03, 0.08, 0.04), '#2e2b29', { p: [a.hx - 0.02, a.hy - 0.09, 0] }); // あごひげ
  return b.build();
}

function springbok() {
  const b = new Builder();
  const a = quad(b, {
    body: '#c98a4b', belly: '#fbf7ee', hoof: '#3a2a20', len: 0.38, h: 0.2, w: 0.16, legH: 0.26, legR: 0.018,
    neck: { len: 0.14, tilt: 0.45, r: 0.035 },
    head: { l: 0.14, h: 0.07, w: 0.07, color: '#f4efe4', tilt: -0.3 }, snout: { len: 0.03 },
    ears: { type: 'long', size: 0.06, color: '#c98a4b' }, tail: { type: 'thin', len: 0.1, tip: '#2a2420', angle: 1.2 },
  });
  b.add(box(0.3, 0.03, 0.165), '#5a3a26', { p: [0, 0.4, 0] }); // わき腹の茶色い線
  for (const s of [-1, 1]) {
    b.add(cyl(0.008, 0.012, 0.12, 5), '#2a2420', { p: [a.hx - 0.03, a.hy + 0.08, s * 0.02], r: [s * 0.25, 0, 0.35] });
  }
  return b.build();
}

function okapi() {
  const b = new Builder();
  const c = '#5b3326';
  const a = quad(b, {
    body: c, len: 0.44, h: 0.24, w: 0.2, legH: 0.32, legR: 0.025, leg: '#f4efe4', hoof: '#2a2420',
    neck: { len: 0.18, tilt: 0.55, r: 0.05 },
    head: { l: 0.18, h: 0.09, w: 0.085, color: '#e9dccb', tilt: -0.35 }, snout: { len: 0.04, color: '#3a2a22' }, nose: null,
    ears: { type: 'point', size: 0.07, color: c }, tail: { type: 'thin', len: 0.18, tip: '#2a2420', angle: 1.3 },
  });
  // 足の白黒しま（シマウマのよう）
  for (const x of [0.132, -0.132]) for (const z of [0.054, -0.054]) for (const y of [0.1, 0.17, 0.24, 0.31]) b.add(cyl(0.027, 0.027, 0.02, 6), '#2a2420', { p: [x, y, z] });
  void a;
  return b.build();
}

function gorilla() {
  const b = new Builder();
  const k = '#34343c';
  const face = '#5a5560';
  b.add(blob(), k, { p: [0, 0.34, 0], s: [0.2, 0.22, 0.2] });
  b.add(blob(), '#3e3e47', { p: [0.06, 0.48, 0], s: [0.17, 0.16, 0.2] }); // 肩
  b.add(blob(), '#8d8f96', { p: [-0.1, 0.38, 0], s: [0.1, 0.1, 0.17] }); // 背中の銀色の毛（シルバーバック）
  b.add(ball(0.1, 8, 6), k, { p: [0.14, 0.62, 0] });
  b.add(blob(), face, { p: [0.21, 0.6, 0], s: [0.05, 0.07, 0.08] });
  b.add(ball(0.03, 5, 4), NOSE, { p: [0.255, 0.6, 0] });
  eyes(b, 0.225, 0.645, 0.04, 0.012);
  for (const s of [-1, 1]) {
    b.add(cyl(0.05, 0.06, 0.4, 6), k, { p: [0.18, 0.28, s * 0.17], r: [s * -0.15, 0, 0.25] }); // 長いうで
    b.add(ball(0.05, 6, 4), face, { p: [0.23, 0.08, s * 0.19] });
    b.add(cyl(0.05, 0.06, 0.2, 6), k, { p: [-0.12, 0.1, s * 0.11] });
  }
  return b.build();
}

function lemur() {
  const b = new Builder();
  const g = '#9b9aa0';
  b.add(blob(), g, { p: [0, 0.22, 0], s: [0.13, 0.14, 0.1] });
  b.add(blob(), '#f2efe8', { p: [0.04, 0.2, 0], s: [0.08, 0.11, 0.08] });
  b.add(ball(0.08, 8, 6), '#e9e6e0', { p: [0.13, 0.36, 0] });
  b.add(blob(), '#2e2c33', { p: [0.2, 0.34, 0], s: [0.05, 0.03, 0.035] }); // 黒い鼻先
  for (const s of [-1, 1]) {
    b.add(ball(0.03, 6, 4), '#2e2c33', { p: [0.175, 0.37, s * 0.035] }); // 目のまわりの黒
    b.add(ball(0.016, 6, 4), '#f6b21a', { p: [0.195, 0.375, s * 0.042] }); // 黄色い目
    b.add(ball(0.007, 4, 3), EYE, { p: [0.205, 0.378, s * 0.046] });
    b.add(cone(0.025, 0.06, 4), g, { p: [0.11, 0.44, s * 0.05] });
    b.add(cyl(0.02, 0.02, 0.15, 5), g, { p: [0.06, 0.08, s * 0.06] });
  }
  // しま模様のしっぽ（白黒のしま）
  const pts: V3[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push([-0.12 - Math.sin(t * 1.4) * 0.14, 0.2 + t * 0.5, 0]);
  }
  for (let i = 0; i < pts.length - 1; i++) seg(b, pts[i], pts[i + 1], 0.024, 0.024, i % 2 ? '#22222a' : '#f4f2ee', 6);
  return b.build();
}

function crocodile() {
  const b = new Builder();
  const g = '#5e7a3a';
  const belly = '#c7c79a';
  b.add(blob(), g, { p: [0, 0.07, 0], s: [0.3, 0.065, 0.1] });
  b.add(blob(), belly, { p: [0, 0.04, 0], s: [0.27, 0.04, 0.09] });
  b.add(box(0.32, 0.055, 0.08), g, { p: [0.4, 0.06, 0], s: [1, 1, 1] }); // 長い口
  b.add(box(0.3, 0.02, 0.07), '#e9e2c9', { p: [0.4, 0.035, 0] }); // 歯の列
  b.add(cone(0.09, 0.36, 5), g, { p: [-0.44, 0.06, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 0.55] });
  for (let i = 0; i < 6; i++) b.add(cone(0.02, 0.04, 4), '#4b6530', { p: [0.15 - i * 0.1, 0.13, 0] }); // 背中のごつごつ
  for (const s of [-1, 1]) {
    b.add(ball(0.03, 6, 4), g, { p: [0.28, 0.11, s * 0.035] });
    b.add(ball(0.014, 5, 4), '#e8c23a', { p: [0.295, 0.125, s * 0.04] });
    for (const x of [0.15, -0.15]) b.add(box(0.05, 0.05, 0.08), g, { p: [x, 0.025, s * 0.11] });
  }
  return b.build();
}

function flamingo() {
  const b = new Builder();
  const p = '#f68fb5';
  b.add(cyl(0.2, 0.2, 0.02, 12), '#62c0ee', { p: [0, 0.01, 0] }); // 水たまり
  const a = bird(b, {
    body: p, wing: '#f37aa5', beak: '#fbe8ef', beakLen: 0.06, leg: '#f37aa5', legH: 0.42, bl: 0.24, bh: 0.13, bw: 0.12, headR: 0.04,
    neck: { len: 0.3, tilt: 0.25, r: 0.016 }, tail: { color: '#2a2a2f', len: 0.05 },
  });
  b.add(cone(0.015, 0.04, 5), '#2a2a2f', { p: [a.hx + 0.08, a.hy - 0.03, 0], r: [0, 0, -2.4] }); // 曲がったくちばしの先
  return b.build();
}

// =====================================================================
// アジア
// =====================================================================

function panda() {
  const b = new Builder();
  const w = '#f8f8f4';
  const k = '#26262c';
  b.add(blob(), w, { p: [0, 0.24, 0], s: [0.22, 0.23, 0.22] });
  b.add(blob(), k, { p: [0.02, 0.36, 0], s: [0.12, 0.08, 0.235] }); // 肩の黒いベルト
  for (const s of [-1, 1]) {
    b.add(blob(), k, { p: [0.14, 0.08, s * 0.12], s: [0.09, 0.07, 0.07] }); // 足
    b.add(blob(), k, { p: [0.16, 0.28, s * 0.17], s: [0.06, 0.1, 0.06], r: [s * 0.3, 0, -0.5] }); // うで
  }
  b.add(ball(0.17, 10, 8), w, { p: [0.06, 0.56, 0] });
  b.add(blob(), w, { p: [0.19, 0.52, 0], s: [0.06, 0.05, 0.08] });
  b.add(ball(0.025, 5, 4), k, { p: [0.25, 0.54, 0] });
  for (const s of [-1, 1]) {
    b.add(ball(0.06, 7, 5), k, { p: [0.02, 0.7, s * 0.12] }); // 耳
    b.add(blob(), k, { p: [0.17, 0.59, s * 0.065], s: [0.03, 0.045, 0.035], r: [s * -0.5, 0, 0] }); // 目のまわり
  }
  eyes(b, 0.195, 0.6, 0.065, 0.016);
  // タケ
  for (const [x, z] of [[0.34, 0.12], [0.38, -0.06]]) {
    b.add(cyl(0.015, 0.015, 0.8, 6), '#6cbf4a', { p: [x, 0.4, z] });
    for (const y of [0.25, 0.5, 0.75]) b.add(cyl(0.018, 0.018, 0.015, 6), '#4f9a37', { p: [x, y, z] });
    b.add(box(0.12, 0.01, 0.035), '#7fd35a', { p: [x + 0.05, 0.6, z], r: [0, 0, 0.4] });
  }
  return b.build();
}

function redPanda() {
  const b = new Builder();
  const r = '#c6502a';
  const a = quad(b, {
    body: r, belly: '#2b2220', leg: '#2b2220', len: 0.3, h: 0.15, w: 0.14, legH: 0.08, legR: 0.025,
    head: { l: 0.13, h: 0.12, w: 0.13 }, snout: { len: 0.03, color: '#fbf7ee' },
    ears: { type: 'point', size: 0.05, color: '#fbf7ee', inner: r },
  });
  // 白い顔もよう
  for (const s of [-1, 1]) b.add(ball(0.025, 5, 4), '#fbf7ee', { p: [a.hx + 0.04, a.hy + 0.035, s * 0.04] });
  // ふさふさのしま模様のしっぽ
  const y = a.bodyY;
  const pts: V3[] = [[-0.13, y + 0.02, 0], [-0.2, y - 0.0, 0], [-0.27, y - 0.02, 0], [-0.34, y - 0.02, 0], [-0.41, y + 0.0, 0]];
  for (let i = 0; i < pts.length - 1; i++) seg(b, pts[i], pts[i + 1], 0.038, 0.038, i % 2 ? '#8a3519' : r, 7);
  return b.build();
}

function tiger(color = '#ee8a33', size = 1) {
  const b = new Builder();
  const k = '#26262c';
  const a = quad(b, {
    body: color, belly: '#fbf3e4', len: 0.56 * size, h: 0.22 * size, w: 0.2 * size, legH: 0.17 * size, legR: 0.035 * size,
    head: { l: 0.16 * size, h: 0.14 * size, w: 0.16 * size }, snout: { len: 0.05 * size, color: '#fbf3e4' }, nose: '#c45a5a',
    ears: { type: 'round', size: 0.05 * size, inner: '#fbf3e4' }, tail: { type: 'thin', len: 0.32 * size, tip: k, angle: 0.5, r: 0.014 * size },
  });
  stripes(b, k, [-0.2, -0.13, -0.06, 0.01, 0.08, 0.15].map((x) => x * size), a.bodyY, 0.56 * size, 0.22 * size, 0.2 * size, 0.012 * size);
  for (const s of [-1, 1]) b.add(box(0.012 * size, 0.06 * size, 0.02 * size), k, { p: [a.hx - 0.02 * size, a.hy + 0.04 * size, s * 0.07 * size], r: [s * 0.4, 0, 0] });
  b.add(box(0.03 * size, 0.012 * size, 0.06 * size), k, { p: [a.hx + 0.03 * size, a.hy + 0.065 * size, 0] });
  return b.build();
}

function snowLeopard() {
  const b = new Builder();
  const c = '#dcdad3';
  const a = quad(b, {
    body: c, belly: '#f6f5f1', len: 0.46, h: 0.18, w: 0.17, legH: 0.13, legR: 0.03,
    head: { l: 0.13, h: 0.12, w: 0.13 }, snout: { len: 0.04, color: '#f6f5f1' }, nose: '#c79a9a', eye: 0.014,
    ears: { type: 'round', size: 0.04 },
  });
  const y = a.bodyY;
  // とても太くて長いしっぽ（寒いときは毛布のように体にまく）
  curve(b, [[-0.22, y + 0.02, 0], [-0.36, y - 0.04, 0.03], [-0.48, y - 0.02, 0.08], [-0.55, y + 0.06, 0.06]], 0.032, 0.036, c, 7);
  b.add(ball(0.037, 6, 5), '#5f5d5a', { p: [-0.55, y + 0.07, 0.06] });
  bodySpots(b, '#5f5d5a', a, 0.46, 0.18, 0.17, [
    [0.1, 0.02, 1], [-0.04, 0.03, 1], [-0.14, 0.01, 1], [0.04, 0.03, -1], [-0.1, 0.02, -1], [0.14, 0.0, -1],
    [0.0, 0.07, 1], [-0.08, 0.07, -1], [0.07, 0.06, -1], [-0.15, 0.05, 1], [0.12, 0.05, 1], [-0.02, -0.03, 1], [-0.06, -0.02, -1],
  ], 0.017);
  return b.build();
}

function snowMonkey() {
  const b = new Builder();
  const fur = '#a9a198';
  const face = '#e98a86';
  // 温泉
  b.add(cyl(0.34, 0.36, 0.05, 14), '#8fd4ee', { p: [0, 0.025, 0] });
  b.add(cyl(0.36, 0.38, 0.04, 14), '#8c8c8c', { p: [0, 0.01, 0] });
  b.add(blob(), fur, { p: [0, 0.18, 0], s: [0.13, 0.15, 0.13] });
  b.add(ball(0.1, 9, 7), fur, { p: [0.04, 0.37, 0] });
  b.add(blob(), face, { p: [0.11, 0.36, 0], s: [0.035, 0.07, 0.065] }); // 赤い顔
  eyes(b, 0.135, 0.38, 0.03, 0.012);
  for (const s of [-1, 1]) b.add(ball(0.025, 5, 4), face, { p: [0.04, 0.38, s * 0.1] });
  // 頭の上の雪
  b.add(blob(), '#ffffff', { p: [0.02, 0.46, 0], s: [0.06, 0.025, 0.06] });
  // ゆげ
  for (const [x, y, z] of [[-0.2, 0.18, 0.15], [-0.15, 0.28, -0.12], [0.22, 0.2, -0.2]]) b.add(gem(0.05), '#f2f6fa', { p: [x, y, z] });
  return b.build();
}

function macaque() {
  const b = new Builder();
  const fur = '#b89b74';
  const a = quad(b, {
    body: fur, belly: '#d6c2a2', len: 0.3, h: 0.16, w: 0.14, legH: 0.12, legR: 0.025,
    head: { l: 0.12, h: 0.11, w: 0.11 }, snout: { len: 0.03, color: '#d9a99a' }, nose: null,
    ears: { type: 'round', size: 0.035, color: '#d9a99a' },
  });
  void a;
  return b.build();
}

function deer(color = '#b07a48', antlers = true) {
  const b = new Builder();
  const a = quad(b, {
    body: color, belly: '#efe2cc', hoof: '#3a2a20', len: 0.42, h: 0.22, w: 0.17, legH: 0.28, legR: 0.02,
    neck: { len: 0.14, tilt: 0.45, r: 0.04 },
    head: { l: 0.15, h: 0.08, w: 0.08, tilt: -0.25 }, snout: { len: 0.04 },
    ears: { type: 'point', size: 0.06, inner: '#e9c9b0' }, tail: { type: 'short', len: 0.05, color: '#ffffff' },
  });
  // しかの子もよう
  bodySpots(b, '#f8f0de', a, 0.42, 0.22, 0.17, [[0.08, 0.05, 1], [-0.05, 0.06, 1], [-0.12, 0.04, 1], [0.02, 0.06, -1], [-0.1, 0.05, -1], [0.12, 0.03, -1], [0.0, 0.08, 1], [-0.07, 0.08, -1]], 0.012);
  if (antlers)
    for (const s of [-1, 1]) {
      const h0: V3 = [a.hx - 0.02, a.hy + 0.035, s * 0.025];
      const h1: V3 = [a.hx - 0.05, a.hy + 0.12, s * 0.06];
      const h2: V3 = [a.hx - 0.1, a.hy + 0.2, s * 0.07];
      curve(b, [h0, h1, h2], 0.009, 0.005, '#d8c4a0', 4);
      seg(b, h1, [a.hx + 0.0, a.hy + 0.17, s * 0.075], 0.006, 0.004, '#d8c4a0', 4);
    }
  return b.build();
}

function crane() {
  const b = new Builder();
  const a = bird(b, {
    body: '#fbfbf8', wing: '#fbfbf8', beak: '#c7c08a', beakLen: 0.09, leg: '#2a2a2f', legH: 0.36, bl: 0.3, bh: 0.16, bw: 0.14, headR: 0.04,
    neck: { len: 0.26, tilt: 0.2, r: 0.02, color: '#26262c' }, tail: { color: '#26262c', len: 0.12, up: -0.2 },
  });
  b.add(ball(0.022, 6, 4), '#e2302b', { p: [a.hx - 0.005, a.hy + 0.035, 0] }); // 赤い頭（丹頂）
  return b.build();
}

function peacock() {
  const b = new Builder();
  const blue = '#1f5fbf';
  const a = bird(b, {
    body: blue, wing: '#a3784a', beak: '#d8c9a8', beakLen: 0.04, leg: '#9a8f7c', legH: 0.16, bl: 0.24, bh: 0.15, bw: 0.13, headR: 0.04,
    neck: { len: 0.14, tilt: 0.2, r: 0.025, color: '#1f72d0' },
  });
  for (const z of [-0.012, 0, 0.012]) b.add(cyl(0.003, 0.003, 0.05, 3), blue, { p: [a.hx - 0.01, a.hy + 0.06, z] });
  // 広げた羽（目玉もよう）
  for (let i = 0; i < 11; i++) {
    const t = -1.1 + (i / 10) * 2.2;
    const x = -0.16 - Math.cos(t) * 0.05;
    const y = 0.25 + Math.cos(t) * 0.3;
    const z = Math.sin(t) * 0.34;
    b.add(box(0.015, 0.5, 0.055), '#2f9a5a', { p: [-0.13, 0.25 + Math.cos(t) * 0.12, Math.sin(t) * 0.14], r: [t, 0, 0] });
    b.add(ball(0.035, 6, 4), '#3fb36a', { p: [x, y, z], s: [0.4, 1, 1] });
    b.add(ball(0.02, 6, 4), '#1d4fa8', { p: [x + 0.008, y, z], s: [0.4, 1, 1] });
  }
  return b.build();
}

function waterBuffalo() {
  const b = new Builder();
  const g = '#4d4a4f';
  const a = quad(b, {
    body: g, belly: '#5c595e', hoof: '#2a2830', len: 0.52, h: 0.28, w: 0.26, legH: 0.18, legR: 0.04,
    head: { l: 0.2, h: 0.13, w: 0.13, tilt: -0.3 }, snout: { len: 0.05, color: '#3a383c' }, nose: null,
    ears: { type: 'droop', size: 0.06 }, tail: { type: 'tuft', len: 0.22, tip: '#222', angle: 1.35 },
  });
  // 大きく後ろに曲がった角
  for (const s of [-1, 1])
    curve(b, [[a.hx - 0.03, a.hy + 0.05, s * 0.04], [a.hx - 0.06, a.hy + 0.08, s * 0.14], [a.hx - 0.13, a.hy + 0.1, s * 0.22], [a.hx - 0.2, a.hy + 0.15, s * 0.2]], 0.028, 0.008, '#cfc4b0', 6);
  return b.build();
}

function komodo() {
  const b = new Builder();
  const g = '#6f6a52';
  b.add(blob(), g, { p: [0, 0.07, 0], s: [0.24, 0.07, 0.11] });
  b.add(blob(), '#7d7860', { p: [0.27, 0.08, 0], s: [0.1, 0.05, 0.06] });
  b.add(cone(0.08, 0.45, 5), g, { p: [-0.42, 0.05, 0], r: [0, 0, Math.PI / 2], s: [1, 1, 0.55] });
  b.add(box(0.06, 0.006, 0.01), '#e8b23a', { p: [0.39, 0.06, 0] }); // 黄色い舌
  eyes(b, 0.3, 0.11, 0.035, 0.01);
  for (const s of [-1, 1]) for (const x of [0.13, -0.13]) b.add(box(0.05, 0.06, 0.1), g, { p: [x, 0.03, s * 0.12], r: [s * 0.3, 0, 0] });
  return b.build();
}

function orangutan() {
  const b = new Builder();
  const o = '#c8622a';
  b.add(blob(), o, { p: [0, 0.28, 0], s: [0.15, 0.17, 0.16] });
  b.add(ball(0.1, 8, 6), o, { p: [0.04, 0.5, 0] });
  b.add(blob(), '#7a4a35', { p: [0.11, 0.48, 0], s: [0.04, 0.08, 0.09] }); // 顔
  eyes(b, 0.135, 0.51, 0.035, 0.012);
  for (const s of [-1, 1]) {
    b.add(cyl(0.035, 0.045, 0.42, 6), o, { p: [0.08, 0.32, s * 0.17], r: [s * -0.35, 0, 0.15] }); // とても長いうで
    b.add(cyl(0.035, 0.04, 0.16, 6), o, { p: [-0.02, 0.08, s * 0.08] });
  }
  for (const [x, y, z] of [[-0.05, 0.36, 0.13], [-0.08, 0.22, -0.13], [0.02, 0.6, 0.06]]) b.add(gem(0.05), '#d97436', { p: [x, y, z] }); // もじゃもじゃの毛
  return b.build();
}

function tapir() {
  const b = new Builder();
  const k = '#26262c';
  const a = quad(b, {
    body: k, len: 0.5, h: 0.26, w: 0.22, legH: 0.14, legR: 0.035,
    head: { l: 0.18, h: 0.12, w: 0.11, tilt: -0.2 }, snout: { len: 0.07 }, nose: null,
    ears: { type: 'round', size: 0.05, inner: '#f6f6f2' }, tail: { type: 'short', len: 0.04 },
  });
  b.add(blob(), '#f6f6f2', { p: [-0.06, 0.29, 0], s: [0.16, 0.135, 0.115] }); // 白いおなかまわり（マレーバクの白黒）
  void a;
  return b.build();
}

function tarsier() {
  const b = new Builder();
  const c = '#b38f68';
  b.add(cyl(0.025, 0.03, 0.7, 6), '#7a5233', { p: [-0.1, 0.35, 0] }); // 木の枝
  b.add(blob(), c, { p: [0, 0.32, 0], s: [0.08, 0.11, 0.08] });
  b.add(ball(0.08, 9, 7), c, { p: [0.02, 0.48, 0] });
  for (const s of [-1, 1]) {
    // ものすごく大きな目
    b.add(ball(0.035, 9, 7), '#d79a2a', { p: [0.08, 0.49, s * 0.035] });
    b.add(ball(0.022, 7, 5), EYE, { p: [0.105, 0.49, s * 0.037] });
    b.add(ball(0.008, 4, 3), WHITE, { p: [0.12, 0.5, s * 0.04] });
    b.add(ball(0.04, 7, 5), '#c6a07a', { p: [-0.01, 0.56, s * 0.06], s: [0.3, 1, 1] });
    b.add(cyl(0.012, 0.012, 0.14, 4), c, { p: [0.02, 0.24, s * 0.05], r: [0, 0, 0.6] });
  }
  b.add(cyl(0.008, 0.008, 0.35, 4), c, { p: [-0.06, 0.12, 0], r: [0, 0, 0.1] });
  return b.build();
}

function horse(color = '#c79a62', mane = '#3a2a20') {
  const b = new Builder();
  const a = quad(b, {
    body: color, belly: '#e6d1ae', hoof: '#2a2420', leg: color, len: 0.46, h: 0.24, w: 0.19, legH: 0.26, legR: 0.026,
    neck: { len: 0.2, tilt: 0.6, r: 0.055 },
    head: { l: 0.2, h: 0.09, w: 0.085, tilt: -0.6 }, snout: { len: 0.04, color: '#efe6d6' }, nose: null,
    ears: { type: 'point', size: 0.045 }, tail: { type: 'tuft', len: 0.22, color: mane, tip: mane, angle: 1.25, r: 0.02 },
  });
  b.add(box(0.035, 0.24, 0.025), mane, { p: [0.3, 0.52, 0], r: [0, 0, -0.6] }); // 立ったたてがみ
  for (const x of [0.138, -0.138]) for (const z of [0.051, -0.051]) b.add(cyl(0.028, 0.028, 0.08, 6), '#3a2a20', { p: [x, 0.07, z] }); // 黒い足先
  void a;
  return b.build();
}

function camel(humps = 1) {
  const b = new Builder();
  const c = humps === 2 ? '#a57a4c' : '#d3aa70';
  const legH = 0.38;
  const bodyY = legH + 0.22 * 0.42;
  const a = quad(b, {
    body: c, belly: '#e2c290', len: 0.44, h: 0.22, w: 0.18, legH, legR: 0.025, hoof: '#8a6a44',
    head: { l: 0.16, h: 0.075, w: 0.075 }, headAt: [0.44, bodyY + 0.2], snout: { len: 0.04 },
    ears: { type: 'round', size: 0.03 }, tail: { type: 'tuft', len: 0.16, tip: '#6a4a2a', angle: 1.3 },
  });
  // 前に出てから上に曲がる、ラクダらしい首
  curve(b, [[0.16, bodyY + 0.04, 0], [0.3, bodyY - 0.02, 0], [0.38, bodyY + 0.06, 0], [0.4, bodyY + 0.18, 0]], 0.05, 0.035, c, 7);
  if (humps === 1) b.add(blob(), c, { p: [-0.02, bodyY + 0.1, 0], s: [0.12, 0.1, 0.08] });
  else
    for (const x of [0.08, -0.1]) {
      b.add(blob(), c, { p: [x, bodyY + 0.1, 0], s: [0.07, 0.09, 0.07] });
      b.add(gem(0.04), '#7a5434', { p: [x, bodyY + 0.17, 0] }); // こぶの上の長い毛
    }
  void a;
  return b.build();
}

function yak() {
  const b = new Builder();
  const k = '#2f2a28';
  const a = quad(b, {
    body: k, len: 0.5, h: 0.32, w: 0.28, legH: 0.12, legR: 0.04,
    head: { l: 0.17, h: 0.14, w: 0.14, tilt: -0.4 }, snout: { len: 0.04, color: '#e9e2d6' }, nose: null,
    tail: { type: 'bushy', len: 0.2, angle: 1.3 },
  });
  // 長い毛のスカート（地面近くまでたれさがる）
  for (let i = 0; i < 14; i++) {
    const t = (i / 14) * Math.PI * 2;
    b.add(cone(0.05, 0.2, 4), i % 2 ? '#463d39' : '#3a3330', { p: [Math.cos(t) * 0.2, 0.14, Math.sin(t) * 0.12], r: [Math.PI + Math.sin(t) * 0.2, 0, -Math.cos(t) * 0.2] });
  }
  for (const s of [-1, 1])
    curve(b, [[a.hx - 0.02, a.hy + 0.05, s * 0.05], [a.hx - 0.03, a.hy + 0.08, s * 0.13], [a.hx - 0.01, a.hy + 0.16, s * 0.16]], 0.024, 0.009, '#efe8da', 5);
  return b.build();
}

function cat() {
  const b = new Builder();
  const w = '#fbfaf6';
  const a = quad(b, {
    body: w, len: 0.3, h: 0.14, w: 0.12, legH: 0.1, legR: 0.02,
    head: { l: 0.12, h: 0.11, w: 0.12 }, nose: '#f2a0a8', eye: 0.014,
    ears: { type: 'point', size: 0.055, inner: '#f6c2c6' }, tail: { type: 'thin', len: 0.24, color: '#d89a5a', angle: -0.9, r: 0.014 },
  });
  b.add(blob(), '#d89a5a', { p: [a.hx - 0.02, a.hy + 0.04, 0], s: [0.04, 0.025, 0.05] }); // 頭の茶色いもよう（ヴァン猫）
  // 左右で色がちがう目
  b.add(ball(0.009, 4, 3), '#3aa0e8', { p: [a.hx + 0.035, a.hy + 0.016, 0.046] });
  b.add(ball(0.009, 4, 3), '#e8c23a', { p: [a.hx + 0.035, a.hy + 0.016, -0.046] });
  return b.build();
}

function oryx() {
  const b = new Builder();
  const a = quad(b, {
    body: '#f5f2ea', len: 0.42, h: 0.22, w: 0.18, legH: 0.28, legR: 0.022, leg: '#efe9dc', hoof: '#2a2420',
    neck: { len: 0.12, tilt: 0.55, r: 0.045 },
    head: { l: 0.16, h: 0.08, w: 0.08, tilt: -0.3 }, snout: { len: 0.03, color: '#2a2420' }, nose: null,
    ears: { type: 'point', size: 0.045 }, tail: { type: 'tuft', len: 0.15, tip: '#2a2420', angle: 1.3 },
  });
  // まっすぐ長い2本の角（横から見ると1本に見えて、ユニコーン伝説のもとになったとも）
  for (const s of [-1, 1]) b.add(cone(0.01, 0.34, 5), '#2a2420', { p: [a.hx - 0.12, a.hy + 0.14, s * 0.02], r: [0, 0, 0.75] });
  b.add(box(0.06, 0.03, 0.085), '#2a2420', { p: [a.hx + 0.02, a.hy + 0.01, 0] }); // 顔の黒いもよう
  return b.build();
}

function falcon() {
  const b = new Builder();
  b.add(cyl(0.12, 0.14, 0.12, 8), '#bda07a', { p: [0, 0.06, 0] }); // 止まり台
  const a = bird(b, {
    body: '#5b6370', belly: '#efe7d8', wing: '#4a515d', beak: '#f2c443', beakLen: 0.04, leg: '#f2c443', legH: 0.12, bl: 0.2, bh: 0.2, bw: 0.13, headR: 0.06,
    upright: 0.9, tail: { color: '#4a515d', len: 0.1, up: -0.8 },
  });
  b.add(blob(), '#2e333b', { p: [a.hx + 0.01, a.hy - 0.02, 0], s: [0.04, 0.045, 0.062] }); // 黒いひげもよう
  return b.build();
}

// =====================================================================
// ヨーロッパ
// =====================================================================

function rooster() {
  const b = new Builder();
  const a = bird(b, {
    body: '#f4efe4', wing: '#c7562e', head: '#f4efe4', beak: '#f2c443', beakLen: 0.04, leg: '#f2c443', legH: 0.14, bl: 0.22, bh: 0.18, bw: 0.13, headR: 0.055,
    neck: { len: 0.1, tilt: 0.1, r: 0.04, color: '#e7a03a' }, upright: 0.3,
  });
  for (let i = 0; i < 3; i++) b.add(ball(0.025, 5, 4), '#e2302b', { p: [a.hx - 0.02 + i * 0.02, a.hy + 0.06, 0] }); // とさか
  b.add(blob(), '#e2302b', { p: [a.hx + 0.04, a.hy - 0.06, 0], s: [0.015, 0.025, 0.012] });
  // ふさふさのしっぽ
  for (let i = 0; i < 4; i++)
    curve(b, [[-0.1, 0.3, (i - 1.5) * 0.02], [-0.17 - i * 0.015, 0.42 - i * 0.02, (i - 1.5) * 0.025], [-0.2 - i * 0.02, 0.36 - i * 0.04, (i - 1.5) * 0.03]], 0.018, 0.008, ['#1f3d7a', '#2f8a4f', '#26262c', '#1f3d7a'][i], 4);
  return b.build();
}

function hedgehog() {
  const b = new Builder();
  const a = quad(b, {
    body: '#d9bf9a', len: 0.26, h: 0.12, w: 0.18, legH: 0.04, legR: 0.02,
    head: { l: 0.1, h: 0.08, w: 0.08 }, snout: { len: 0.05, color: '#e9d4b4' }, eye: 0.012,
    ears: { type: 'round', size: 0.025 },
  });
  // トゲトゲの背中
  for (let i = 0; i < 26; i++) {
    const u = (i % 7) / 6 - 0.5;
    const v = Math.floor(i / 7) / 3;
    b.add(cone(0.025, 0.08, 4), i % 3 ? '#6b4a33' : '#a8875f', {
      p: [u * 0.24, 0.12 + Math.cos(v * 2.4 - 1.2) * 0.06, (v - 0.5) * 0.2],
      r: [(v - 0.5) * 1.4, 0, -u * 1.6],
    });
  }
  void a;
  return b.build();
}

function stork() {
  const b = new Builder();
  // 屋根の上の巣
  b.add(cyl(0.16, 0.18, 0.08, 10), '#8a6a44', { p: [0, 0.04, 0] });
  b.add(cyl(0.12, 0.12, 0.02, 10), '#6b5034', { p: [0, 0.085, 0] });
  const a = bird(b, {
    body: '#fbfbf8', wing: '#26262c', beak: '#e2302b', beakLen: 0.11, leg: '#e2302b', legH: 0.34, bl: 0.24, bh: 0.13, bw: 0.12, headR: 0.04,
    neck: { len: 0.13, tilt: 0.25, r: 0.022, color: '#fbfbf8' },
  });
  void a;
  return b.build();
}

function wolf() {
  const b = new Builder();
  const g = '#8c8780';
  const a = quad(b, {
    body: g, belly: '#d9d4cb', len: 0.46, h: 0.2, w: 0.16, legH: 0.22, legR: 0.024, leg: '#a8a39b',
    head: { l: 0.15, h: 0.11, w: 0.11 }, snout: { len: 0.08, color: '#d9d4cb' }, eye: 0.013,
    ears: { type: 'point', size: 0.06, inner: '#4a4540' }, tail: { type: 'bushy', len: 0.26, tip: '#3a3530', angle: 1.1 },
  });
  b.add(blob(), '#6e6962', { p: [0, 0.37, 0], s: [0.18, 0.05, 0.075] }); // 背中のこい毛
  void a;
  return b.build();
}

function lynx() {
  const b = new Builder();
  const c = '#c99a5e';
  const a = quad(b, {
    body: c, belly: '#f2e3c8', len: 0.36, h: 0.18, w: 0.15, legH: 0.18, legR: 0.03,
    head: { l: 0.13, h: 0.12, w: 0.13 }, snout: { len: 0.03, color: '#f2e3c8' }, nose: '#b36a5a', eye: 0.013,
    ears: { type: 'point', size: 0.06, inner: '#f2e3c8' }, tail: { type: 'short', len: 0.06, color: '#2a2420' },
  });
  // 耳の先の黒い毛・ほおひげ
  for (const s of [-1, 1]) {
    b.add(cyl(0.004, 0.004, 0.04, 3), '#2a2420', { p: [a.hx - 0.016, a.hy + 0.125, s * 0.05], r: [s * 0.3, 0, 0] });
    b.add(cone(0.03, 0.06, 4), '#f2e3c8', { p: [a.hx + 0.01, a.hy - 0.04, s * 0.075], r: [s * 1.7, 0, 0] });
  }
  bodySpots(b, '#7a5534', a, 0.36, 0.18, 0.15, [[0.08, 0.02, 1], [-0.04, 0.04, 1], [0.02, 0.03, -1], [-0.1, 0.01, -1], [-0.1, 0.04, 1], [0.1, 0.03, -1]], 0.014);
  return b.build();
}

function cow() {
  const b = new Builder();
  const w = '#fbfbf7';
  const k = '#26262c';
  const a = quad(b, {
    body: w, len: 0.5, h: 0.26, w: 0.24, legH: 0.2, legR: 0.035, hoof: '#3a3530',
    head: { l: 0.18, h: 0.13, w: 0.12, tilt: -0.3 }, snout: { len: 0.05, color: '#f2b8bc' }, nose: null,
    ears: { type: 'droop', size: 0.05 }, tail: { type: 'tuft', len: 0.24, tip: k, angle: 1.4 },
  });
  // ホルスタインの白黒もよう
  const y = a.bodyY;
  for (const [x, dy, z, r] of [[0.1, 0.02, 1, 0.06], [-0.12, 0.04, 1, 0.07], [0.0, 0.05, -1, 0.065], [-0.17, -0.02, -1, 0.045], [0.17, -0.03, -1, 0.04]] as const) {
    // 体の表面にそった平たいもよう
    const zz = (0.12 * Math.sqrt(Math.max(0, 1 - (x / 0.25) ** 2 - (dy / 0.13) ** 2)) + 0.004) * z;
    b.add(blob(), k, { p: [x, y + dy, zz], s: [r, r * 0.8, 0.012] });
  }
  b.add(blob(), k, { p: [-0.02, y + 0.125, 0], s: [0.08, 0.012, 0.06] });
  b.add(blob(), k, { p: [a.hx - 0.02, a.hy + 0.03, 0], s: [0.05, 0.04, 0.062] });
  for (const s of [-1, 1]) b.add(cone(0.012, 0.05, 5), '#e9e2d6', { p: [a.hx - 0.04, a.hy + 0.07, s * 0.06], r: [s * 1.0, 0, 0] });
  b.add(ball(0.025, 6, 4), '#f2b8bc', { p: [-0.05, 0.22, 0] }); // おちち
  b.add(cyl(0.012, 0.012, 0.03, 5), '#8a7a6a', { p: [a.hx - 0.02, a.hy - 0.11, 0] });
  b.add(cyl(0.025, 0.02, 0.035, 8), '#e8c23a', { p: [a.hx - 0.02, a.hy - 0.14, 0] }); // カウベル
  return b.build();
}

function ibex() {
  const b = new Builder();
  const a = quad(b, {
    body: '#8f7a5e', belly: '#d9cbb3', hoof: '#2a2420', len: 0.38, h: 0.2, w: 0.16, legH: 0.18, legR: 0.024,
    neck: { len: 0.08, tilt: 0.5, r: 0.045 },
    head: { l: 0.13, h: 0.08, w: 0.08, tilt: -0.3 }, snout: { len: 0.03 },
    ears: { type: 'point', size: 0.035 }, tail: { type: 'short', len: 0.04 },
  });
  // 後ろに大きくカーブした角
  for (const s of [-1, 1]) {
    const pts: V3[] = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      pts.push([a.hx - 0.03 - Math.sin(t * 2.2) * 0.09 - t * 0.06, a.hy + 0.05 + Math.sin(t * 1.7) * 0.15, s * (0.025 + t * 0.02)]);
    }
    curve(b, pts, 0.016, 0.007, '#7a6a52', 5);
  }
  b.add(box(0.02, 0.05, 0.02), '#4a3a2a', { p: [a.hx + 0.02, a.hy - 0.07, 0] }); // あごひげ
  return b.build();
}

function stBernard() {
  const b = new Builder();
  const w = '#fbf7ee';
  const r = '#b5642e';
  const a = quad(b, {
    body: w, len: 0.4, h: 0.2, w: 0.18, legH: 0.15, legR: 0.035,
    head: { l: 0.14, h: 0.13, w: 0.13 }, snout: { len: 0.06, color: w }, eye: 0.013,
    ears: { type: 'droop', size: 0.06, color: r }, tail: { type: 'bushy', len: 0.2, angle: 0.9, color: r, tip: w },
  });
  b.add(blob(), r, { p: [-0.04, 0.3, 0], s: [0.15, 0.08, 0.095] }); // 背中の茶色
  b.add(blob(), r, { p: [a.hx - 0.02, a.hy + 0.03, 0], s: [0.05, 0.05, 0.067] });
  b.add(cyl(0.035, 0.035, 0.05, 8), '#a8743a', { p: [a.hx - 0.05, a.hy - 0.12, 0], r: [Math.PI / 2, 0, 0] }); // 首のたる
  return b.build();
}

function owl() {
  const b = new Builder();
  b.add(cyl(0.03, 0.04, 0.25, 6), '#7a5233', { p: [0, 0.125, 0] });
  b.add(box(0.3, 0.035, 0.035), '#7a5233', { p: [0, 0.25, 0] });
  const c = '#a8875f';
  b.add(blob(), c, { p: [0, 0.38, 0], s: [0.1, 0.13, 0.1] });
  b.add(blob(), '#e9dcc4', { p: [0.04, 0.35, 0], s: [0.07, 0.1, 0.08] });
  b.add(ball(0.09, 9, 7), c, { p: [0.01, 0.53, 0] });
  for (const s of [-1, 1]) {
    b.add(ball(0.035, 8, 6), '#f4ecd8', { p: [0.07, 0.54, s * 0.038], s: [0.4, 1, 1] }); // 顔のお皿
    b.add(ball(0.022, 7, 5), '#f2c443', { p: [0.085, 0.545, s * 0.038] });
    b.add(ball(0.012, 5, 4), EYE, { p: [0.098, 0.545, s * 0.04] });
    b.add(ball(0.004, 3, 3), WHITE, { p: [0.105, 0.55, s * 0.042] });
    b.add(cone(0.02, 0.05, 4), c, { p: [0.0, 0.62, s * 0.05] }); // 耳のような羽
    b.add(blob(), '#8a6a44', { p: [-0.01, 0.38, s * 0.09], s: [0.07, 0.1, 0.02] });
  }
  b.add(cone(0.012, 0.03, 4), '#5a4a3a', { p: [0.1, 0.52, 0], r: [0, 0, Math.PI] });
  return b.build();
}

function dolphin() {
  const b = new Builder();
  const g = '#7f9bb8';
  // 海からジャンプしているところ
  b.add(blob(), g, { p: [0, 0.25, 0], s: [0.28, 0.08, 0.08], r: [0, 0, 0.6] });
  b.add(blob(), '#dfe8f0', { p: [0.02, 0.22, 0], s: [0.24, 0.05, 0.065], r: [0, 0, 0.6] });
  b.add(cone(0.03, 0.12, 6), g, { p: [0.23, 0.44, 0], r: [0, 0, -0.95] }); // くちばし
  b.add(cone(0.04, 0.1, 4), g, { p: [-0.04, 0.33, 0], r: [0, 0, 0.3], s: [1, 1, 0.3] }); // 背びれ
  b.add(box(0.03, 0.02, 0.16), g, { p: [-0.24, 0.07, 0], r: [0, 0, 0.6] });
  eyes(b, 0.16, 0.38, 0.06, 0.01);
  for (const [x, z] of [[-0.25, 0.08], [0.15, -0.1], [-0.05, 0.14]]) b.add(gem(0.04), '#e8f6ff', { p: [x, 0.03, z] });
  return b.build();
}

function puffin() {
  const b = new Builder();
  const a = bird(b, {
    body: '#22242c', belly: '#fbfbf8', beak: '#f07a2a', beakLen: 0.05, leg: '#f07a2a', legH: 0.05, bl: 0.18, bh: 0.24, bw: 0.15, headR: 0.07,
    upright: 1.2,
  });
  b.add(blob(), '#f2f0ea', { p: [a.hx + 0.02, a.hy - 0.005, 0], s: [0.05, 0.05, 0.072] }); // 白い顔
  b.add(blob(), '#f07a2a', { p: [a.hx + 0.09, a.hy - 0.005, 0], s: [0.035, 0.035, 0.022] }); // 大きなカラフルなくちばし
  b.add(blob(), '#3a7ad9', { p: [a.hx + 0.075, a.hy + 0.005, 0], s: [0.01, 0.03, 0.024] });
  eyes(b, a.hx + 0.04, a.hy + 0.02, 0.05, 0.012);
  return b.build();
}

function moose() {
  const b = new Builder();
  const c = '#5a3e2c';
  const a = quad(b, {
    body: c, belly: '#6e5040', leg: '#8a7260', hoof: '#2a2420', len: 0.5, h: 0.28, w: 0.22, legH: 0.34, legR: 0.026,
    head: { l: 0.22, h: 0.1, w: 0.09, tilt: -0.5 }, snout: { len: 0.07, h: 0.08 }, nose: null,
    ears: { type: 'point', size: 0.06 }, tail: { type: 'short', len: 0.04 },
  });
  b.add(blob(), '#4a3224', { p: [0.16, 0.6, 0], s: [0.12, 0.1, 0.11] }); // こぶのような肩
  b.add(box(0.025, 0.08, 0.02), c, { p: [a.hx - 0.02, a.hy - 0.1, 0] }); // のどのぶらさがり
  // 手のひらのように広い角
  for (const s of [-1, 1]) {
    seg(b, [a.hx - 0.03, a.hy + 0.04, s * 0.025], [a.hx - 0.06, a.hy + 0.085, s * 0.085], 0.018, 0.015, '#d8c4a0', 5);
    b.add(blob(), '#d8c4a0', { p: [a.hx - 0.07, a.hy + 0.1, s * 0.13], s: [0.085, 0.017, 0.07], r: [s * 0.35, 0, 0] });
    for (let i = 0; i < 4; i++) b.add(cone(0.012, 0.05, 4), '#d8c4a0', { p: [a.hx - 0.125 + i * 0.036, a.hy + 0.135, s * 0.18], r: [s * 0.35, 0, 0] });
  }
  return b.build();
}

function reindeer() {
  const b = new Builder();
  const a = quad(b, {
    body: '#8a7562', belly: '#efe7da', hoof: '#2a2420', leg: '#a8957f', len: 0.42, h: 0.22, w: 0.18, legH: 0.24, legR: 0.024,
    neck: { len: 0.12, tilt: 0.6, r: 0.055, color: '#efe7da' },
    head: { l: 0.15, h: 0.085, w: 0.08, tilt: -0.3 }, snout: { len: 0.04 },
    ears: { type: 'point', size: 0.04 }, tail: { type: 'short', len: 0.05, color: '#ffffff' },
  });
  // 枝分かれした角（オスもメスもある）
  for (const s of [-1, 1]) {
    const p0: V3 = [a.hx - 0.03, a.hy + 0.04, s * 0.025];
    const p1: V3 = [a.hx - 0.08, a.hy + 0.12, s * 0.06];
    const p2: V3 = [a.hx - 0.12, a.hy + 0.21, s * 0.08];
    const p3: V3 = [a.hx - 0.08, a.hy + 0.29, s * 0.09];
    curve(b, [p0, p1, p2, p3], 0.011, 0.006, '#d8c4a0', 4);
    seg(b, p1, [a.hx + 0.0, a.hy + 0.14, s * 0.05], 0.007, 0.005, '#d8c4a0', 4);
    seg(b, p2, [a.hx - 0.04, a.hy + 0.23, s * 0.1], 0.006, 0.004, '#d8c4a0', 4);
    seg(b, p0, [a.hx + 0.04, a.hy + 0.07, s * 0.02], 0.006, 0.004, '#d8c4a0', 4); // 顔の前の枝
  }
  return b.build();
}

function beaver() {
  const b = new Builder();
  const c = '#7a5236';
  const a = quad(b, {
    body: c, len: 0.32, h: 0.16, w: 0.18, legH: 0.04, legR: 0.025,
    head: { l: 0.12, h: 0.1, w: 0.11 }, snout: { len: 0.03, color: '#9a6a46' }, eye: 0.012,
    ears: { type: 'round', size: 0.025 },
  });
  b.add(box(0.03, 0.03, 0.03), '#f2c443', { p: [a.hx + 0.09, a.hy - 0.06, 0] }); // オレンジの前歯
  b.add(box(0.2, 0.025, 0.11), '#3a3a42', { p: [-0.26, 0.04, 0], r: [0, 0, 0.15] }); // 平たいしっぽ
  // かじった木
  b.add(cyl(0.03, 0.035, 0.12, 6), '#c7a070', { p: [0.3, 0.06, 0.12] });
  b.add(cone(0.035, 0.05, 6), '#e9d2a8', { p: [0.3, 0.14, 0.12] });
  return b.build();
}

// =====================================================================
// 南北アメリカ
// =====================================================================

function bison() {
  const b = new Builder();
  const c = '#5a3a24';
  const a = quad(b, {
    body: c, len: 0.5, h: 0.28, w: 0.24, legH: 0.16, legR: 0.04, leg: '#3e2818', hoof: '#1f1610',
    head: { l: 0.16, h: 0.14, w: 0.14, color: '#3e2818', tilt: -0.5 }, nose: null,
    tail: { type: 'tuft', len: 0.14, tip: '#2a1a10', angle: 1.3 },
  });
  b.add(gem(0.2), '#6e4a2e', { p: [0.12, 0.42, 0], s: [1, 1.1, 0.75] }); // もこもこの肩のこぶ
  b.add(box(0.04, 0.1, 0.06), '#2a1a10', { p: [a.hx - 0.01, a.hy - 0.1, 0] }); // あごひげ
  for (const s of [-1, 1]) b.add(cone(0.014, 0.07, 4), '#e8e1d4', { p: [a.hx - 0.01, a.hy + 0.07, s * 0.085], r: [s * 0.9, 0, 0] });
  return b.build();
}

function bear(color: string, snout: string, size = 1) {
  const b = new Builder();
  const a = quad(b, {
    body: color, len: 0.5 * size, h: 0.3 * size, w: 0.26 * size, legH: 0.13 * size, legR: 0.055 * size,
    head: { l: 0.17 * size, h: 0.15 * size, w: 0.16 * size }, snout: { len: 0.07 * size, color: snout }, eye: 0.013 * size,
    ears: { type: 'round', size: 0.05 * size }, tail: { type: 'short', len: 0.05 * size },
  });
  b.add(blob(), color, { p: [0.12 * size, a.bodyY + 0.07 * size, 0], s: [0.12 * size, 0.08 * size, 0.11 * size] }); // 肩の盛り上がり
  return b.build();
}

function eagle() {
  const b = new Builder();
  b.add(cyl(0.05, 0.08, 0.3, 6), '#7a5233', { p: [0, 0.15, 0] }); // 木の切り株
  b.add(cyl(0.09, 0.09, 0.03, 8), '#a8835a', { p: [0, 0.3, 0] });
  const a = bird(b, {
    body: '#4a3222', wing: '#3a281c', head: '#fbfbf8', beak: '#f2c443', beakLen: 0.06, leg: '#f2c443', legH: 0.33, bl: 0.22, bh: 0.2, bw: 0.15, headR: 0.065,
    upright: 0.75, tail: { color: '#fbfbf8', len: 0.1, up: -0.6 },
  });
  b.add(cone(0.015, 0.03, 4), '#f2c443', { p: [a.hx + 0.12, a.hy - 0.03, 0], r: [0, 0, -2.6] });
  return b.build();
}

function axolotl() {
  const b = new Builder();
  const p = '#f7b3c8';
  b.add(cyl(0.3, 0.3, 0.03, 14), '#4fb3e8', { p: [0, 0.015, 0] }); // 水
  b.add(blob(), p, { p: [0, 0.07, 0], s: [0.16, 0.055, 0.065] });
  b.add(ball(0.07, 9, 7), p, { p: [0.17, 0.08, 0], s: [1, 0.75, 1.15] });
  b.add(box(0.2, 0.06, 0.008), '#f9c9d6', { p: [-0.22, 0.08, 0] }); // しっぽのひれ
  // えら（ふさふさ）
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b.add(cone(0.012, 0.08, 4), '#e8578a', { p: [0.13, 0.1 + i * 0.03, s * 0.09], r: [s * (1.0 + i * 0.3), 0, 0.3] });
  eyes(b, 0.22, 0.1, 0.05, 0.01);
  b.add(box(0.004, 0.004, 0.05), '#a8466a', { p: [0.235, 0.065, 0] }); // にっこり口
  for (const s of [-1, 1]) for (const x of [0.08, -0.08]) b.add(cyl(0.012, 0.012, 0.06, 4), p, { p: [x, 0.03, s * 0.07], r: [s * 0.8, 0, 0] });
  return b.build();
}

function jaguar() {
  const b = new Builder();
  const c = '#e3a648';
  const a = quad(b, {
    body: c, belly: '#f7e6c4', len: 0.5, h: 0.22, w: 0.2, legH: 0.15, legR: 0.038,
    head: { l: 0.15, h: 0.14, w: 0.15 }, snout: { len: 0.04, color: '#f7e6c4' }, nose: '#a85a4a',
    ears: { type: 'round', size: 0.04 }, tail: { type: 'thin', len: 0.3, tip: '#26262c', angle: 0.7, r: 0.014 },
  });
  // バラの花のようなもよう（黒いふちの中が少しこい色）
  const pts: [number, number, number][] = [];
  for (const x of [-0.17, -0.08, 0.01, 0.1, 0.17]) for (const dy of [0.0, 0.06]) for (const side of [1, -1]) pts.push([x + dy * 0.3, dy, side]);
  bodySpots(b, '#26262c', a, 0.5, 0.22, 0.2, pts, 0.026);
  bodySpots(b, '#c47a2a', { bodyY: a.bodyY + 0.0005 }, 0.5 + 0.004, 0.22 + 0.004, 0.2 + 0.004, pts, 0.013);
  return b.build();
}

function capybara() {
  const b = new Builder();
  const c = '#9a6a42';
  const a = quad(b, {
    body: c, len: 0.42, h: 0.24, w: 0.22, legH: 0.08, legR: 0.035,
    head: { l: 0.2, h: 0.14, w: 0.13 }, snout: { len: 0.04, h: 0.1 }, nose: '#3a2a20', eye: 0.012,
    ears: { type: 'round', size: 0.035 },
  });
  void a;
  return b.build();
}

function llama() {
  const b = new Builder();
  const c = '#f3e8d4';
  const a = quad(b, {
    body: c, len: 0.38, h: 0.22, w: 0.18, legH: 0.28, legR: 0.024,
    neck: { len: 0.28, tilt: 0.15, r: 0.045 },
    head: { l: 0.13, h: 0.08, w: 0.075 }, snout: { len: 0.03 },
    ears: { type: 'long', size: 0.06 }, tail: { type: 'short', len: 0.05 },
  });
  for (let i = 0; i < 6; i++) b.add(gem(0.045), '#ebdcc2', { p: [-0.15 + i * 0.06, 0.48, (i % 2 ? 1 : -1) * 0.04] }); // もこもこの毛
  b.add(box(0.2, 0.025, 0.2), '#e0412b', { p: [0, 0.505, 0] }); // カラフルな布
  b.add(box(0.2, 0.012, 0.21), '#ffd23f', { p: [0, 0.52, 0] });
  for (const s of [-1, 1]) b.add(gem(0.02), '#e0412b', { p: [a.hx - 0.06, a.hy + 0.12, s * 0.035] }); // 耳のかざり
  return b.build();
}

function toucan() {
  const b = new Builder();
  b.add(cyl(0.02, 0.025, 0.5, 6), '#7a5233', { p: [-0.05, 0.25, 0] });
  b.add(box(0.35, 0.03, 0.03), '#7a5233', { p: [0, 0.5, 0] });
  b.add(blob(), '#5fb04a', { p: [-0.15, 0.6, 0.05], s: [0.08, 0.04, 0.06] }); // 葉っぱ
  b.add(blob(), '#22242c', { p: [0, 0.62, 0], s: [0.08, 0.12, 0.075], r: [0, 0, -0.3] });
  b.add(blob(), '#fff1a8', { p: [0.05, 0.69, 0], s: [0.035, 0.05, 0.06] });
  b.add(ball(0.055, 8, 6), '#22242c', { p: [0.04, 0.74, 0] });
  // 大きなくちばし（オレンジ＋先が黒）
  b.add(blob(), '#ff8f1f', { p: [0.16, 0.74, 0], s: [0.1, 0.035, 0.03] });
  b.add(blob(), '#f2c443', { p: [0.13, 0.765, 0], s: [0.07, 0.015, 0.025] });
  b.add(ball(0.018, 5, 4), '#22242c', { p: [0.255, 0.735, 0] });
  b.add(ball(0.018, 6, 4), '#3fb4e8', { p: [0.065, 0.75, 0.03] });
  eyes(b, 0.07, 0.755, 0.043, 0.009);
  b.add(box(0.12, 0.02, 0.05), '#22242c', { p: [-0.08, 0.5, 0], r: [0, 0, 1.2] }); // しっぽ
  return b.build();
}

function condor() {
  const b = new Builder();
  b.add(cone(0.3, 0.35, 6), '#8a7f72', { p: [0, 0.175, 0] }); // 岩山
  const a = bird(b, {
    body: '#26262c', wing: '#26262c', head: '#d88a7a', beak: '#e9e0cf', beakLen: 0.04, leg: '#5a5560', legH: 0.35, bl: 0.24, bh: 0.16, bw: 0.14, headR: 0.045,
    upright: 0.5,
  });
  b.add(blob(), '#fbfbf8', { p: [a.hx - 0.06, a.hy - 0.05, 0], s: [0.05, 0.03, 0.06] }); // 白いえりまき
  // 広げた大きなつばさ（両はしに白い羽）
  for (const s of [-1, 1]) {
    b.add(box(0.16, 0.012, 0.32), '#26262c', { p: [-0.02, 0.48, s * 0.22], r: [s * -0.25, 0, 0] });
    b.add(box(0.06, 0.013, 0.28), '#f2f0ea', { p: [-0.07, 0.475, s * 0.22], r: [s * -0.25, 0, 0] });
  }
  return b.build();
}

function booby() {
  const b = new Builder();
  const a = bird(b, {
    body: '#8a6a4f', belly: '#fbfbf8', head: '#e9dccb', wing: '#6e5440', beak: '#5a7aa0', beakLen: 0.07, leg: '#3fb4e8', legH: 0.12, bl: 0.2, bh: 0.15, bw: 0.13, headR: 0.05,
    upright: 0.6,
  });
  // 自慢の青い足（大きめ）
  for (const z of [-1, 1]) b.add(box(0.08, 0.025, 0.06), '#3fb4e8', { p: [0.04, 0.012, z * 0.04] });
  void a;
  return b.build();
}

function tortoise() {
  const b = new Builder();
  b.add(ball(0.26, 9, 5), '#5c6b3c', { p: [0, 0.1, 0], s: [1.15, 0.85, 1] });
  // こうらのもよう
  for (const [x, z] of [[0, 0], [0.12, 0.1], [-0.12, 0.1], [0.12, -0.1], [-0.12, -0.1]]) b.add(gem(0.07), '#6f7f48', { p: [x, 0.3 - Math.hypot(x, z) * 0.4, z], s: [1, 0.4, 1] });
  b.add(cyl(0.06, 0.07, 0.18, 6), '#8f8a78', { p: [0.28, 0.16, 0], r: [0, 0, -1.0] }); // 長い首
  b.add(ball(0.065, 7, 5), '#8f8a78', { p: [0.36, 0.22, 0] });
  eyes(b, 0.4, 0.24, 0.04, 0.01);
  for (const x of [-0.18, 0.18]) for (const z of [-0.18, 0.18]) b.add(cyl(0.05, 0.055, 0.12, 6), '#8f8a78', { p: [x, 0.06, z] });
  return b.build();
}

// =====================================================================
// オセアニア・極地・海
// =====================================================================

function kangaroo() {
  const b = new Builder();
  const c = '#c58552';
  b.add(box(0.26, 0.05, 0.06), c, { p: [0.06, 0.025, 0.07] });
  b.add(box(0.26, 0.05, 0.06), c, { p: [0.06, 0.025, -0.07] });
  b.add(blob(), c, { p: [-0.02, 0.13, 0], s: [0.12, 0.1, 0.13] }); // 太いもも
  b.add(blob(), c, { p: [0.03, 0.38, 0], s: [0.1, 0.2, 0.1], r: [0, 0, -0.25] });
  b.add(blob(), '#ecd2b4', { p: [0.08, 0.34, 0], s: [0.06, 0.14, 0.08], r: [0, 0, -0.25] }); // おなか（ポケット）
  b.add(blob(), c, { p: [0.15, 0.62, 0], s: [0.09, 0.06, 0.06] });
  b.add(ball(0.02, 5, 4), NOSE, { p: [0.24, 0.62, 0] });
  eyes(b, 0.17, 0.645, 0.04, 0.012);
  for (const s of [-1, 1]) {
    b.add(cone(0.025, 0.1, 5), c, { p: [0.11, 0.71, s * 0.035], r: [s * 0.2, 0, 0.2] });
    b.add(cyl(0.015, 0.018, 0.12, 5), c, { p: [0.15, 0.4, s * 0.07], r: [0, 0, 0.8] }); // 小さな手
  }
  seg(b, [-0.06, 0.16, 0], [-0.5, 0.02, 0], 0.055, 0.018, c, 7); // 太いしっぽ（体をささえる）
  // ポケットから顔を出す赤ちゃん
  b.add(ball(0.035, 6, 5), c, { p: [0.14, 0.4, 0] });
  eyes(b, 0.165, 0.41, 0.015, 0.006);
  return b.build();
}

function koala() {
  const b = new Builder();
  const g = '#9da3a9';
  b.add(cyl(0.06, 0.08, 1.0, 7), '#e6ddd0', { p: [-0.12, 0.5, 0] }); // ユーカリの木
  b.add(gem(0.2), '#6aa86a', { p: [-0.12, 1.05, 0] });
  b.add(gem(0.14), '#7fbf7f', { p: [-0.02, 0.95, 0.12] });
  b.add(blob(), g, { p: [0.02, 0.46, 0], s: [0.13, 0.17, 0.13] });
  b.add(blob(), '#e9eaec', { p: [0.08, 0.44, 0], s: [0.07, 0.12, 0.1] });
  b.add(ball(0.12, 9, 7), g, { p: [0.06, 0.68, 0] });
  for (const s of [-1, 1]) {
    b.add(ball(0.07, 7, 5), g, { p: [0.03, 0.76, s * 0.12], s: [0.5, 1, 1] }); // ふわふわの大きな耳
    b.add(ball(0.05, 6, 4), '#eef0f2', { p: [0.045, 0.76, s * 0.12], s: [0.4, 1, 1] });
    b.add(cyl(0.025, 0.03, 0.16, 5), g, { p: [-0.04, 0.55, s * 0.1], r: [s * 0.3, 0, 1.2] }); // 木にしがみつくうで
  }
  b.add(blob(), '#2c2c34', { p: [0.17, 0.66, 0], s: [0.03, 0.045, 0.035] }); // 大きな黒い鼻
  eyes(b, 0.15, 0.71, 0.05, 0.012);
  return b.build();
}

function platypus() {
  const b = new Builder();
  const c = '#6b4a34';
  b.add(cyl(0.3, 0.3, 0.03, 14), '#4fb3e8', { p: [0, 0.015, 0] });
  b.add(blob(), c, { p: [0, 0.07, 0], s: [0.16, 0.06, 0.09] });
  b.add(ball(0.06, 8, 6), c, { p: [0.15, 0.08, 0] });
  b.add(blob(), '#3a3a42', { p: [0.25, 0.07, 0], s: [0.07, 0.015, 0.05] }); // カモのようなくちばし
  b.add(box(0.14, 0.02, 0.1), '#5a3e2c', { p: [-0.2, 0.05, 0] }); // ビーバーのようなしっぽ
  eyes(b, 0.18, 0.1, 0.045, 0.009);
  for (const s of [-1, 1]) for (const x of [0.08, -0.08]) b.add(box(0.05, 0.015, 0.05), '#3a3a42', { p: [x, 0.03, s * 0.09] });
  return b.build();
}

function kiwi() {
  const b = new Builder();
  const c = '#8a6a48';
  b.add(blob(), c, { p: [0, 0.16, 0], s: [0.13, 0.11, 0.1] });
  for (const [x, y, z] of [[0.05, 0.22, 0.05], [-0.06, 0.2, -0.06], [-0.08, 0.14, 0.07]]) b.add(gem(0.04), '#7a5a3a', { p: [x, y, z] });
  b.add(ball(0.05, 7, 5), c, { p: [0.12, 0.22, 0] });
  b.add(cyl(0.008, 0.014, 0.18, 5), '#e9dcc0', { p: [0.24, 0.15, 0], r: [0, 0, 2.2] }); // 長いくちばし
  eyes(b, 0.15, 0.24, 0.03, 0.008);
  for (const z of [-0.04, 0.04]) {
    b.add(cyl(0.012, 0.012, 0.08, 4), '#c9b49a', { p: [0, 0.04, z] });
    b.add(box(0.05, 0.01, 0.03), '#c9b49a', { p: [0.02, 0.005, z] });
  }
  return b.build();
}

function sheep() {
  const b = new Builder();
  const w = '#fbfaf5';
  for (const x of [0.1, -0.1]) for (const z of [0.06, -0.06]) b.add(cyl(0.02, 0.018, 0.18, 5), '#2a2a2f', { p: [x, 0.09, z] });
  for (const [x, y, z] of [[0, 0.28, 0], [0.1, 0.3, 0.07], [-0.1, 0.29, -0.06], [0.02, 0.36, -0.07], [-0.07, 0.35, 0.08], [0.12, 0.3, -0.07], [-0.13, 0.31, 0.05]])
    b.add(gem(0.12), w, { p: [x, y, z] });
  b.add(blob(), '#2a2a2f', { p: [0.22, 0.33, 0], s: [0.07, 0.06, 0.055] });
  for (const s of [-1, 1]) b.add(ball(0.03, 5, 4), '#2a2a2f', { p: [0.19, 0.36, s * 0.065], s: [0.5, 0.6, 1.2] });
  eyes(b, 0.25, 0.35, 0.035, 0.01);
  b.add(gem(0.05), w, { p: [0.18, 0.4, 0] });
  return b.build();
}

function penguin(emperor = false) {
  const b = new Builder();
  const k = '#22252f';
  b.add(blob(), k, { p: [0, 0.28, 0], s: [0.13, 0.27, 0.13] });
  b.add(blob(), '#fbfbf8', { p: [0.06, 0.26, 0], s: [0.085, 0.23, 0.11] });
  b.add(ball(0.09, 9, 7), k, { p: [0.02, 0.58, 0] });
  if (emperor) {
    for (const s of [-1, 1]) b.add(blob(), '#ffc93c', { p: [0.04, 0.53, s * 0.075], s: [0.03, 0.05, 0.02] }); // 首の黄色
    b.add(blob(), '#ffe7a0', { p: [0.08, 0.45, 0], s: [0.04, 0.05, 0.08] });
  } else {
    b.add(cyl(0.092, 0.092, 0.02, 10), '#fbfbf8', { p: [0.02, 0.5, 0] }); // 白いライン（マゼランペンギン）
  }
  b.add(cone(0.02, 0.08, 5), emperor ? '#ff9f43' : '#2a2a2f', { p: [0.13, 0.57, 0], r: [0, 0, -Math.PI / 2 - 0.2] });
  eyes(b, 0.085, 0.61, 0.045, 0.012);
  for (const s of [-1, 1]) {
    b.add(blob(), k, { p: [0, 0.32, s * 0.12], s: [0.04, 0.14, 0.02], r: [s * 0.25, 0, 0.1] });
    b.add(box(0.07, 0.02, 0.05), '#ff9f43', { p: [0.04, 0.01, s * 0.05] });
  }
  return b.build();
}

function polarBear() {
  return bear('#f4f1e8', '#e6e0d2', 1);
}

function whale() {
  const b = new Builder();
  const c = '#4f73a8';
  b.add(blob(), c, { p: [0, 0.06, 0], s: [0.5, 0.17, 0.24] });
  b.add(blob(), '#dce6f0', { p: [0.08, -0.01, 0], s: [0.42, 0.1, 0.2] });
  for (let i = 0; i < 4; i++) b.add(box(0.36, 0.006, 0.006), '#9fb4cc', { p: [0.15, -0.06, (i - 1.5) * 0.04] }); // おなかのすじ
  seg(b, [-0.4, 0.07, 0], [-0.74, 0.13, 0], 0.13, 0.035, c, 7);
  b.add(blob(), c, { p: [-0.8, 0.14, 0], s: [0.08, 0.016, 0.2], r: [0, 0, 0.2] }); // 尾びれ
  for (const s of [-1, 1]) b.add(blob(), c, { p: [0.15, -0.02, s * 0.25], s: [0.12, 0.015, 0.05], r: [0, s * 0.5, 0] }); // むなびれ
  eyes(b, 0.36, 0.06, 0.19, 0.016);
  // しおふき
  b.add(cone(0.05, 0.22, 6), '#e6f6ff', { p: [0.24, 0.33, 0] });
  for (const [x, y, z] of [[0.24, 0.45, 0.06], [0.2, 0.44, -0.06], [0.28, 0.42, 0]]) b.add(gem(0.05), '#e6f6ff', { p: [x, y, z] });
  return b.build();
}

/** 動物のモデルの一覧 */
export const ANIMAL_FACTORIES = {
  giraffe,
  elephant: () => elephant(1, true),
  asianElephant: () => elephant(0.85, false),
  lion,
  zebra,
  rhino,
  wildebeest,
  springbok,
  okapi,
  gorilla,
  lemur,
  crocodile,
  flamingo,
  panda,
  redPanda,
  tiger: () => tiger(),
  amurTiger: () => tiger('#e9a35a', 1.15),
  snowLeopard,
  snowMonkey,
  macaque,
  sikaDeer: () => deer('#b07a48', true),
  crane,
  peacock,
  waterBuffalo,
  komodo,
  orangutan,
  tapir,
  tarsier,
  takhi: () => horse('#c9a06a', '#2a2420'),
  camel: () => camel(1),
  bactrianCamel: () => camel(2),
  yak,
  cat,
  oryx,
  falcon,
  rooster,
  hedgehog,
  stork,
  wolf,
  lynx,
  cow,
  ibex,
  stBernard,
  owl,
  dolphin,
  puffin,
  moose,
  reindeer,
  beaver,
  bison,
  brownBear: () => bear('#7a4e2d', '#a8784f', 1),
  polarBear,
  eagle,
  axolotl,
  jaguar,
  capybara,
  llama,
  toucan,
  condor,
  booby,
  tortoise,
  kangaroo,
  koala,
  platypus,
  kiwi,
  sheep,
  penguin: () => penguin(true),
  magellanicPenguin: () => penguin(false),
  whale,
} satisfies Record<string, () => THREE.BufferGeometry>;
