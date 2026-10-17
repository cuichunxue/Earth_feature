import * as THREE from 'three';
import { geoBounds, geoEquirectangular, geoPath, geoGraticule10, type GeoPermissibleObjects } from 'd3-geo';
import type { Country } from '../data/countries';
import { BORDER_COLOR, COAST_COLOR, OCEAN_DEEP, OCEAN_MID, OCEAN_SHALLOW } from '../data/palette';

const DEG = Math.PI / 180;
/** 地球全体の絵の「1度あたりのピクセル数」の基準（幅4096のとき） */
const BASE_PX_PER_DEG = 4096 / 360;

/** 地図の一部分（経度・緯度の四角） */
interface MapWindow {
  centerLon: number;
  latMin: number;
  latMax: number;
  lonSpan: number;
}

/**
 * 地球の「色の絵」を Canvas に描いて、テクスチャとして球に貼ります。
 * - colorCanvas : 地球全体の絵（国ごとの色・海・国境線）
 * - detailCanvas: ズームしたときだけ、見ている場所のまわりを高い解像度で描き直した絵。
 *                 これで近づいても海岸線や国境がぼやけません。
 * - heightCanvas: 陸を白・海を黒にした高さ地図（陸がぷっくり盛り上がって見える）
 */
export class CountryTexture {
  readonly colorCanvas: HTMLCanvasElement;
  readonly heightCanvas: HTMLCanvasElement;
  readonly detailCanvas: HTMLCanvasElement;
  readonly colorTexture: THREE.CanvasTexture;
  readonly heightTexture: THREE.CanvasTexture;
  readonly detailTexture: THREE.CanvasTexture;
  /** シェーダーに渡す値：詳しい絵の位置（u最小, v最小, u幅, v幅）と、表示の強さ */
  readonly detailUniforms = {
    detailMap: { value: null as THREE.Texture | null },
    detailRect: { value: new THREE.Vector4(0, 0, 1, 1) },
    detailMix: { value: 0 },
    time: { value: 0 },
  };

  private baseImage: HTMLCanvasElement;
  private width: number;
  private height: number;
  private bounds: [[number, number], [number, number]][];
  private selected: Country | null = null;
  private detailWindow: MapWindow | null = null;
  private lastDetailDraw = 0;
  private lastFocus = new THREE.Vector2();

  constructor(private countries: Country[], maxTextureSize: number) {
    this.width = Math.min(4096, maxTextureSize);
    this.height = this.width / 2;
    this.bounds = countries.map((c) => geoBounds(c.feature));

    this.colorCanvas = makeCanvas(this.width, this.height);
    this.baseImage = makeCanvas(this.width, this.height);
    this.heightCanvas = makeCanvas(this.width / 2, this.height / 2);
    // スマホは少し小さめにして、描き直しを速くする
    const detailSize = Math.min(maxTextureSize, Math.min(window.innerWidth, window.innerHeight) < 600 ? 1536 : 2048);
    this.detailCanvas = makeCanvas(detailSize, detailSize);

    this.paint(this.baseImage.getContext('2d')!, { centerLon: 0, latMin: -90, latMax: 90, lonSpan: 360 }, null);
    this.drawHeight();
    this.compose();

    this.colorTexture = new THREE.CanvasTexture(this.colorCanvas);
    this.colorTexture.colorSpace = THREE.SRGBColorSpace;
    this.colorTexture.anisotropy = 8;
    this.heightTexture = new THREE.CanvasTexture(this.heightCanvas);
    this.detailTexture = new THREE.CanvasTexture(this.detailCanvas);
    this.detailTexture.colorSpace = THREE.SRGBColorSpace;
    this.detailTexture.anisotropy = 8;
    this.detailUniforms.detailMap.value = this.detailTexture;
  }

  /** 選んだ国をハイライトして描き直す（null で解除） */
  highlight(country: Country | null) {
    this.selected = country;
    this.compose();
    this.colorTexture.needsUpdate = true;
    if (this.detailWindow) this.drawDetail(this.detailWindow);
  }

  /**
   * 毎フレーム呼ぶ。カメラが近いときは、見ている場所のまわりの詳しい絵を用意する。
   * 重い処理なので、カメラがほぼ止まっていて、今の絵から外れたときだけ描き直す。
   */
  updateDetail(focusLat: number, focusLon: number, cameraDistance: number, dt: number) {
    const u = this.detailUniforms;
    const wanted = cameraDistance < 2.0;
    // フワッと切りかえる
    const target = wanted && this.detailWindow ? 1 : 0;
    u.detailMix.value += (target - u.detailMix.value) * Math.min(1, dt * 6);
    if (!wanted) return;

    const latSpan = THREE.MathUtils.clamp((cameraDistance - 1) * 115, 12, 70);
    const moving = Math.hypot(focusLat - this.lastFocus.x, wrapLon(focusLon - this.lastFocus.y)) > 0.08;
    this.lastFocus.set(focusLat, focusLon);

    const w = this.detailWindow;
    if (w) {
      const curSpan = w.latMax - w.latMin;
      const centerLat = (w.latMin + w.latMax) / 2;
      const offLat = Math.abs(focusLat - centerLat) / curSpan;
      const offLon = Math.abs(wrapLon(focusLon - w.centerLon)) / w.lonSpan;
      const ok = offLat < 0.22 && offLon < 0.22 && latSpan / curSpan > 0.7 && latSpan / curSpan < 1.3;
      if (ok) return;
    }
    const now = performance.now();
    if (moving || now - this.lastDetailDraw < 300) return;

    // 近いときはカメラが北を向いてかたむくので、少し北寄りに描く
    const centerLat = THREE.MathUtils.clamp(focusLat + latSpan * 0.12, -90 + latSpan / 2, 90 - latSpan / 2);
    const lonSpan = Math.min(360, latSpan / Math.max(0.25, Math.cos(centerLat * DEG)));
    this.drawDetail({ centerLon: focusLon, latMin: centerLat - latSpan / 2, latMax: centerLat + latSpan / 2, lonSpan });
    this.lastDetailDraw = performance.now();
  }

  private drawDetail(w: MapWindow) {
    this.detailWindow = w;
    this.paint(this.detailCanvas.getContext('2d')!, w, this.selected);
    this.detailTexture.needsUpdate = true;
    this.detailUniforms.detailRect.value.set(
      (w.centerLon - w.lonSpan / 2 + 180) / 360,
      (w.latMin + 90) / 180,
      w.lonSpan / 360,
      (w.latMax - w.latMin) / 180,
    );
  }

  /**
   * 地図を描く本体。地球全体（大きな絵）と、ズームしたときの一部分（詳しい絵）の両方で使う。
   * 経度・緯度を「ラジアン」で描き、canvas の変形でピクセルに直している。
   * 線の太さは、変形をもどしてから描くことでピクセル単位のままにしている。
   */
  private paint(ctx: CanvasRenderingContext2D, win: MapWindow, selected: Country | null) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const kx = W / (win.lonSpan * DEG);
    const ky = H / ((win.latMax - win.latMin) * DEG);
    const pxPerDeg = ky * DEG;
    const k = pxPerDeg / BASE_PX_PER_DEG; // 地球全体の絵とくらべて何倍細かいか
    const lineK = Math.min(k, 1.8); // 線は太くなりすぎないように

    const projection = geoEquirectangular()
      .rotate([-win.centerLon, 0])
      .scale(1)
      .translate([0, 0])
      .precision(0.001);
    const path = geoPath(projection, ctx);
    const transform = () => ctx.setTransform(kx, 0, 0, ky, (win.lonSpan * DEG * kx) / 2, win.latMax * DEG * ky);
    const reset = () => ctx.setTransform(1, 0, 0, 1, 0, 0);
    const visible = this.countries.filter((_, i) => intersects(this.bounds[i], win));
    const trace = (objects: GeoPermissibleObjects[]) => {
      ctx.beginPath();
      transform();
      for (const o of objects) path(o);
      reset();
    };
    const features = visible.map((c) => c.feature);

    // 1) 海：極に向かって少し濃くなるグラデーション（地球全体で同じ色になるよう緯度から計算）
    const latToY = (lat: number) => (win.latMax - lat) * pxPerDeg;
    const ocean = ctx.createLinearGradient(0, latToY(90), 0, latToY(-90));
    ocean.addColorStop(0, OCEAN_DEEP);
    ocean.addColorStop(0.5, OCEAN_MID);
    ocean.addColorStop(1, OCEAN_DEEP);
    reset();
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, W, H);

    // 2) 経緯線（うっすら）
    trace([geoGraticule10()]);
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.5 * lineK;
    ctx.stroke();

    // 3) 浅瀬：海岸のまわりに明るい水色をぼかして描く（重いので全部まとめて1回）
    ctx.save();
    ctx.filter = `blur(${Math.round(10 * Math.min(k, 3))}px)`;
    trace(features);
    ctx.strokeStyle = OCEAN_SHALLOW;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 22 * Math.min(k, 3);
    ctx.stroke();
    ctx.restore();

    // 4) 国の塗り
    for (const c of visible) {
      trace([c.feature]);
      ctx.fillStyle = c.color;
      ctx.fill();
    }

    // 5) 手ざわり感：ごく薄いノイズ
    addNoise(ctx, W, H, 10);

    // 6) 国境線
    trace(features);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 2.2 * lineK;
    ctx.stroke();

    // 7) 国境線の上に細い白線を重ねて、ぷっくりしたおもちゃっぽさを出す
    ctx.strokeStyle = COAST_COLOR;
    ctx.lineWidth = 1 * lineK;
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 8) 選んだ国のハイライト
    if (selected) {
      trace([selected.feature]);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3.5 * Math.min(k, 1.2);
      ctx.stroke();
    }
  }

  private projection(w: number, h: number) {
    return geoEquirectangular()
      .scale(w / (2 * Math.PI))
      .translate([w / 2, h / 2]);
  }

  private drawHeight() {
    const canvas = this.heightCanvas;
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext('2d')!;
    const path = geoPath(this.projection(w, h), ctx);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    // ぼかすことで海岸がなだらかな坂になる
    ctx.filter = `blur(${Math.max(1, Math.round(w / 1200))}px)`;
    ctx.fillStyle = '#9a9a9a';
    ctx.beginPath();
    for (const c of this.countries) path(c.feature);
    ctx.fill();

    // 大きな山脈を明るく（＝高く）描く
    const deg = w / 360;
    ctx.filter = `blur(${Math.round(deg * 1.2)}px)`;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const [width, line] of MOUNTAIN_RANGES) {
      ctx.beginPath();
      path({ type: 'LineString', coordinates: line });
      ctx.strokeStyle = 'rgba(110,110,110,1)';
      ctx.lineWidth = width * deg;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';

    // 陸地にだけ、でこぼこ（ノイズ）をかける
    const img = ctx.getImageData(0, 0, w, h);
    const noise = valueNoise(w, h);
    for (let i = 0, p = 0; i < img.data.length; i += 4, p++) {
      const v = img.data[i];
      if (v < 8) continue;
      const land = Math.min(1, v / 154);
      const out = v * (0.6 + 0.55 * noise[p] * land);
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.min(255, out);
    }
    ctx.putImageData(img, 0, 0);
  }

  /** 地球全体の絵に、選んだ国のハイライトを重ねる */
  private compose() {
    const ctx = this.colorCanvas.getContext('2d')!;
    ctx.drawImage(this.baseImage, 0, 0);
    if (!this.selected) return;
    const path = geoPath(this.projection(this.width, this.height), ctx);
    const px = this.width / 4096;
    ctx.beginPath();
    path(this.selected.feature);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4 * px;
    ctx.stroke();
  }
}

/** [太さ(度), [経度, 緯度]の線] — おもな山脈 */
const MOUNTAIN_RANGES: [number, [number, number][]][] = [
  [5, [[72, 36], [77, 34], [81, 30.5], [85, 28.5], [89, 28], [95, 29]]], // ヒマラヤ
  [9, [[80, 34], [88, 33], [97, 33]]], // チベット高原
  [3, [[-78, 8], [-77, 0], [-76, -9], [-71, -16], [-68, -22], [-69, -30], [-71, -38], [-72, -46], [-73, -51]]], // アンデス
  [4, [[-150, 62], [-130, 58], [-122, 52], [-114, 46], [-108, 40], [-106, 34]]], // ロッキー
  [2.5, [[5.8, 44.5], [7.5, 46], [10, 46.6], [13.5, 47]]], // アルプス
  [2, [[38, 43.5], [44, 42.3], [48, 41]]], // コーカサス
  [2, [[-8, 31], [-4, 32.5], [2, 34], [8, 35.5]]], // アトラス
  [2.5, [[146, -37], [149, -33], [151, -29], [147, -22]]], // グレートディヴァイディング
  [2, [[59, 51], [60, 60], [65, 67]]], // ウラル
  [2, [[37, -1], [36.5, -6], [33, -10]]], // 東アフリカの高地
  [2, [[69, 42], [75, 41.5], [80, 42]]], // 天山
  [2, [[136, 35.5], [138.5, 36], [140, 38], [140.5, 40]]], // 日本アルプス
];

/** なめらかなランダム模様（バリューノイズ）を3段重ねたもの。0〜1 の値を返す */
function valueNoise(w: number, h: number): Float32Array {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const out = new Float32Array(w * h);
  const octaves: [number, number][] = [
    [48, 0.5],
    [120, 0.3],
    [300, 0.2],
  ];
  for (const [cells, amp] of octaves) {
    const gw = cells;
    const gh = Math.ceil(cells / 2) + 1;
    const grid = new Float32Array(gw * gh);
    for (let i = 0; i < grid.length; i++) grid[i] = rand();
    for (let y = 0; y < h; y++) {
      const fy = (y / h) * (gh - 1);
      const y0 = Math.floor(fy);
      const ty = fy - y0;
      const sy = ty * ty * (3 - 2 * ty);
      for (let x = 0; x < w; x++) {
        const fx = (x / w) * gw;
        const x0 = Math.floor(fx) % gw;
        const x1 = (x0 + 1) % gw; // 東西はつながっている
        const tx = fx - Math.floor(fx);
        const sx = tx * tx * (3 - 2 * tx);
        const y1 = Math.min(gh - 1, y0 + 1);
        const a = grid[y0 * gw + x0] + (grid[y0 * gw + x1] - grid[y0 * gw + x0]) * sx;
        const b = grid[y1 * gw + x0] + (grid[y1 * gw + x1] - grid[y1 * gw + x0]) * sx;
        out[y * w + x] += (a + (b - a) * sy) * amp;
      }
    }
  }
  return out;
}

function wrapLon(d: number) {
  return ((((d + 180) % 360) + 360) % 360) - 180;
}

/** 国の範囲（geoBounds）が、描く四角とかさなるか */
function intersects([[w, s], [e, n]]: [[number, number], [number, number]], win: MapWindow) {
  if (n < win.latMin || s > win.latMax) return false;
  if (win.lonSpan >= 359) return true;
  const width = e >= w ? e - w : e + 360 - w; // 日付変更線をまたぐ国もある
  if (width > 300) return true;
  const center = w + width / 2;
  return Math.abs(wrapLon(center - win.centerLon)) <= (width + win.lonSpan) / 2 + 1;
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** 小さなノイズ画像を敷き詰めて、紙・粘土のような質感を足す */
function addNoise(ctx: CanvasRenderingContext2D, w: number, h: number, strength: number) {
  const tile = makeCanvas(256, 256);
  const tctx = tile.getContext('2d')!;
  const img = tctx.createImageData(256, 256);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() < 0.5 ? 0 : 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = Math.random() * strength;
  }
  tctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = ctx.createPattern(tile, 'repeat')!;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
