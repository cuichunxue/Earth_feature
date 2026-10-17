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
}

export class Builder {
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
export const box = (w: number, h: number, d: number) => new THREE.BoxGeometry(w, h, d);
export const cyl = (rt: number, rb: number, h: number, seg = 8) => new THREE.CylinderGeometry(rt, rb, h, seg);
export const cone = (r: number, h: number, seg = 8) => new THREE.ConeGeometry(r, h, seg);
export const ball = (r: number, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
export const gem = (r: number) => new THREE.IcosahedronGeometry(r, 0);

export const Q = Math.PI / 4;
