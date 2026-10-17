import * as THREE from 'three';
import { geoInterpolate } from 'd3-geo';
import { MODEL_FACTORIES } from './models';
import { latLonToVector3 } from './geo';

/**
 * 地球を「生きている」ように見せる、動くものたち。
 *  - 雲：ゆっくり流れる。近づくとすっと消える
 *  - 飛行機：本当にある大都市の間を、大円（いちばん近い道）にそって飛ぶ
 *  - 船：海の航路を行ったり来たり
 *  - 気球：トルコ・カッパドキアの空にふわふわ
 */

type LonLat = [number, number];

// 飛行機の路線（[経度, 緯度]）
const FLIGHTS: [LonLat, LonLat, number][] = [
  [[139.78, 35.55], [-118.41, 33.94], 38], // 東京 → ロサンゼルス
  [[-0.45, 51.47], [-73.78, 40.64], 30], // ロンドン → ニューヨーク
  [[55.36, 25.25], [151.18, -33.94], 40], // ドバイ → シドニー
  [[2.55, 49.01], [31.4, 30.12], 26], // パリ → カイロ
  [[116.6, 40.08], [37.41, 55.97], 32], // 北京 → モスクワ
  [[-46.47, -23.43], [3.32, 6.58], 34], // サンパウロ → ラゴス
  [[126.45, 37.46], [103.99, 1.36], 28], // ソウル → シンガポール
  [[-79.63, 43.68], [-99.07, 19.44], 24], // トロント → メキシコシティ
];

// 船の航路（海の上だけを通る点をつないだもの）
const SEA_ROUTES: { pts: LonLat[]; seconds: number }[] = [
  { pts: [[145, 35], [180, 33], [-160, 30], [-125, 33]], seconds: 120 }, // 太平洋
  { pts: [[-65, 40], [-40, 42], [-15, 40]], seconds: 90 }, // 大西洋
  { pts: [[80, 5], [70, -5], [60, -20], [45, -32]], seconds: 100 }, // インド洋
  { pts: [[5, 38], [15, 35.5], [25, 34]], seconds: 60 }, // 地中海
  { pts: [[-40, -30], [0, -33], [15, -36]], seconds: 90 }, // 南大西洋
  { pts: [[110, 15], [118, 10], [125, 18], [132, 30]], seconds: 80 }, // 南シナ海
];

const BALLOONS: LonLat[] = [
  [34.83, 38.65],
  [34.95, 38.6],
  [34.75, 38.55],
];

interface Mover {
  /** 時間 t（秒）での [位置の点, 向き(前), 高さ] を返す */
  at(t: number): { lon: number; lat: number; ahead: LonLat; alt: number };
}

export class LifeLayer {
  readonly group = new THREE.Group();
  private clouds: THREE.InstancedMesh;
  private cloudBase: THREE.Matrix4[] = [];
  private cloudMaterial: THREE.MeshStandardMaterial;
  private planes: THREE.InstancedMesh;
  private ships: THREE.InstancedMesh;
  private balloons: THREE.InstancedMesh;
  private planeMovers: Mover[];
  private shipMovers: Mover[];

  constructor() {
    const solid = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 });

    // ---- 雲 ----
    this.cloudMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 1,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const cloudCount = 30;
    this.clouds = new THREE.InstancedMesh(MODEL_FACTORIES.cloud(), this.cloudMaterial, cloudCount);
    let seed = 11;
    const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const Y = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < cloudCount; i++) {
      // 赤道付近と、中緯度（偏西風の雲）に多め
      const band = rand() < 0.45 ? (rand() - 0.5) * 30 : (rand() < 0.5 ? 1 : -1) * (35 + rand() * 25);
      const n = latLonToVector3(band, rand() * 360 - 180);
      const q = new THREE.Quaternion().setFromUnitVectors(Y, n).multiply(new THREE.Quaternion().setFromAxisAngle(Y, rand() * 6.3));
      const s = 0.06 + rand() * 0.05;
      this.cloudBase.push(new THREE.Matrix4().compose(n.multiplyScalar(1.05 + rand() * 0.02), q, new THREE.Vector3(s * 1.5, s * 0.55, s)));
    }
    this.cloudBase.forEach((m, i) => this.clouds.setMatrixAt(i, m));
    this.clouds.renderOrder = 3;
    this.group.add(this.clouds);

    // ---- 飛行機 ----
    this.planeMovers = FLIGHTS.map(([a, b, seconds], i) => {
      const interp = geoInterpolate(a, b);
      return {
        at: (t: number) => {
          // 行って、帰って、をくり返す
          const phase = ((t / seconds + i * 0.37) % 2 + 2) % 2;
          const forward = phase < 1;
          const u = forward ? phase : 2 - phase;
          const du = forward ? 0.01 : -0.01;
          const [lon, lat] = interp(u);
          return { lon, lat, ahead: interp(THREE.MathUtils.clamp(u + du, 0, 1)) as LonLat, alt: 1.025 + Math.sin(Math.PI * u) * 0.03 };
        },
      };
    });
    this.planes = new THREE.InstancedMesh(MODEL_FACTORIES.airplane(), solid, this.planeMovers.length);
    this.group.add(this.planes);

    // ---- 船 ----
    this.shipMovers = SEA_ROUTES.map((route, i) => {
      const legs = route.pts.slice(1).map((p, j) => geoInterpolate(route.pts[j], p));
      const at = (u: number): LonLat => {
        const x = THREE.MathUtils.clamp(u, 0, 1) * legs.length;
        const j = Math.min(legs.length - 1, Math.floor(x));
        return legs[j](x - j) as LonLat;
      };
      return {
        at: (t: number) => {
          const phase = ((t / route.seconds + i * 0.29) % 2 + 2) % 2;
          const forward = phase < 1;
          const u = forward ? phase : 2 - phase;
          const [lon, lat] = at(u);
          return { lon, lat, ahead: at(u + (forward ? 0.004 : -0.004)), alt: 1.0005 };
        },
      };
    });
    this.ships = new THREE.InstancedMesh(MODEL_FACTORIES.ship(), solid, this.shipMovers.length);
    this.group.add(this.ships);

    // ---- 気球 ----
    this.balloons = new THREE.InstancedMesh(MODEL_FACTORIES.balloon(), solid, BALLOONS.length);
    this.group.add(this.balloons);

    for (const m of [this.clouds, this.planes, this.ships, this.balloons]) m.frustumCulled = false;
  }

  update(t: number, cameraDistance: number, grow: number) {
    // 雲：地球のまわりをゆっくり回る。近づくと消える（カメラが雲に入らないように）
    this.clouds.rotation.y = t * 0.006;
    const cloudFade = THREE.MathUtils.smoothstep(cameraDistance, 1.3, 1.75);
    this.cloudMaterial.opacity = 0.92 * cloudFade;
    this.clouds.visible = cloudFade > 0.01;

    const m = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const up = new THREE.Vector3();
    const ahead = new THREE.Vector3();
    const fwd = new THREE.Vector3();
    const side = new THREE.Vector3();
    const place = (mesh: THREE.InstancedMesh, movers: Mover[], size: number) => {
      movers.forEach((mv, i) => {
        const p = mv.at(t);
        latLonToVector3(p.lat, p.lon, p.alt, pos);
        up.copy(pos).normalize();
        latLonToVector3(p.ahead[1], p.ahead[0], p.alt, ahead);
        fwd.subVectors(ahead, pos);
        fwd.addScaledVector(up, -fwd.dot(up)).normalize();
        side.crossVectors(fwd, up).normalize();
        m.makeBasis(fwd, up, side).scale(new THREE.Vector3(size, size, size)).setPosition(pos);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
    };
    place(this.planes, this.planeMovers, 0.022 * grow);
    place(this.ships, this.shipMovers, 0.02 * grow);

    // 気球：ふわふわ上下に
    const Y = new THREE.Vector3(0, 1, 0);
    BALLOONS.forEach(([lon, lat], i) => {
      const alt = 1.02 + Math.sin(t * 0.8 + i * 2) * 0.004 + i * 0.004;
      latLonToVector3(lat, lon, alt, pos);
      const q = new THREE.Quaternion().setFromUnitVectors(Y, pos.clone().normalize());
      m.compose(pos, q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.016 * grow));
      this.balloons.setMatrixAt(i, m);
    });
    this.balloons.instanceMatrix.needsUpdate = true;
  }
}
