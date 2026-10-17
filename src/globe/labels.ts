import * as THREE from 'three';
import { latLonToVector3 } from './geo';

/**
 * 地面にペタッと書かれた文字（国名・首都名）。
 * 全部の文字を1枚の大きな画像（アトラス）にまとめて描き、1回の描画で全部表示します。
 * カメラの距離に合わせて、シェーダーの中でフワッと出たり消えたりします。
 */
export interface LabelSpec {
  text: string;
  lat: number;
  lon: number;
  /** 文字の高さ（地球の半径=1） */
  height: number;
  /** カメラがこの距離より近いときに表示 */
  showBelow: number;
  /** カメラがこの距離より近いと消える（大きすぎる文字をかくす） */
  hideBelow?: number;
  style: 'country' | 'capital' | 'sub' | 'emoji';
  /** 遠くで文字を大きくするときの中心（国名の下の人口は、国名と一緒に動くように） */
  anchorLat?: number;
  anchorLon?: number;
}

const FONT_PX = 56;
const PAD = 10;
const ATLAS_W = 2048;
const LIFT = 1.013;

export class LabelLayer {
  readonly mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(specs: LabelSpec[], fontFamily: string) {
    // ---- 1) 文字の大きさを測って、アトラスの中の置き場所を決める（棚づめ） ----
    const measure = document.createElement('canvas').getContext('2d')!;
    const font = (s: LabelSpec) => `800 ${s.style === 'country' ? FONT_PX : FONT_PX * 0.8}px ${fontFamily}`;
    const rowH = FONT_PX + PAD * 2;
    let x = 0;
    let y = 0;
    const rects = specs.map((s) => {
      measure.font = font(s);
      const w = Math.ceil(measure.measureText(s.text).width) + PAD * 2;
      if (x + w > ATLAS_W) {
        x = 0;
        y += rowH;
      }
      const r = { x, y, w, h: rowH };
      x += w;
      return r;
    });
    const atlasH = THREE.MathUtils.ceilPowerOfTwo(y + rowH);

    // ---- 2) アトラスに文字を描く（白い文字＋こい色のふち） ----
    const canvas = document.createElement('canvas');
    canvas.width = ATLAS_W;
    canvas.height = atlasH;
    const ctx = canvas.getContext('2d')!;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    specs.forEach((s, i) => {
      const r = rects[i];
      ctx.font = font(s);
      ctx.lineWidth = s.style === 'country' ? 10 : 7;
      ctx.strokeStyle = s.style === 'country' ? 'rgba(42,31,74,0.9)' : 'rgba(30,25,60,0.85)';
      ctx.fillStyle = s.style === 'capital' ? '#fff3b0' : s.style === 'sub' ? '#d9f1ff' : '#fffaf0';
      if (s.style === 'emoji') {
        // 絵文字はふちどりせず、うすい影だけつける
        ctx.shadowColor = 'rgba(20,15,40,0.55)';
        ctx.shadowBlur = 6;
        ctx.fillText(s.text, r.x + PAD, r.y + r.h / 2);
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      } else {
        ctx.strokeText(s.text, r.x + PAD, r.y + r.h / 2);
        ctx.fillText(s.text, r.x + PAD, r.y + r.h / 2);
      }
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    // ---- 3) 文字1つにつき四角形1枚を、地面に沿って置く ----
    const positions: number[] = [];
    const uvs: number[] = [];
    const show: number[] = [];
    const centers: number[] = [];
    const indices: number[] = [];
    const n = new THREE.Vector3();
    const east = new THREE.Vector3();
    const north = new THREE.Vector3();
    const center = new THREE.Vector3();
    const Y = new THREE.Vector3(0, 1, 0);
    const anchor = new THREE.Vector3();

    specs.forEach((s, i) => {
      const r = rects[i];
      latLonToVector3(s.lat, s.lon, 1, n);
      east.crossVectors(Y, n).normalize();
      if (east.lengthSq() < 0.5) east.set(1, 0, 0);
      north.crossVectors(n, east).normalize();
      const h = s.height;
      const w = (h * r.w) / r.h;
      center.copy(n).multiplyScalar(LIFT);
      if (s.anchorLat !== undefined && s.anchorLon !== undefined) latLonToVector3(s.anchorLat, s.anchorLon, LIFT, anchor);
      else anchor.copy(center);
      // 首都は「★」が首都の場所にくるように、左はしをそろえる
      const offset = s.style === 'capital' ? w / 2 - h * 0.3 : 0;
      const base = positions.length / 3;
      for (const [sx, sy] of [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ]) {
        const p = center
          .clone()
          .addScaledVector(east, (sx * w) / 2 + offset)
          .addScaledVector(north, (sy * h) / 2);
        positions.push(p.x, p.y, p.z);
        centers.push(anchor.x, anchor.y, anchor.z);
        uvs.push((r.x + (sx > 0 ? r.w : 0)) / ATLAS_W, 1 - (r.y + (sy > 0 ? 0 : r.h)) / atlasH);
        show.push(s.showBelow, s.hideBelow ?? 0);
      }
      indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('show', new THREE.Float32BufferAttribute(show, 2));
    geometry.setAttribute('center', new THREE.Float32BufferAttribute(centers, 3));
    geometry.setIndex(indices);

    this.material = new THREE.ShaderMaterial({
      uniforms: { map: { value: texture }, camDist: { value: 3 }, grow: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec2 show;
        attribute vec3 center;
        uniform float camDist;
        uniform float grow;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vUv = uv;
          float appear = 1.0 - smoothstep(show.x - 0.3, show.x, camDist);
          float tooBig = show.y > 0.0 ? smoothstep(show.y - 0.15, show.y, camDist) : 1.0;
          vAlpha = appear * tooBig;
          // 遠くから見ているときは文字を大きくして読みやすくする
          vec3 p = center + (position - center) * grow;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          if (vAlpha < 0.01) gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // 見えない文字は描かない
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D map;
        varying vec2 vUv;
        varying float vAlpha;
        void main() {
          vec4 c = texture2D(map, vUv);
          if (c.a * vAlpha < 0.02) discard;
          gl_FragColor = vec4(c.rgb, c.a * vAlpha);
          #include <colorspace_fragment>
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.renderOrder = 2;
  }

  update(cameraDistance: number, grow: number) {
    this.material.uniforms.camDist.value = cameraDistance;
    this.material.uniforms.grow.value = grow;
  }

  dispose() {
    this.mesh.geometry.dispose();
    (this.material.uniforms.map.value as THREE.Texture).dispose();
    this.material.dispose();
  }
}
