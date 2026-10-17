import * as THREE from 'three';
import { geoEquirectangular, geoPath, geoGraticule10 } from 'd3-geo';
import type { Country } from '../data/countries';
import { BORDER_COLOR, COAST_COLOR, OCEAN_DEEP, OCEAN_MID, OCEAN_SHALLOW } from '../data/palette';

/**
 * 地球の「色の絵」を Canvas に描いて、テクスチャとして球に貼ります。
 * - colorCanvas : 国ごとの色・海・国境線
 * - heightCanvas: 陸を白・海を黒にした高さ地図（陸がぷっくり盛り上がって見える）
 */
export class CountryTexture {
  readonly colorCanvas: HTMLCanvasElement;
  readonly heightCanvas: HTMLCanvasElement;
  readonly colorTexture: THREE.CanvasTexture;
  readonly heightTexture: THREE.CanvasTexture;

  private baseImage: HTMLCanvasElement;
  private width: number;
  private height: number;

  constructor(private countries: Country[], maxTextureSize: number) {
    this.width = Math.min(4096, maxTextureSize);
    this.height = this.width / 2;

    this.colorCanvas = makeCanvas(this.width, this.height);
    this.baseImage = makeCanvas(this.width, this.height);
    this.heightCanvas = makeCanvas(this.width / 2, this.height / 2);

    this.drawBase();
    this.drawHeight();
    this.compose(null);

    this.colorTexture = new THREE.CanvasTexture(this.colorCanvas);
    this.colorTexture.colorSpace = THREE.SRGBColorSpace;
    this.colorTexture.anisotropy = 8;
    this.heightTexture = new THREE.CanvasTexture(this.heightCanvas);
  }

  /** 選んだ国をハイライトして描き直す（null で解除） */
  highlight(country: Country | null) {
    this.compose(country);
    this.colorTexture.needsUpdate = true;
  }

  private projection(w: number, h: number) {
    return geoEquirectangular()
      .scale(w / (2 * Math.PI))
      .translate([w / 2, h / 2]);
  }

  private drawBase() {
    const { width: w, height: h } = this;
    const ctx = this.baseImage.getContext('2d')!;
    const path = geoPath(this.projection(w, h), ctx);
    const px = w / 4096; // 解像度に合わせて線の太さを調整

    // 1) 海：上下（極）に向かって少し濃くなるグラデーション
    const ocean = ctx.createLinearGradient(0, 0, 0, h);
    ocean.addColorStop(0, OCEAN_DEEP);
    ocean.addColorStop(0.5, OCEAN_MID);
    ocean.addColorStop(1, OCEAN_DEEP);
    ctx.fillStyle = ocean;
    ctx.fillRect(0, 0, w, h);

    // 2) 経緯線（うっすら）
    ctx.beginPath();
    path(geoGraticule10());
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1.5 * px;
    ctx.stroke();

    // 3) 浅瀬：海岸のまわりに明るい水色をぼかして描く
    //    （ぼかしは重い処理なので、全部の国をまとめて1回だけかける）
    ctx.save();
    ctx.filter = `blur(${Math.round(10 * px)}px)`;
    ctx.strokeStyle = OCEAN_SHALLOW;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 22 * px;
    ctx.beginPath();
    for (const c of this.countries) path(c.feature);
    ctx.stroke();
    ctx.restore();

    // 4) 国の塗り
    for (const c of this.countries) {
      ctx.beginPath();
      path(c.feature);
      ctx.fillStyle = c.color;
      ctx.fill();
    }

    // 5) 手ざわり感：ごく薄いノイズ
    addNoise(ctx, w, h, 10);

    // 6) 国境線
    ctx.lineJoin = 'round';
    ctx.strokeStyle = BORDER_COLOR;
    ctx.lineWidth = 2.2 * px;
    ctx.beginPath();
    for (const c of this.countries) path(c.feature);
    ctx.stroke();

    // 7) 国境線の上に細い白線を重ねて、ぷっくりしたおもちゃっぽさを出す
    ctx.strokeStyle = COAST_COLOR;
    ctx.lineWidth = 1 * px;
    ctx.globalAlpha = 0.35;
    ctx.stroke();
    ctx.globalAlpha = 1;
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

  private compose(selected: Country | null) {
    const ctx = this.colorCanvas.getContext('2d')!;
    ctx.drawImage(this.baseImage, 0, 0);
    if (!selected) return;

    const path = geoPath(this.projection(this.width, this.height), ctx);
    const px = this.width / 4096;
    ctx.beginPath();
    path(selected.feature);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6 * px;
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
