# 🌍 My Earth Toy

子ども向けのインタラクティブ3D地球儀（ブラウザで動く）。

## うごかし方

```bash
npm install      # 最初の1回だけ：必要な部品をダウンロード
npm run dev      # 開発用サーバーを起動 → 表示された http://localhost:5173 を開く
npm run build    # 公開用のファイルを dist/ に作る
```

`npm run dev` はスマホからも見られるように `--host` 付きで起動します。
同じWi‑Fiのスマホで、表示された `Network: http://192.168.x.x:5173` を開いてください。

## GitHub Pages で公開

`.github/workflows/deploy.yml` が、プッシュのたびに自動で組み立てて公開します。
最初に1回だけ、GitHub の **Settings → Pages → Build and deployment → Source** を
**「GitHub Actions」** に変えてください（「Deploy from a branch」のままだと、組み立て前のファイルが表示されて地球が出ません）。

## ファイル構成

```
index.html                 画面の骨組み（タイトル・ボタン・国名カード）
src/
  main.ts                  起動処理。ボタンや言語切り替えを地球につなぐ
  style.css                見た目（大きな丸ボタン・ポップなカード）
  i18n.ts                  日本語/英語/韓国語/中国語の文字
  data/
    countries.ts           国境データ読み込み・隣の国と違う色を割り当て・国名と国旗
    palette.ts             国の色・海の色
    countryInfo.ts         国のひみつカードの中身（首都・人口・ことば・あいさつ・食べもの・ひみつ）
    features.ts            ランドマーク・動物を置く場所と説明
  globe/
    GlobeApp.ts            3Dの本体：カメラ・回転/ズーム操作・タップで国を選ぶ・カメラ移動
    countryTexture.ts      Canvasに世界地図を描いて、地球に貼るテクスチャを作る
    earth.ts               地球の球体（陸がぷっくり盛り上がる）と大気の光
    stars.ts               またたく星空
    geo.ts                 緯度経度 ⇔ 3D座標 の変換
    modelKit.ts            3Dモデル作りの道具箱（箱・円柱・球をまとめて1つの形にする）
    models.ts              ランドマーク・景色・乗り物のローポリ3Dモデル
    animals.ts             動物のローポリ3Dモデル（約65種。目・2トーン・もようまで作りこみ）
    lifeLayer.ts           雲・飛行機・船・気球など、動くもの
    touchControls.ts       指でつかんで回す・はじく・ピンチでズームする操作
    featureLayer.ts        モデルを地球の上に並べる（InstancedMesh でまとめて描く）
    labels.ts              地面に書かれた国名・首都名
```

## 進み具合

- [x] 1. 基本の地球（国別カラー・なめらかな回転/ズーム・タップで国名）
- [x] 2. ズームレベルに応じた表示（国名・首都名が近づくと出る／近づくとカメラがかたむく）
- [x] 3. ランドマーク約40・動物約20種の配置＋情報カード（首都・人口・ことば・あいさつ・食べもの・ひみつ）
- [ ] 4. 乗り物システム
- [ ] 5. 動物図鑑・ステッカー
- [ ] 6. ゲーム（Where in the world? / クイズ）
- [ ] 7. 多言語対応とUI磨き込み
- [ ] 8. 進捗保存

## 開発用のページ

- `npm run dev` のあと `http://localhost:5173/dev/gallery.html` を開くと、動物のモデルを一覧で見比べられます
  （`?only=panda,koala&cols=2` のように、見たい動物だけにしぼれます）

## データの出典

- 国境: [Natural Earth](https://www.naturalearthdata.com/)（パブリックドメイン）を [world-atlas](https://github.com/topojson/world-atlas) 経由で使用
- 国名の翻訳: [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries)
