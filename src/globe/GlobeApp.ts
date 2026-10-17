import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geoContains } from 'd3-geo';
import type { Country } from '../data/countries';
import type { FeatureSpot } from '../data/features';
import { CountryTexture } from './countryTexture';
import { createAtmosphere, createEarth, EARTH_RADIUS } from './earth';
import { createStars } from './stars';
import { latLonToVector3, vector3ToLatLon } from './geo';
import { FeatureLayer } from './featureLayer';
import { LabelLayer, type LabelSpec } from './labels';

const MIN_DISTANCE = 1.1; // いちばん近づいたときのカメラ距離（地球の中心から）
const MAX_DISTANCE = 7;
const HOME_DISTANCE = 3.9;
const IDLE_SPIN_DELAY = 6000; // さわらなくなってから自動回転を再開するまで(ms)
const MAX_TILT = THREE.MathUtils.degToRad(46); // 近づいたときにカメラをかたむける角度

interface CameraTween {
  fromDir: THREE.Vector3;
  toDir: THREE.Vector3;
  fromDist: number;
  toDist: number;
  start: number;
  duration: number;
}

/**
 * 3D地球アプリの本体。
 * シーン・カメラ・操作（回転/ズーム）・タップで国やランドマークを選ぶ処理をまとめています。
 *
 * カメラは2つあります：
 *  - rig   : 指の操作（OrbitControls）で動く「見えないカメラ」。いつも地球の中心を向く。
 *  - camera: 実際に画面を写すカメラ。rig の位置をもとに、近づいたときは地平線の方へかたむけて
 *            「地面を見下ろす」ような景色にします。
 */
export class GlobeApp {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  private rig = new THREE.PerspectiveCamera();

  /** 国がタップされたとき（海なら null）に呼ばれる */
  onCountrySelected: (country: Country | null) => void = () => {};
  /** ランドマーク・動物がタップされたときに呼ばれる */
  onSpotSelected: (spot: FeatureSpot) => void = () => {};

  private texture!: CountryTexture;
  private earth!: THREE.Mesh;
  private features!: FeatureLayer;
  private labels: LabelLayer | null = null;
  private pickSphere = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 64, 32));
  private stars = createStars();
  private countries: Country[] = [];
  private timer = new THREE.Timer();
  private tween: CameraTween | null = null;
  private lastInteraction = 0;
  private spinEnabled = true;
  private selected: Country | null = null;
  private lastNorth = new THREE.Vector3(0, 0, -1);
  /** カードが出ているとき、地球の見える場所を少しずらす（0〜1、画面に対する割合） */
  private shift = new THREE.Vector2();
  private shiftTarget = new THREE.Vector2();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.005, 500);
    this.scene.add(this.camera);
    this.scene.background = new THREE.Color('#05061a');
    this.rig.position.set(0, 1.0, HOME_DISTANCE);

    // ライト：全体をやさしく照らす光 ＋ カメラについてくる光（いつも見ている面が明るい）
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#6a7aaa', 1.9));
    const sun = new THREE.DirectionalLight('#fff6e0', 2.1);
    sun.position.set(-2, 2, 3);
    this.camera.add(sun);

    this.controls = new OrbitControls(this.rig, canvas);
    this.controls.enableDamping = true; // 指を離してもスーッと回り続ける
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = MIN_DISTANCE;
    this.controls.maxDistance = MAX_DISTANCE;
    this.controls.zoomSpeed = 0.9;
    this.controls.autoRotate = true;
    this.controls.addEventListener('start', () => this.markInteraction());

    this.scene.add(this.stars.points);
    this.setupTapPicking();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  async init(countries: Country[]) {
    this.countries = countries;
    this.texture = new CountryTexture(countries, this.renderer.capabilities.maxTextureSize);
    this.earth = createEarth(this.texture);
    this.scene.add(this.earth);
    this.scene.add(createAtmosphere());
    this.features = new FeatureLayer();
    this.scene.add(this.features.group);
    this.renderer.setAnimationLoop(() => this.tick());
  }

  /** 国名・首都名を（言語が変わったら）作り直す */
  setLabels(specs: LabelSpec[], fontFamily: string) {
    if (this.labels) {
      this.scene.remove(this.labels.mesh);
      this.labels.dispose();
    }
    this.labels = new LabelLayer(specs, fontFamily);
    this.scene.add(this.labels.mesh);
  }

  // ---------- 公開している操作（ボタンから呼ぶ） ----------

  zoomBy(factor: number) {
    const dist = this.rig.position.length();
    this.animateCamera(this.rig.position.clone(), THREE.MathUtils.clamp(dist * factor, MIN_DISTANCE, MAX_DISTANCE), 450);
  }

  goHome() {
    this.select(null);
    const dir = this.rig.position.clone().setY(0).normalize();
    dir.y = 0.28;
    this.animateCamera(dir, HOME_DISTANCE, 1200);
  }

  setSpin(on: boolean) {
    this.spinEnabled = on;
    this.controls.autoRotate = on;
  }

  get isSpinning() {
    return this.spinEnabled;
  }

  /** 国を選ぶ：ハイライトして、その国までカメラが飛んでいく */
  flyToCountry(country: Country) {
    this.select(country);
    // 国の面積から「ちょうどよく見える距離」を決める
    const dist = THREE.MathUtils.clamp(1.25 + Math.sqrt(country.area) * 3.2, 1.45, 3.2);
    this.animateCamera(latLonToVector3(country.labelLat, country.labelLon), dist, 1400);
  }

  /** ランドマーク・動物のところまで、ぐっと近づく */
  flyToSpot(spot: FeatureSpot) {
    this.animateCamera(latLonToVector3(spot.lat, spot.lon), 1.17, 1500);
  }

  /**
   * カードで画面の一部がかくれるとき、見たい場所がかくれないように画面の中心をずらす。
   * x: 右にカードがあるとき（0.0〜0.5）、y: 下にカードがあるとき（0.0〜0.5）
   */
  setFocusShift(x: number, y: number) {
    this.shiftTarget.set(x, y);
  }

  countryByCode(alpha2: string) {
    return this.countries.find((c) => c.alpha2 === alpha2) ?? null;
  }

  // ---------- 内部の処理 ----------

  private select(country: Country | null) {
    if (country !== this.selected) {
      this.selected = country;
      this.texture?.highlight(country);
    }
    this.onCountrySelected(country);
  }

  private markInteraction() {
    this.lastInteraction = performance.now();
    this.controls.autoRotate = false;
    this.tween = null;
  }

  private animateCamera(toDir: THREE.Vector3, toDist: number, duration: number) {
    this.markInteraction();
    this.tween = {
      fromDir: this.rig.position.clone().normalize(),
      toDir: toDir.clone().normalize(),
      fromDist: this.rig.position.length(),
      toDist,
      start: performance.now(),
      duration,
    };
  }

  private updateTween(now: number) {
    const tw = this.tween;
    if (!tw) return;
    const raw = Math.min(1, (now - tw.start) / tw.duration);
    const t = raw < 0.5 ? 4 * raw * raw * raw : 1 - Math.pow(-2 * raw + 2, 3) / 2; // easeInOutCubic
    const q = new THREE.Quaternion().setFromUnitVectors(tw.fromDir, tw.toDir);
    const dir = tw.fromDir.clone().applyQuaternion(new THREE.Quaternion().slerp(q, t));
    // 遠くへ飛ぶときは、途中で少し引いて「ジャンプ」っぽくする
    const hop = Math.sin(Math.PI * t) * tw.fromDir.angleTo(tw.toDir) * 0.6;
    const dist = THREE.MathUtils.lerp(tw.fromDist, tw.toDist, t) + hop;
    this.rig.position.copy(dir.multiplyScalar(dist));
    this.rig.lookAt(0, 0, 0);
    if (raw >= 1) {
      this.tween = null;
      this.lastInteraction = performance.now();
    }
  }

  /** rig の位置から、実際のカメラの位置と向きを決める（近いほど地平線の方を向く） */
  private placeCamera() {
    const n = this.rig.position.clone().normalize();
    const dist = this.rig.position.length();
    const altitude = dist - EARTH_RADIUS;
    const tilt = MAX_TILT * smoothstep(2.1, MIN_DISTANCE, dist);

    // 「北」の向き（画面の上方向）。極の真上では前回の向きを使う
    const north = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y);
    if (north.lengthSq() > 1e-4) this.lastNorth.copy(north.normalize());
    else north.copy(this.lastNorth);

    const focus = n.clone().multiplyScalar(EARTH_RADIUS);
    this.camera.position
      .copy(focus)
      .addScaledVector(n, altitude * Math.cos(tilt))
      .addScaledVector(north, -altitude * Math.sin(tilt));
    this.camera.up.copy(north).multiplyScalar(Math.cos(tilt)).addScaledVector(n, Math.sin(tilt));
    this.camera.lookAt(focus);
  }

  private setupTapPicking() {
    // 「ドラッグ」と「タップ」を区別する：あまり動かさず短く押したらタップ
    let downX = 0;
    let downY = 0;
    let downTime = 0;
    let pointers = 0;
    let multiTouch = false;
    this.canvas.addEventListener('pointerdown', (e) => {
      pointers++;
      if (pointers > 1) multiTouch = true;
      if (pointers === 1) {
        multiTouch = false;
        downX = e.clientX;
        downY = e.clientY;
        downTime = performance.now();
      }
    });
    const up = (e: PointerEvent) => {
      pointers = Math.max(0, pointers - 1);
      if (pointers > 0 || multiTouch) return;
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY);
      if (moved < 8 && performance.now() - downTime < 450) this.handleTap(e.clientX, e.clientY);
    };
    this.canvas.addEventListener('pointerup', up);
    this.canvas.addEventListener('pointercancel', () => (pointers = Math.max(0, pointers - 1)));
  }

  private handleTap(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);

    // 1) ランドマーク・動物に当たったか？（地球より手前にあるものだけ）
    const ground = ray.intersectObject(this.pickSphere)[0];
    const hit = ray.intersectObjects(this.features.pickables, false)[0];
    if (hit && hit.instanceId !== undefined && (!ground || hit.distance <= ground.distance + 0.02)) {
      const spot = this.features.spotFor(hit.object, hit.instanceId);
      if (spot) {
        const country = spot.country ? this.countryByCode(spot.country) : null;
        if (country) this.select(country);
        this.onSpotSelected(spot);
        return;
      }
    }

    // 2) 国に当たったか？
    if (!ground) return;
    const { lat, lon } = vector3ToLatLon(ground.point);
    const country = this.countries.find((c) => geoContains(c.feature, [lon, lat])) ?? null;
    if (country) this.flyToCountry(country);
    else this.select(null);
  }

  private resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // 縦長の画面（スマホ）では少し引いて、地球が画面からはみ出さないようにする
    this.camera.fov = w < h ? 55 : 40;
    this.applyShift();
  }

  private applyShift() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this.shift.lengthSq() < 1e-6) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, (w * this.shift.x) / 2, (h * this.shift.y) / 2, w, h);
    this.camera.updateProjectionMatrix();
  }

  private tick() {
    const now = performance.now();
    const dist = this.rig.position.length();

    // 近づくほどゆっくり回る（ズームしたときに国が飛んでいかないように）
    const altitude = (dist - EARTH_RADIUS) / (HOME_DISTANCE - EARTH_RADIUS);
    this.controls.rotateSpeed = THREE.MathUtils.clamp(altitude, 0.03, 1) * 0.9;
    this.controls.autoRotateSpeed = THREE.MathUtils.clamp(altitude, 0.05, 1) * 0.6;

    if (this.spinEnabled && !this.tween && !this.controls.autoRotate && now - this.lastInteraction > IDLE_SPIN_DELAY) {
      this.controls.autoRotate = true;
    }

    if (this.tween) this.updateTween(now);
    else this.controls.update();
    this.placeCamera();

    if (this.shift.distanceToSquared(this.shiftTarget) > 1e-7) {
      this.shift.lerp(this.shiftTarget, 0.12);
      this.applyShift();
    }

    this.timer.update();
    const t = this.timer.getElapsed();
    this.stars.update(t);
    const far = smoothstep(1.35, HOME_DISTANCE, dist);
    this.features.update(t, Math.round((1 + far * 1.4) * 100) / 100);
    this.labels?.update(dist, 1 + far * 0.9);
    this.renderer.render(this.scene, this.camera);
  }
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}
