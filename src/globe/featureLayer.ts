import * as THREE from 'three';
import { ANIMALS, ANIMAL_SIZE, LANDMARKS, LANDMARK_SIZE, SCENERY, type FeatureSpot } from '../data/features';
import { MODEL_FACTORIES, type ModelKind } from './models';
import { latLonToVector3 } from './geo';

/** 再現できる乱数（毎回同じ場所に木や動物が並ぶように） */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

type Motion = 'fixed' | 'still' | 'wander' | 'waddle' | 'swim' | 'jump';

interface Placement {
  lat: number;
  lon: number;
  size: number;
  yaw: number;
  radius: number;
  spot: FeatureSpot | null;
  motion: Motion;
}

/** その場でじっとしている動物（木の上・水の中・止まり木など） */
const STILL = new Set<ModelKind>([
  'koala', 'snowMonkey', 'peacock', 'flamingo', 'falcon', 'stork', 'owl', 'eagle', 'condor', 'toucan', 'tarsier', 'axolotl', 'platypus', 'baobab',
]);
const WADDLE = new Set<ModelKind>(['penguin', 'magellanicPenguin', 'puffin']);
const SWIM = new Set<ModelKind>(['whale']);
const JUMP = new Set<ModelKind>(['dolphin', 'kangaroo', 'springbok']);
const OCEAN = new Set<ModelKind>(['whale', 'dolphin']);

interface Instance extends Placement {
  phase: number;
  speed: number;
  wanderR: number;
}

/**
 * ランドマーク・動物・木などを地球の上に並べるレイヤー。
 * 同じ種類のものは InstancedMesh でまとめて1回で描くので、数百個あっても軽い。
 * 動物はそれぞれのすみかのまわりを、ゆっくり歩き回る（向きも進む方向に変わる）。
 * 動物の足もとには、ふんわりしたかげを置いて「地面に立っている」感じを出す。
 */
export class FeatureLayer {
  readonly group = new THREE.Group();
  /** タップで調べられるメッシュ（景色の木などは含まない） */
  readonly pickables: THREE.InstancedMesh[] = [];
  private spotsByMesh = new Map<THREE.InstancedMesh, (FeatureSpot | null)[]>();
  private all: { mesh: THREE.InstancedMesh; items: Instance[]; moving: boolean }[] = [];
  private shadows: THREE.InstancedMesh;
  private shadowItems: Instance[] = [];
  private lastGrow = -1;

  constructor() {
    const rand = seeded(42);
    const byKind = new Map<ModelKind, Instance[]>();
    const push = (kind: ModelKind, p: Placement) => {
      if (!byKind.has(kind)) byKind.set(kind, []);
      const moving = p.motion !== 'fixed' && p.motion !== 'still';
      byKind.get(kind)!.push({
        ...p,
        phase: rand() * Math.PI * 2,
        speed: moving ? (0.05 + rand() * 0.05) * (rand() < 0.5 ? -1 : 1) * (p.motion === 'swim' ? 0.6 : 1) : 0,
        wanderR: p.motion === 'swim' ? 2.5 : 0.25 + rand() * 0.2,
      });
    };

    for (const s of LANDMARKS) {
      push(s.kind, { lat: s.lat, lon: s.lon, size: s.size ?? LANDMARK_SIZE, yaw: 0.6, radius: 1.004, spot: s, motion: 'fixed' });
    }
    for (const s of ANIMALS) {
      const n = s.count ?? 1;
      const motion: Motion = s.type !== 'animal' ? 'fixed' : STILL.has(s.kind) ? 'still' : WADDLE.has(s.kind) ? 'waddle' : SWIM.has(s.kind) ? 'swim' : JUMP.has(s.kind) ? 'jump' : 'wander';
      for (let i = 0; i < n; i++) {
        const jitter = n > 1 ? 1.6 : 0;
        push(s.kind, {
          lat: s.lat + (rand() - 0.5) * jitter,
          lon: s.lon + (rand() - 0.5) * jitter * 1.4,
          size: (s.size ?? ANIMAL_SIZE) * (0.85 + rand() * 0.3),
          yaw: rand() * Math.PI * 2,
          radius: OCEAN.has(s.kind) ? 0.999 : 1.005,
          spot: s,
          motion,
        });
      }
    }
    for (const c of SCENERY) {
      for (let i = 0; i < c.count; i++) {
        const r = Math.sqrt(rand()) * c.spread;
        const a = rand() * Math.PI * 2;
        const lat = c.lat + Math.sin(a) * r;
        push(c.kind, {
          lat,
          lon: c.lon + (Math.cos(a) * r) / Math.max(0.3, Math.cos(THREE.MathUtils.degToRad(lat))),
          size: c.size * (0.75 + rand() * 0.5),
          yaw: rand() * Math.PI * 2,
          radius: c.kind === 'iceberg' ? 0.999 : 1.004,
          spot: null,
          motion: 'fixed',
        });
      }
    }

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.75 });
    for (const [kind, items] of byKind) {
      const mesh = new THREE.InstancedMesh(MODEL_FACTORIES[kind](), material, items.length);
      mesh.name = kind;
      mesh.frustumCulled = false;
      this.group.add(mesh);
      const spots = items.map((p) => p.spot);
      if (spots.some(Boolean)) {
        this.pickables.push(mesh);
        this.spotsByMesh.set(mesh, spots);
      }
      this.all.push({ mesh, items, moving: items.some((p) => p.motion !== 'fixed') });
      for (const it of items) if (it.spot?.type === 'animal' && !OCEAN.has(kind)) this.shadowItems.push(it);
    }

    // 足もとのかげ（中心がこくて、まわりがふんわり）
    const shadowTex = makeShadowTexture();
    const shadowGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }),
      this.shadowItems.length,
    );
    this.shadows.frustumCulled = false;
    this.shadows.renderOrder = 1;
    this.group.add(this.shadows);
    this.update(0, 1);
  }

  spotFor(mesh: THREE.Object3D, instanceId: number): FeatureSpot | null {
    return this.spotsByMesh.get(mesh as THREE.InstancedMesh)?.[instanceId] ?? null;
  }

  /**
   * 毎フレームの更新。
   * grow: 遠くから見ているときは大きくして、宇宙からでもランドマークがわかるようにする
   */
  update(time: number, grow: number) {
    const growChanged = grow !== this.lastGrow;
    for (const a of this.all) {
      if (!a.moving && !growChanged) continue;
      a.items.forEach((it, i) => a.mesh.setMatrixAt(i, this.matrixFor(it, time, grow, false)));
      a.mesh.instanceMatrix.needsUpdate = true;
      a.mesh.boundingSphere = null; // タップ判定用に作り直してもらう
    }
    this.shadowItems.forEach((it, i) => this.shadows.setMatrixAt(i, this.matrixFor(it, time, grow, true)));
    this.shadows.instanceMatrix.needsUpdate = true;
    this.lastGrow = grow;
  }

  private tmp = {
    n: new THREE.Vector3(),
    east: new THREE.Vector3(),
    north: new THREE.Vector3(),
    fwd: new THREE.Vector3(),
    side: new THREE.Vector3(),
    m: new THREE.Matrix4(),
    roll: new THREE.Matrix4(),
  };

  /** 1匹ぶんの位置・向き・大きさ（shadow=true のときは足もとのかげ用） */
  private matrixFor(it: Instance, time: number, grow: number, shadow: boolean) {
    const { n, east, north, fwd, side, m, roll } = this.tmp;
    let lat = it.lat;
    let lon = it.lon;
    let heading = it.yaw;
    let lift = 0;
    let bob = 1;
    let rollAngle = 0;

    if (it.motion !== 'fixed' && it.motion !== 'still') {
      // すみかのまわりの円の上を、ゆっくり進む
      const th = it.phase + time * it.speed;
      lat += Math.sin(th) * it.wanderR;
      lon += (Math.cos(th) * it.wanderR) / Math.max(0.3, Math.cos(THREE.MathUtils.degToRad(it.lat)));
      // 進む向き（円の接線）。北から時計回りではなく、東を0とした角度
      heading = Math.atan2(Math.cos(th), -Math.sin(th)) + (it.speed < 0 ? Math.PI : 0);
    }
    if (it.motion === 'wander') bob = 1 + Math.max(0, Math.sin(time * 6 + it.phase)) * 0.04;
    if (it.motion === 'still' && it.spot?.type === 'animal') bob = 1 + Math.sin(time * 2 + it.phase) * 0.025;
    if (it.motion === 'waddle') rollAngle = Math.sin(time * 7 + it.phase) * 0.14;
    if (it.motion === 'jump') lift = Math.max(0, Math.sin(time * 3.2 + it.phase)) * it.size * (it.radius < 1 ? 1.2 : 0.6);
    if (it.motion === 'swim') lift = Math.sin(time * 0.8 + it.phase) * it.size * 0.08;

    latLonToVector3(lat, lon, 1, n);
    east.set(0, 1, 0).cross(n).normalize();
    if (east.lengthSq() < 0.5) east.set(1, 0, 0);
    north.crossVectors(n, east);
    // heading は「東を0、北を+90度」の角度
    fwd.copy(east).multiplyScalar(Math.cos(heading)).addScaledVector(north, Math.sin(heading));
    side.crossVectors(fwd, n);

    if (shadow) {
      const r = it.size * grow * 0.75;
      m.makeBasis(fwd.clone().multiplyScalar(r), n.clone().multiplyScalar(r), side.clone().multiplyScalar(r * 0.75));
      m.setPosition(n.x * (it.radius + 0.0003), n.y * (it.radius + 0.0003), n.z * (it.radius + 0.0003));
      return m;
    }
    const s = it.size * grow;
    m.makeBasis(fwd.clone().multiplyScalar(s), n.clone().multiplyScalar(s * bob), side.clone().multiplyScalar(s));
    if (rollAngle) m.multiply(roll.makeRotationX(rollAngle));
    const r = it.radius + lift;
    m.setPosition(n.x * r, n.y * r, n.z * r);
    return m;
  }
}

/** 中心がこく、ふちがふわっと消える丸いかげの画像 */
function makeShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(20,20,40,0.42)');
  g.addColorStop(0.55, 'rgba(20,20,40,0.22)');
  g.addColorStop(1, 'rgba(20,20,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
