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
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (const c of this.countries) path(c.feature);
    ctx.fill();
    ctx.filter = 'none';
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
