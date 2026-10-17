import type { ModelKind } from '../globe/models';
import type { L } from './text';

/**
 * 地球の上に置くランドマーク・動物のリスト。
 * country は ISO 2文字コード（国の情報カードと結びつけるため）。
 * size は地球の半径を1としたときの大きさ（本物よりかなり大きく、おもちゃサイズにしています）。
 */
export interface FeatureSpot {
  kind: ModelKind;
  type: 'landmark' | 'animal';
  emoji: string;
  name: L;
  fact: L;
  country: string;
  lat: number;
  lon: number;
  size?: number;
  /** 動物の群れの数（まわりに少しずらして置く） */
  count?: number;
}

export const LANDMARK_SIZE = 0.042;
export const ANIMAL_SIZE = 0.024;

export const LANDMARKS: FeatureSpot[] = [
  // ---- アジア ----
  { kind: 'fuji', type: 'landmark', emoji: '🗻', country: 'JP', lat: 35.36, lon: 138.73, size: 0.05,
    name: { ja: '富士山', en: 'Mount Fuji' },
    fact: { ja: '高さ3776m。日本でいちばん高い山で、じつは火山なんだ。', en: '3,776 m tall — the highest mountain in Japan, and it is a volcano!' } },
  { kind: 'tokyoTower', type: 'landmark', emoji: '🗼', country: 'JP', lat: 35.66, lon: 139.75,
    name: { ja: '東京タワー', en: 'Tokyo Tower' },
    fact: { ja: '1958年にできた高さ333mの赤と白のタワー。', en: 'A 333 m red-and-white tower built in 1958.' } },
  { kind: 'pagoda', type: 'landmark', emoji: '🏯', country: 'JP', lat: 34.98, lon: 135.75,
    name: { ja: '京都の五重塔', en: 'Five-story Pagoda, Kyoto' },
    fact: { ja: '京都・東寺の五重塔は高さ約55m。木でできた塔として日本一の高さ。', en: 'Tō-ji pagoda in Kyoto is about 55 m — the tallest wooden pagoda in Japan.' } },
  { kind: 'torii', type: 'landmark', emoji: '⛩️', country: 'JP', lat: 34.3, lon: 132.32, size: 0.034,
    name: { ja: '厳島神社の大鳥居', en: 'Itsukushima Torii Gate' },
    fact: { ja: '海の中に立っている大きな鳥居。潮がひくと歩いて近くまで行ける！', en: 'A giant gate standing in the sea. At low tide you can walk right up to it!' } },
  { kind: 'greatWall', type: 'landmark', emoji: '🧱', country: 'CN', lat: 40.43, lon: 116.57, size: 0.055,
    name: { ja: '万里の長城', en: 'Great Wall of China' },
    fact: { ja: '全部つなげると2万kmをこえる、世界一長い壁。', en: 'All its parts add up to over 20,000 km — the longest wall in the world.' } },
  { kind: 'tvTower', type: 'landmark', emoji: '📡', country: 'KR', lat: 37.55, lon: 126.99, size: 0.036,
    name: { ja: 'Nソウルタワー', en: 'N Seoul Tower' },
    fact: { ja: 'ソウルの南山（ナムサン）の上に立つタワー。夜はカラフルに光る。', en: 'A tower on Namsan mountain in Seoul that lights up in colors at night.' } },
  { kind: 'tajMahal', type: 'landmark', emoji: '🕌', country: 'IN', lat: 27.18, lon: 78.04,
    name: { ja: 'タージ・マハル', en: 'Taj Mahal' },
    fact: { ja: '皇帝が亡くなったお妃のために建てた、白い大理石のお墓。', en: 'A white marble tomb an emperor built for his beloved wife.' } },
  { kind: 'snowPeaks', type: 'landmark', emoji: '🏔️', country: 'NP', lat: 27.99, lon: 86.93, size: 0.06,
    name: { ja: 'エベレスト', en: 'Mount Everest' },
    fact: { ja: '高さ8849m。世界でいちばん高い山！', en: '8,849 m — the highest mountain on Earth!' } },
  { kind: 'angkor', type: 'landmark', emoji: '🛕', country: 'KH', lat: 13.41, lon: 103.87,
    name: { ja: 'アンコール・ワット', en: 'Angkor Wat' },
    fact: { ja: '世界最大級の寺院。カンボジアの国旗にも描かれている。', en: 'One of the largest temples in the world — it is even on Cambodia’s flag.' } },
  { kind: 'stupa', type: 'landmark', emoji: '🛕', country: 'MM', lat: 16.8, lon: 96.15,
    name: { ja: 'シュエダゴン・パゴダ', en: 'Shwedagon Pagoda' },
    fact: { ja: '金ぱくでおおわれた、キラキラ光る金色の仏塔。', en: 'A shining stupa covered in real gold.' } },
  { kind: 'stupa', type: 'landmark', emoji: '🛕', country: 'TH', lat: 13.74, lon: 100.49, size: 0.034,
    name: { ja: 'ワット・アルン（暁の寺）', en: 'Wat Arun' },
    fact: { ja: 'バンコクの川ぞいにある寺院。朝日にてらされてかがやく。', en: 'A riverside temple in Bangkok that glows in the morning sun.' } },
  { kind: 'twinTowers', type: 'landmark', emoji: '🏙️', country: 'MY', lat: 3.16, lon: 101.71,
    name: { ja: 'ペトロナスツインタワー', en: 'Petronas Twin Towers' },
    fact: { ja: '高さ452mのふたごのビル。とちゅうに空中の橋がある。', en: '452 m twin skyscrapers joined by a sky bridge.' } },
  { kind: 'yurt', type: 'landmark', emoji: '⛺', country: 'MN', lat: 47.5, lon: 104.0, size: 0.034,
    name: { ja: 'ゲル（モンゴルの家）', en: 'Ger (Mongolian yurt)' },
    fact: { ja: '遊牧民がくらす、組み立て式の丸いテントの家。', en: 'A round tent home that nomads can take apart and move.' } },
  { kind: 'skyscraper', type: 'landmark', emoji: '🏙️', country: 'AE', lat: 25.2, lon: 55.27, size: 0.055,
    name: { ja: 'ブルジュ・ハリファ', en: 'Burj Khalifa' },
    fact: { ja: '高さ828m。世界でいちばん高いビル！', en: '828 m — the tallest building in the world!' } },
  { kind: 'mosque', type: 'landmark', emoji: '🕌', country: 'TR', lat: 41.01, lon: 28.98,
    name: { ja: 'アヤソフィア', en: 'Hagia Sophia' },
    fact: { ja: '約1500年前に建てられた、大きな丸屋根の建物。', en: 'A huge domed building from about 1,500 years ago.' } },
  { kind: 'onionDomes', type: 'landmark', emoji: '⛪', country: 'RU', lat: 55.75, lon: 37.62,
    name: { ja: '聖ワシリイ大聖堂', en: "St. Basil's Cathedral" },
    fact: { ja: 'たまねぎの形をしたカラフルな屋根がならぶ教会。', en: 'A church with colorful onion-shaped domes.' } },

  // ---- ヨーロッパ ----
  { kind: 'eiffel', type: 'landmark', emoji: '🗼', country: 'FR', lat: 48.86, lon: 2.29,
    name: { ja: 'エッフェル塔', en: 'Eiffel Tower' },
    fact: { ja: '1889年のパリ万博のために作られた、高さ約330mの鉄の塔。', en: 'An iron tower about 330 m tall, built for the 1889 World’s Fair.' } },
  { kind: 'bigBen', type: 'landmark', emoji: '🕰️', country: 'GB', lat: 51.5, lon: -0.12,
    name: { ja: 'ビッグ・ベン', en: 'Big Ben' },
    fact: { ja: 'ビッグ・ベンは、じつは時計塔の中の大きな鐘の名前。', en: 'Big Ben is really the name of the giant bell inside the clock tower.' } },
  { kind: 'stonehenge', type: 'landmark', emoji: '🪨', country: 'GB', lat: 51.18, lon: -1.83, size: 0.032,
    name: { ja: 'ストーンヘンジ', en: 'Stonehenge' },
    fact: { ja: '約5000年前から作られた、大きな石のサークル。だれが何のために作ったかはなぞ。', en: 'A ring of giant stones started about 5,000 years ago. Why it was built is still a mystery!' } },
  { kind: 'windmill', type: 'landmark', emoji: '🌷', country: 'NL', lat: 51.88, lon: 4.64, size: 0.036,
    name: { ja: 'キンデルダイクの風車', en: 'Kinderdijk Windmills' },
    fact: { ja: '低い土地から水をくみ出すために、風車がたくさん作られた。', en: 'Windmills were built to pump water out of the low land.' } },
  { kind: 'castle', type: 'landmark', emoji: '🏰', country: 'DE', lat: 47.56, lon: 10.75,
    name: { ja: 'ノイシュヴァンシュタイン城', en: 'Neuschwanstein Castle' },
    fact: { ja: '童話に出てくるような白いお城。ディズニーのお城のモデルの一つと言われる。', en: 'A fairy-tale castle said to have inspired Disney’s castle.' } },
  { kind: 'tvTower', type: 'landmark', emoji: '📡', country: 'DE', lat: 52.52, lon: 13.41, size: 0.036,
    name: { ja: 'ベルリンテレビ塔', en: 'Berlin TV Tower' },
    fact: { ja: '高さ368m。ドイツでいちばん高い建物。', en: '368 m — the tallest structure in Germany.' } },
  { kind: 'snowPeak', type: 'landmark', emoji: '🏔️', country: 'CH', lat: 45.98, lon: 7.66, size: 0.045,
    name: { ja: 'マッターホルン', en: 'Matterhorn' },
    fact: { ja: '高さ4478m。とがった形で有名なアルプスの山。', en: 'A 4,478 m Alpine peak famous for its pointy shape.' } },
  { kind: 'colosseum', type: 'landmark', emoji: '🏟️', country: 'IT', lat: 41.89, lon: 12.49,
    name: { ja: 'コロッセオ', en: 'Colosseum' },
    fact: { ja: '約2000年前の円形闘技場。5万人ほどが入れた。', en: 'A 2,000-year-old arena that held about 50,000 people.' } },
  { kind: 'leaningTower', type: 'landmark', emoji: '🗼', country: 'IT', lat: 43.72, lon: 10.4, size: 0.036,
    name: { ja: 'ピサの斜塔', en: 'Leaning Tower of Pisa' },
    fact: { ja: '建てているとちゅうで地面がしずんで、かたむいてしまった塔。', en: 'The ground sank while it was being built, so it leans!' } },
  { kind: 'sagrada', type: 'landmark', emoji: '⛪', country: 'ES', lat: 41.4, lon: 2.17,
    name: { ja: 'サグラダ・ファミリア', en: 'Sagrada Família' },
    fact: { ja: '1882年に建て始めて、今もまだ工事中の教会！', en: 'Construction began in 1882 — and it is still being built!' } },
  { kind: 'parthenon', type: 'landmark', emoji: '🏛️', country: 'GR', lat: 37.97, lon: 23.73,
    name: { ja: 'パルテノン神殿', en: 'Parthenon' },
    fact: { ja: '約2500年前に、アテナという女神のために建てられた神殿。', en: 'A temple built about 2,500 years ago for the goddess Athena.' } },
  { kind: 'volcano', type: 'landmark', emoji: '🌋', country: 'IS', lat: 64.0, lon: -19.0,
    name: { ja: 'アイスランドの火山', en: 'Icelandic volcano' },
    fact: { ja: 'アイスランドには約130の火山があって、温泉もいっぱい。', en: 'Iceland has about 130 volcanoes — and lots of hot springs.' } },

  // ---- アフリカ ----
  { kind: 'pyramids', type: 'landmark', emoji: '🔺', country: 'EG', lat: 29.98, lon: 31.13, size: 0.05,
    name: { ja: 'ギザのピラミッド', en: 'Pyramids of Giza' },
    fact: { ja: '約4500年前に作られた王様のお墓。大きな石を200万個以上つんでいる。', en: 'Tombs of kings built about 4,500 years ago from over 2 million stone blocks.' } },
  { kind: 'kilimanjaro', type: 'landmark', emoji: '🏔️', country: 'TZ', lat: -3.07, lon: 37.36, size: 0.042,
    name: { ja: 'キリマンジャロ', en: 'Mount Kilimanjaro' },
    fact: { ja: '高さ5895m。アフリカでいちばん高い山で、てっぺんには雪がある。', en: '5,895 m — the highest mountain in Africa, with snow on top.' } },

  // ---- 北アメリカ ----
  { kind: 'statueOfLiberty', type: 'landmark', emoji: '🗽', country: 'US', lat: 40.69, lon: -74.04,
    name: { ja: '自由の女神', en: 'Statue of Liberty' },
    fact: { ja: '1886年にフランスからおくられた像。最初は茶色い銅の色だった。', en: 'A gift from France in 1886. It was shiny brown copper at first!' } },
  { kind: 'goldenGate', type: 'landmark', emoji: '🌉', country: 'US', lat: 37.82, lon: -122.48, size: 0.05,
    name: { ja: 'ゴールデン・ゲート・ブリッジ', en: 'Golden Gate Bridge' },
    fact: { ja: 'サンフランシスコの赤いつり橋。長さ約2.7km。', en: 'San Francisco’s red suspension bridge, about 2.7 km long.' } },
  { kind: 'tvTower', type: 'landmark', emoji: '📡', country: 'CA', lat: 43.64, lon: -79.39, size: 0.045,
    name: { ja: 'CNタワー', en: 'CN Tower' },
    fact: { ja: '高さ553m。床がガラスで下が見える場所がある！', en: '553 m tall, with a glass floor you can look straight down through!' } },
  { kind: 'stepPyramid', type: 'landmark', emoji: '🔺', country: 'MX', lat: 20.68, lon: -88.57,
    name: { ja: 'チチェン・イッツァ', en: 'Chichén Itzá' },
    fact: { ja: 'マヤの人たちが作った階段のピラミッド。階段は全部で365段＝1年の日数！', en: 'A Maya step pyramid with 365 steps — one for each day of the year!' } },

  // ---- 南アメリカ ----
  { kind: 'christRedeemer', type: 'landmark', emoji: '🙌', country: 'BR', lat: -22.95, lon: -43.21, size: 0.045,
    name: { ja: 'コルコバードのキリスト像', en: 'Christ the Redeemer' },
    fact: { ja: 'リオデジャネイロの山の上で両手を広げる、高さ約30mの像。', en: 'A 30 m statue with open arms on a mountain above Rio de Janeiro.' } },
  { kind: 'machuPicchu', type: 'landmark', emoji: '⛰️', country: 'PE', lat: -13.16, lon: -72.55, size: 0.045,
    name: { ja: 'マチュ・ピチュ', en: 'Machu Picchu' },
    fact: { ja: '標高約2400mの山の上にあるインカ帝国の「空中都市」。', en: 'An Inca “city in the sky” about 2,400 m up in the mountains.' } },
  { kind: 'moai', type: 'landmark', emoji: '🗿', country: 'CL', lat: -27.12, lon: -109.35, size: 0.038,
    name: { ja: 'モアイ像（イースター島）', en: 'Moai (Easter Island)' },
    fact: { ja: '島に900体ほどある大きな石の顔。', en: 'About 900 giant stone heads stand on this island.' } },

  // ---- オセアニア ----
  { kind: 'operaHouse', type: 'landmark', emoji: '🎭', country: 'AU', lat: -33.86, lon: 151.22,
    name: { ja: 'シドニー・オペラハウス', en: 'Sydney Opera House' },
    fact: { ja: '貝がらやヨットの帆のような屋根の劇場。', en: 'A theater with roofs that look like shells or sails.' } },
  { kind: 'uluru', type: 'landmark', emoji: '🪨', country: 'AU', lat: -25.34, lon: 131.04, size: 0.045,
    name: { ja: 'ウルル', en: 'Uluru' },
    fact: { ja: '高さ約350mの大きな赤い岩。夕方には色が変わって見える。', en: 'A huge red rock about 350 m high that changes color at sunset.' } },
];

export const ANIMALS: FeatureSpot[] = [
  { kind: 'giraffe', type: 'animal', emoji: '🦒', country: 'KE', lat: -1.2, lon: 34.9, count: 3, size: 0.028,
    name: { ja: 'キリン', en: 'Giraffe' },
    fact: { ja: '首の骨の数は人間と同じ7つ！', en: 'It has just 7 neck bones — the same as you!' } },
  { kind: 'zebra', type: 'animal', emoji: '🦓', country: 'TZ', lat: -2.5, lon: 34.4, count: 4,
    name: { ja: 'シマウマ', en: 'Zebra' },
    fact: { ja: 'しまもようは1頭ずつ全部ちがう。', en: 'No two zebras have the same stripes.' } },
  { kind: 'lion', type: 'animal', emoji: '🦁', country: 'TZ', lat: -3.6, lon: 35.5, count: 2,
    name: { ja: 'ライオン', en: 'Lion' },
    fact: { ja: 'むれでくらすネコのなかま。ほえ声は8km先まで聞こえる。', en: 'The only cats that live in groups. Their roar can be heard 8 km away.' } },
  { kind: 'elephant', type: 'animal', emoji: '🐘', country: 'KE', lat: -2.9, lon: 38.6, count: 3, size: 0.03,
    name: { ja: 'アフリカゾウ', en: 'African elephant' },
    fact: { ja: '陸でいちばん大きな動物。耳をパタパタして体を冷やす。', en: 'The biggest land animal. It flaps its ears to cool down.' } },
  { kind: 'flamingo', type: 'animal', emoji: '🦩', country: 'KE', lat: -0.36, lon: 36.08, count: 4, size: 0.018,
    name: { ja: 'フラミンゴ', en: 'Flamingo' },
    fact: { ja: 'ピンク色は食べているエサの色。', en: 'They are pink because of the food they eat.' } },
  { kind: 'gorilla', type: 'animal', emoji: '🦍', country: 'CD', lat: -1.4, lon: 29.3, count: 2,
    name: { ja: 'ゴリラ', en: 'Gorilla' },
    fact: { ja: 'じつはとてもやさしくて、ほとんど葉っぱや果物を食べる。', en: 'Gentle giants that eat mostly leaves and fruit.' } },
  { kind: 'camel', type: 'animal', emoji: '🐫', country: 'EG', lat: 25.5, lon: 29.0, count: 3,
    name: { ja: 'ラクダ', en: 'Camel' },
    fact: { ja: 'こぶの中は水じゃなくて脂肪。何日も水を飲まずに歩ける。', en: 'The hump stores fat, not water. Camels can go days without drinking.' } },
  { kind: 'camel', type: 'animal', emoji: '🐫', country: 'SA', lat: 23.5, lon: 46.0, count: 2,
    name: { ja: 'ヒトコブラクダ', en: 'Dromedary camel' },
    fact: { ja: '砂ぼこりから目を守る、長いまつげがある。', en: 'Long eyelashes protect their eyes from sand.' } },
  { kind: 'baobab', type: 'landmark', emoji: '🌳', country: 'MG', lat: -20.25, lon: 44.42, count: 4, size: 0.03,
    name: { ja: 'バオバブの木', en: 'Baobab trees' },
    fact: { ja: '幹に水をためる不思議な木。マダガスカルには6種類もある。', en: 'Strange trees that store water in their trunks. Madagascar has 6 kinds!' } },
  { kind: 'panda', type: 'animal', emoji: '🐼', country: 'CN', lat: 30.8, lon: 103.0, count: 2,
    name: { ja: 'ジャイアントパンダ', en: 'Giant panda' },
    fact: { ja: '1日に12時間くらいタケを食べている！', en: 'Pandas spend about 12 hours a day eating bamboo!' } },
  { kind: 'tiger', type: 'animal', emoji: '🐅', country: 'IN', lat: 22.3, lon: 80.6, count: 2,
    name: { ja: 'ベンガルトラ', en: 'Bengal tiger' },
    fact: { ja: 'トラは泳ぐのが得意なネコのなかま。', en: 'Tigers are cats that love to swim.' } },
  { kind: 'elephant', type: 'animal', emoji: '🐘', country: 'TH', lat: 18.8, lon: 98.9, count: 2, size: 0.024,
    name: { ja: 'アジアゾウ', en: 'Asian elephant' },
    fact: { ja: 'タイの国の動物。アフリカゾウより耳が小さい。', en: 'Thailand’s national animal. Its ears are smaller than an African elephant’s.' } },
  { kind: 'brownBear', type: 'animal', emoji: '🐻', country: 'RU', lat: 56.0, lon: 159.0, count: 2,
    name: { ja: 'ヒグマ', en: 'Brown bear' },
    fact: { ja: 'カムチャツカのヒグマは川でサケをつかまえて食べる。', en: 'Bears in Kamchatka catch salmon in the rivers.' } },
  { kind: 'brownBear', type: 'animal', emoji: '🐻', country: 'US', lat: 63.0, lon: -152.0, count: 2,
    name: { ja: 'グリズリー', en: 'Grizzly bear' },
    fact: { ja: '冬のあいだは巣あなでずっとねむる（冬眠）。', en: 'They sleep through the winter in a den.' } },
  { kind: 'bison', type: 'animal', emoji: '🦬', country: 'US', lat: 44.6, lon: -110.5, count: 3,
    name: { ja: 'バイソン', en: 'Bison' },
    fact: { ja: '北アメリカでいちばん重い陸の動物。', en: 'The heaviest land animal in North America.' } },
  { kind: 'polarBear', type: 'animal', emoji: '🐻‍❄️', country: 'CA', lat: 62.0, lon: -94.0, count: 2,
    name: { ja: 'ホッキョクグマ', en: 'Polar bear' },
    fact: { ja: '白く見える毛は本当はとうめいで、はだは黒い。', en: 'Their fur is actually see-through, and their skin is black!' } },
  { kind: 'polarBear', type: 'animal', emoji: '🐻‍❄️', country: 'GL', lat: 74.0, lon: -40.0, count: 2,
    name: { ja: 'ホッキョクグマ', en: 'Polar bear' },
    fact: { ja: '氷の上でアザラシをつかまえてくらす。', en: 'They hunt seals out on the sea ice.' } },
  { kind: 'llama', type: 'animal', emoji: '🦙', country: 'PE', lat: -15.5, lon: -70.5, count: 3,
    name: { ja: 'リャマ', en: 'Llama' },
    fact: { ja: 'アンデスの山で荷物を運ぶお手伝いをしてきた動物。', en: 'Andes people have used llamas to carry things for thousands of years.' } },
  { kind: 'toucan', type: 'animal', emoji: '🦜', country: 'BR', lat: -4.0, lon: -62.0, count: 2,
    name: { ja: 'オオハシ', en: 'Toucan' },
    fact: { ja: '大きなくちばしは見た目よりずっと軽い。', en: 'Its giant beak is much lighter than it looks.' } },
  { kind: 'tortoise', type: 'animal', emoji: '🐢', country: 'EC', lat: -0.7, lon: -90.5, count: 2,
    name: { ja: 'ガラパゴスゾウガメ', en: 'Galápagos giant tortoise' },
    fact: { ja: '100年以上生きることもある、大きなカメ。', en: 'Giant tortoises that can live over 100 years.' } },
  { kind: 'kangaroo', type: 'animal', emoji: '🦘', country: 'AU', lat: -27.0, lon: 140.0, count: 3,
    name: { ja: 'カンガルー', en: 'Kangaroo' },
    fact: { ja: 'お母さんのおなかのポケットで赤ちゃんを育てる。', en: 'Moms carry their babies in a pouch.' } },
  { kind: 'koala', type: 'animal', emoji: '🐨', country: 'AU', lat: -30.0, lon: 152.0, count: 1, size: 0.03,
    name: { ja: 'コアラ', en: 'Koala' },
    fact: { ja: '1日に18〜20時間もねている！', en: 'Koalas sleep 18–20 hours a day!' } },
  { kind: 'sheep', type: 'animal', emoji: '🐑', country: 'NZ', lat: -44.0, lon: 170.5, count: 5, size: 0.02,
    name: { ja: 'ヒツジ', en: 'Sheep' },
    fact: { ja: 'ニュージーランドには人の数よりずっと多いヒツジがいる。', en: 'New Zealand has far more sheep than people.' } },
  { kind: 'penguin', type: 'animal', emoji: '🐧', country: 'AQ', lat: -72.0, lon: 20.0, count: 5,
    name: { ja: 'コウテイペンギン', en: 'Emperor penguin' },
    fact: { ja: 'お父さんが足の上でタマゴをあたためる。', en: 'Dads keep the egg warm on their feet.' } },
  { kind: 'penguin', type: 'animal', emoji: '🐧', country: 'AQ', lat: -74.0, lon: 160.0, count: 4,
    name: { ja: 'ペンギン', en: 'Penguin' },
    fact: { ja: '空は飛べないけれど、海の中をとても速く泳ぐ。', en: 'They can’t fly, but they zoom through the water.' } },
  { kind: 'whale', type: 'animal', emoji: '🐋', country: '', lat: 20.0, lon: -155.5, count: 1, size: 0.04,
    name: { ja: 'ザトウクジラ', en: 'Humpback whale' },
    fact: { ja: '冬になるとハワイのあたたかい海で歌を歌う。', en: 'In winter they sing songs in the warm sea around Hawaii.' } },
  { kind: 'whale', type: 'animal', emoji: '🐋', country: '', lat: 35.0, lon: -40.0, count: 1, size: 0.04,
    name: { ja: 'シロナガスクジラ', en: 'Blue whale' },
    fact: { ja: '地球の歴史で一番大きい動物。体長30m近くになる。', en: 'The biggest animal that has ever lived — almost 30 m long.' } },
  { kind: 'whale', type: 'animal', emoji: '🐋', country: '', lat: -40.0, lon: 80.0, count: 1, size: 0.04,
    name: { ja: 'クジラ', en: 'Whale' },
    fact: { ja: 'クジラは魚ではなく、わたしたちと同じほ乳類。', en: 'Whales are mammals, just like us — not fish.' } },
];

/** 森・砂漠などの景色（タップしても何も出ない飾り） */
export interface SceneryCluster {
  kind: ModelKind;
  lat: number;
  lon: number;
  count: number;
  spread: number; // 度
  size: number;
}

export const SCENERY: SceneryCluster[] = [
  { kind: 'roundTree', lat: -5, lon: -62, count: 40, spread: 9, size: 0.02 }, // アマゾン
  { kind: 'roundTree', lat: 0, lon: 22, count: 25, spread: 6, size: 0.02 }, // コンゴの森
  { kind: 'roundTree', lat: 0, lon: 113, count: 12, spread: 4, size: 0.018 }, // ボルネオ
  { kind: 'conifer', lat: 60, lon: 100, count: 35, spread: 14, size: 0.02 }, // シベリア
  { kind: 'conifer', lat: 56, lon: -105, count: 30, spread: 12, size: 0.02 }, // カナダ
  { kind: 'conifer', lat: 63, lon: 22, count: 12, spread: 5, size: 0.018 }, // 北欧
  { kind: 'cactus', lat: 29, lon: -108, count: 10, spread: 4, size: 0.018 }, // メキシコ北部
  { kind: 'cactus', lat: 33, lon: -112, count: 6, spread: 3, size: 0.018 }, // アリゾナ
  { kind: 'palm', lat: 22, lon: -79, count: 6, spread: 2.5, size: 0.018 }, // カリブ海
  { kind: 'palm', lat: -17.6, lon: -149.5, count: 4, spread: 1.0, size: 0.018 }, // タヒチ
  { kind: 'palm', lat: 4, lon: 73.5, count: 4, spread: 1.0, size: 0.016 }, // モルディブ
  { kind: 'palm', lat: 26, lon: 31, count: 5, spread: 1.5, size: 0.016 }, // ナイル川
  { kind: 'iceberg', lat: -66, lon: -60, count: 6, spread: 6, size: 0.025 },
  { kind: 'iceberg', lat: -65, lon: 100, count: 6, spread: 8, size: 0.025 },
  { kind: 'iceberg', lat: 72, lon: -60, count: 4, spread: 4, size: 0.022 },
];
