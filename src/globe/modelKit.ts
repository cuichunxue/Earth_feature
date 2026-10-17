import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * モデル作りの道具箱。ローポリ（カクカクしたおもちゃっぽい）3Dモデルを、箱・円柱・球などの組み合わせで作ります。
 * どのモデルも「高さ約1・+X 方向が正面・地面が y=0」の大きさで作り、置くときに縮小します。
 * 色は頂点カラーとして1つの形に焼き込むので、1種類につき1回の描画で何百個でも描けます。
 */

export type V3 = [number, number, number];
interface Place {
  p?: V3; // 位置
  r?: V3; // 回転（ラジアン）
  s?: V3; // 拡大
  /**
   * 動かす部品の番号（動物用）。0 = 動かない、1〜4 = 足（右前・左前・右後ろ・左後ろ）、
   * 5 = しっぽ、6 = 頭と首。シェーダーの中で pivot（つけね）を中心に回して、歩く動きを作る。
   */
  part?: number;
  pivot?: V3;
}

/** 色の指定：1色、または [上の色, 下の色]（背中はこく、おなかは明るい…のようなグラデーション） */
export type Paint = string | [string, string];

export class Builder {
  private parts: THREE.BufferGeometry[] = [];
  /** 頂点ごとに色をほんの少しばらつかせる量（毛なみ・手ざわり感） */
  constructor(private noise = 0) {}

  add(geometry: THREE.BufferGeometry, paint: Paint, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], part = 0, pivot = [0, 0, 0] }: Place = {}) {
    const g = geometry.index ? geometry.toNonIndexed() : geometry;
    g.deleteAttribute('uv');
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(...p),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)),
        new THREE.Vector3(...s),
      ),
    );
    const pos = g.attributes.position;
    const count = pos.count;
    const colors = new Float32Array(count * 3);
    const top = new THREE.Color(Array.isArray(paint) ? paint[0] : paint);
    const bottom = new THREE.Color(Array.isArray(paint) ? paint[1] : paint);
    let minY = Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < count; i++) {
      minY = Math.min(minY, pos.getY(i));
      maxY = Math.max(maxY, pos.getY(i));
    }
    const c = new THREE.Color();
    // 同じ場所の頂点は同じ色になるように、位置からばらつきを決める（ひび割れのような線が出ないように）
    const hash = (x: number, y: number, z: number) => {
      const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
      return h - Math.floor(h);
    };
    for (let i = 0; i < count; i++) {
      const t = maxY > minY ? (pos.getY(i) - minY) / (maxY - minY) : 1;
      c.copy(bottom).lerp(top, t * t * (3 - 2 * t));
      if (this.noise) c.multiplyScalar(1 + (hash(pos.getX(i), pos.getY(i), pos.getZ(i)) - 0.5) * this.noise * 2);
      c.toArray(colors, i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    g.setAttribute('aPart', new THREE.BufferAttribute(new Float32Array(count).fill(part), 1));
    const piv = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) piv.set(pivot, i * 3);
    g.setAttribute('aPivot', new THREE.BufferAttribute(piv, 3));
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
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const cone = (r: number, h: number, seg = 8) => new THREE.ConeGeometry(r, h, seg);
export const ball = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
export const gem = (r: number) => new THREE.IcosahedronGeometry(r, 0);

export const Q = Math.PI / 4;
