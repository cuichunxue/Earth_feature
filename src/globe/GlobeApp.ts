import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { geoArea, geoCentroid, geoContains } from 'd3-geo';
import type { Country } from '../data/countries';
import { CountryTexture } from './countryTexture';
import { createAtmosphere, createEarth, EARTH_RADIUS } from './earth';
import { createStars } from './stars';
import { latLonToVector3, vector3ToLatLon } from './geo';

const MIN_DISTANCE = 1.12; // いちばん近づいたときのカメラ距離（地球の中心から）
const MAX_DISTANCE = 7;
const HOME_DISTANCE = 3.9;
const IDLE_SPIN_DELAY = 6000; // さわらなくなってから自動回転を再開するまで(ms)

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
 * シーン・カメラ・操作（回転/ズーム）・タップで国を選ぶ処理をまとめています。
 */
export class GlobeApp {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;

  /** 国がタップされたとき（海なら null）に呼ばれる */
  onCountrySelected: (country: Country | null) => void = () => {};

  private texture!: CountryTexture;
  private earth!: THREE.Mesh;
  private pickSphere = new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS, 64, 32));
  private stars = createStars();
  private countries: Country[] = [];
  private timer = new THREE.Timer();
  private tween: CameraTween | null = null;
  private lastInteraction = 0;
  private spinEnabled = true;
  private selected: Country | null = null;

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(40, 1, 0.01, 500);
    this.camera.position.set(0, 0.9, HOME_DISTANCE);
    this.scene.add(this.camera);
    this.scene.background = new THREE.Color('#05061a');

    // ライト：全体をやさしく照らす光 ＋ カメラについてくる光（いつも見ている面が明るい）
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#6a7aaa', 1.9));
    const sun = new THREE.DirectionalLight('#fff6e0', 2.1);
    sun.position.set(-2, 2, 3);
    this.camera.add(sun);

    this.controls = new OrbitControls(this.camera, canvas);
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
    this.renderer.setAnimationLoop(() => this.tick());
  }

  // ---------- 公開している操作（ボタンから呼ぶ） ----------

  zoomBy(factor: number) {
    const dist = this.camera.position.length();
    this.animateCamera(this.camera.position.clone(), THREE.MathUtils.clamp(dist * factor, MIN_DISTANCE, MAX_DISTANCE), 450);
  }

  goHome() {
    this.select(null);
    const dir = this.camera.position.clone().setY(0).normalize();
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
    const [lon, lat] = geoCentroid(country.feature);
    // 国の面積から「ちょうどよく見える距離」を決める
    const size = Math.sqrt(geoArea(country.feature));
    const dist = THREE.MathUtils.clamp(1 + size * 2.6, 1.35, 3);
    this.animateCamera(latLonToVector3(lat, lon), dist, 1400);
  }

  // ---------- 内部の処理 ----------

  private select(country: Country | null) {
    if (country === this.selected) return;
    this.selected = country;
    this.texture?.highlight(country);
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
      fromDir: this.camera.position.clone().normalize(),
      toDir: toDir.clone().normalize(),
      fromDist: this.camera.position.length(),
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
    // 遠くの国へ飛ぶときは、途中で少し引いて「ジャンプ」っぽくする
    const hop = Math.sin(Math.PI * t) * tw.fromDir.angleTo(tw.toDir) * 0.6;
    const dist = THREE.MathUtils.lerp(tw.fromDist, tw.toDist, t) + hop;
    this.camera.position.copy(dir.multiplyScalar(dist));
    this.camera.lookAt(0, 0, 0);
    if (raw >= 1) {
      this.tween = null;
      this.lastInteraction = performance.now();
    }
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
    const hit = ray.intersectObject(this.pickSphere)[0];
    if (!hit) return;
    const { lat, lon } = vector3ToLatLon(hit.point);
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
    this.camera.updateProjectionMatrix();
  }

  private tick() {
    const now = performance.now();
    const dist = this.camera.position.length();

    // 近づくほどゆっくり回る（ズームしたときに国が飛んでいかないように）
    const altitude = (dist - EARTH_RADIUS) / (HOME_DISTANCE - EARTH_RADIUS);
    this.controls.rotateSpeed = THREE.MathUtils.clamp(altitude, 0.04, 1) * 0.9;
    this.controls.autoRotateSpeed = THREE.MathUtils.clamp(altitude, 0.05, 1) * 0.6;

    if (this.spinEnabled && !this.tween && !this.controls.autoRotate && now - this.lastInteraction > IDLE_SPIN_DELAY) {
      this.controls.autoRotate = true;
    }

    if (this.tween) this.updateTween(now);
    else this.controls.update();

    this.timer.update();
    this.stars.update(this.timer.getElapsed());
    this.renderer.render(this.scene, this.camera);
  }
}
