import * as THREE from 'three';
import { latLonToVector3, vector3ToLatLon } from './geo';

/**
 * スマホでも気持ちよく地球をさわるための操作。
 *  - 1本指ドラッグ：さわった場所が、指の下にずっとくっついたまま動く（つかんで回す感じ）
 *  - 指をはなすと、勢いのままスーッと回って止まる
 *  - 2本指ピンチ：ズーム（指の間の場所に向かって近づく）
 *  - マウスホイール：ズーム
 *
 * 位置は「見ている場所の緯度・経度」と「地球の中心からの距離」で持ち、rig（見えないカメラ）に書きこみます。
 */
export interface GeoPoint {
  lat: number;
  lon: number;
}

const MAX_LAT = 82;

export class GlobeTouchControls {
  lat = 20;
  lon = -80;
  distance = 3.9;
  minDistance = 1.1;
  maxDistance = 7;
  autoRotate = true;
  /** 自動回転の速さ（遠くから見ているときの、1秒あたりの度数） */
  autoRotateSpeed = 5;
  /** さわり始めたときに呼ばれる */
  onStart: () => void = () => {};

  private pointers = new Map<number, { x: number; y: number }>();
  private grabbed: GeoPoint | null = null;
  private pinchStart = 0;
  private pinchStartDistance = 0;
  private velocity = { lat: 0, lon: 0 };
  private dragging = false;
  private lastPixel = { x: 0, y: 0 };
  private pixelDelta = { x: 0, y: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private rig: THREE.Object3D,
    /** 画面の点 → 地球の上の緯度経度（地球に当たらなければ null） */
    private pick: (clientX: number, clientY: number) => GeoPoint | null,
  ) {
    canvas.addEventListener('pointerdown', this.onDown);
    canvas.addEventListener('pointermove', this.onMove);
    canvas.addEventListener('pointerup', this.onUp);
    canvas.addEventListener('pointercancel', this.onUp);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.apply();
  }

  get isInteracting() {
    return this.pointers.size > 0;
  }

  /** 別の動き（カメラが飛んでいくアニメーションなど）で rig が動いたあと、こちらの値を合わせる */
  syncFromRig() {
    const { lat, lon } = vector3ToLatLon(this.rig.position);
    this.lat = lat;
    this.lon = lon;
    this.distance = this.rig.position.length();
    this.velocity.lat = this.velocity.lon = 0;
  }

  stop() {
    this.velocity.lat = this.velocity.lon = 0;
  }

  update(dt: number) {
    dt = Math.min(dt, 0.05);
    const altitude = this.distance - 1;
    const prev = { lat: this.lat, lon: this.lon };

    if (this.dragging) {
      const p = this.focusPointer();
      const hit = p && this.grabbed ? this.pick(p.x, p.y) : null;
      if (hit && this.grabbed) {
        // つかんだ場所が、いま指の下にある場所と同じになるようにカメラを動かす
        this.lat += this.grabbed.lat - hit.lat;
        this.lon += wrap(this.grabbed.lon - hit.lon);
      } else {
        // 宇宙をさわっているときは、指が動いた分だけ回す
        const degPerPx = this.degreesPerPixel();
        this.lat += this.pixelDelta.y * degPerPx;
        this.lon -= (this.pixelDelta.x * degPerPx) / Math.max(0.3, Math.cos(THREE.MathUtils.degToRad(this.lat)));
      }
      this.pixelDelta.x = this.pixelDelta.y = 0;

      // ピンチズーム：指の間の広がりにあわせて高さを変える
      if (this.pointers.size === 2 && this.pinchStartDistance > 0) {
        const spread = this.spread();
        const alt = (this.pinchStart - 1) * (this.pinchStartDistance / Math.max(1, spread));
        this.distance = THREE.MathUtils.clamp(1 + alt, this.minDistance, this.maxDistance);
      }

      // 指をはなしたときの勢いを覚えておく（なめらかに平均）
      if (dt > 0) {
        const vLat = (this.lat - prev.lat) / dt;
        const vLon = wrap(this.lon - prev.lon) / dt;
        this.velocity.lat = this.velocity.lat * 0.6 + vLat * 0.4;
        this.velocity.lon = this.velocity.lon * 0.6 + vLon * 0.4;
      }
    } else {
      // 勢い（慣性）でスーッと回って、だんだん止まる
      const decay = Math.exp(-dt * 3.2);
      this.velocity.lat *= decay;
      this.velocity.lon *= decay;
      this.lat += this.velocity.lat * dt;
      this.lon += this.velocity.lon * dt;
      if (this.autoRotate) {
        this.lon -= this.autoRotateSpeed * dt * THREE.MathUtils.clamp(altitude / 2.9, 0.04, 1);
      }
    }

    this.lat = THREE.MathUtils.clamp(this.lat, -MAX_LAT, MAX_LAT);
    this.lon = wrap(this.lon);
    this.apply();
  }

  private apply() {
    latLonToVector3(this.lat, this.lon, this.distance, this.rig.position);
    this.rig.lookAt(0, 0, 0);
  }

  /** 宇宙をさわっているときの、1ピクセルあたりの回転（度） */
  private degreesPerPixel() {
    const h = this.canvas.clientHeight || window.innerHeight;
    const altitude = this.distance - 1;
    return (Math.min(altitude, 1.6) * 60) / h;
  }

  private focusPointer() {
    const pts = [...this.pointers.values()];
    if (!pts.length) return null;
    const x = pts.reduce((s, p) => s + p.x, 0) / pts.length;
    const y = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return { x, y };
  }

  private spread() {
    const [a, b] = [...this.pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  /** 指の数が変わったら、つかみ直す */
  private regrab() {
    const p = this.focusPointer();
    this.grabbed = p ? this.pick(p.x, p.y) : null;
    if (p) this.lastPixel = { ...p };
    this.pinchStart = this.distance;
    this.pinchStartDistance = this.pointers.size === 2 ? this.spread() : 0;
  }

  private onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this.canvas.setPointerCapture(e.pointerId);
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    this.dragging = true;
    this.velocity.lat = this.velocity.lon = 0;
    this.regrab();
    this.onStart();
  };

  private onMove = (e: PointerEvent) => {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    p.x = e.clientX;
    p.y = e.clientY;
    const f = this.focusPointer()!;
    this.pixelDelta.x += f.x - this.lastPixel.x;
    this.pixelDelta.y += f.y - this.lastPixel.y;
    this.lastPixel = { ...f };
  };

  private onUp = (e: PointerEvent) => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    if (this.pointers.size === 0) {
      this.dragging = false;
      this.grabbed = null;
      // ゆっくり指をはなしたときは止める（ピタッと止めたいときのため）
      const speed = Math.hypot(this.velocity.lat, this.velocity.lon);
      const altitude = this.distance - 1;
      if (speed < 4 * Math.min(1, altitude)) this.velocity.lat = this.velocity.lon = 0;
    } else {
      this.regrab();
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.onStart();
    const altitude = (this.distance - 1) * Math.exp(e.deltaY * 0.0015);
    this.distance = THREE.MathUtils.clamp(1 + altitude, this.minDistance, this.maxDistance);
    this.apply();
  };
}

function wrap(lon: number) {
  return ((((lon + 180) % 360) + 360) % 360) - 180;
}
