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

interface Placement {
  lat: number;
  lon: number;
  size: number;
  yaw: number;
  radius: number;
  spot: FeatureSpot | null;
}

/**
 * ランドマーク・動物・木などを地球の上に並べるレイヤー。
 * 同じ種類のものは InstancedMesh でまとめて1回で描くので、数百個あっても軽い。
 */
export class FeatureLayer {
  readonly group = new THREE.Group();
  /** タップで調べられるメッシュ（景色の木などは含まない） */
  readonly pickables: THREE.InstancedMesh[] = [];
  private spotsByMesh = new Map<THREE.InstancedMesh, (FeatureSpot | null)[]>();
  private all: { mesh: THREE.InstancedMesh; base: THREE.Matrix4[]; phase: number[]; bob: boolean }[] = [];

  constructor() {
    const rand = seeded(42);
    const byKind = new Map<ModelKind, Placement[]>();
    const push = (kind: ModelKind, p: Placement) => {
      if (!byKind.has(kind)) byKind.set(kind, []);
      byKind.get(kind)!.push(p);
    };

    for (const s of LANDMARKS) {
      push(s.kind, { lat: s.lat, lon: s.lon, size: s.size ?? LANDMARK_SIZE, yaw: 0.6, radius: 1.004, spot: s });
    }
    for (const s of ANIMALS) {
      const n = s.count ?? 1;
      const inOcean = s.kind === 'whale';
      for (let i = 0; i < n; i++) {
        const jitter = n > 1 ? 1.6 : 0;
        push(s.kind, {
          lat: s.lat + (rand() - 0.5) * jitter,
          lon: s.lon + (rand() - 0.5) * jitter * 1.4,
          size: (s.size ?? ANIMAL_SIZE) * (0.85 + rand() * 0.3),
          yaw: rand() * Math.PI * 2,
          radius: inOcean ? 0.999 : 1.004,
          spot: s,
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
        });
      }
    }

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.75 });
    const Y = new THREE.Vector3(0, 1, 0);
    const n = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const yawQ = new THREE.Quaternion();

    for (const [kind, list] of byKind) {
      const geometry = MODEL_FACTORIES[kind]();
      const mesh = new THREE.InstancedMesh(geometry, material, list.length);
      mesh.name = kind;
      const bases: THREE.Matrix4[] = [];
      list.forEach((p, i) => {
        latLonToVector3(p.lat, p.lon, 1, n);
        q.setFromUnitVectors(Y, n).multiply(yawQ.setFromAxisAngle(Y, p.yaw));
        const m = new THREE.Matrix4().compose(n.clone().multiplyScalar(p.radius), q, new THREE.Vector3(p.size, p.size, p.size));
        mesh.setMatrixAt(i, m);
        bases.push(m);
      });
      mesh.computeBoundingSphere();
      this.group.add(mesh);
      const spots = list.map((p) => p.spot);
      if (spots.some(Boolean)) {
        this.pickables.push(mesh);
        this.spotsByMesh.set(mesh, spots);
      }
      this.all.push({ mesh, base: bases, phase: list.map(() => rand() * Math.PI * 2), bob: list[0].spot?.type === 'animal' });
    }
  }

  spotFor(mesh: THREE.Object3D, instanceId: number): FeatureSpot | null {
    return this.spotsByMesh.get(mesh as THREE.InstancedMesh)?.[instanceId] ?? null;
  }

  /**
   * 毎フレームの更新。
   * grow: 遠くから見ているときは大きくして、宇宙からでもランドマークがわかるようにする
   * 動物は小さくぴょこぴょこ動く
   */
  update(time: number, grow: number) {
    const m = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    for (const a of this.all) {
      if (!a.bob && grow === this.lastGrow) continue;
      a.base.forEach((base, i) => {
        const s = a.bob ? 1 + Math.max(0, Math.sin(time * 3 + a.phase[i])) * 0.06 : 1;
        local.makeScale(grow, grow * s, grow);
        m.multiplyMatrices(base, local);
        a.mesh.setMatrixAt(i, m);
      });
      a.mesh.instanceMatrix.needsUpdate = true;
      a.mesh.boundingSphere = null; // タップ判定用に作り直してもらう
    }
    this.lastGrow = grow;
  }
  private lastGrow = -1;
}
