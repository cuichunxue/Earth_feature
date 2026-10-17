import type { L } from './text';

/**
 * 国の「ひみつカード」の中身。ISO 2文字コードで国とつながります。
 * 人口はだいたいの数（2024年ごろ、単位: 百万人）。
 */
export interface CountryInfo {
  capital: L;
  capitalLat: number;
  capitalLon: number;
  population: number;
  language: L;
  /** その国のことばでの「こんにちは」と、その読み方 */
  hello: string;
  helloReading: L;
  food: { emoji: string; name: L };
  fact: L;
}

const c = (
  capital: [string, string],
  capitalLat: number,
  capitalLon: number,
  population: number,
  language: [string, string],
  hello: string,
  helloReading: [string, string],
  food: [string, string, string],
  fact: [string, string],
): CountryInfo => ({
  capital: { ja: capital[0], en: capital[1] },
  capitalLat,
  capitalLon,
  population,
  language: { ja: language[0], en: language[1] },
  hello,
  helloReading: { ja: helloReading[0], en: helloReading[1] },
  food: { emoji: food[0], name: { ja: food[1], en: food[2] } },
  fact: { ja: fact[0], en: fact[1] },
});

export const COUNTRY_INFO: Record<string, CountryInfo> = {
  // ---- アジア ----
  JP: c(['東京', 'Tokyo'], 35.68, 139.69, 124, ['日本語', 'Japanese'], 'こんにちは', ['こんにちは', 'Konnichiwa'],
    ['🍣', 'すし', 'Sushi'], ['1万4000をこえる島があつまった島国。', 'An island country made of more than 14,000 islands.']),
  CN: c(['北京', 'Beijing'], 39.9, 116.4, 1410, ['中国語', 'Chinese'], '你好', ['ニーハオ', 'Nǐ hǎo'],
    ['🥟', 'ぎょうざ', 'Dumplings'], ['パンダのふるさと。人口は世界で2番目に多い。', 'Home of the giant panda, with the 2nd-largest population on Earth.']),
  KR: c(['ソウル', 'Seoul'], 37.57, 126.98, 52, ['韓国語', 'Korean'], '안녕하세요', ['アンニョンハセヨ', 'Annyeonghaseyo'],
    ['🍚', 'ビビンバ', 'Bibimbap'], ['ハングルという文字は、約580年前に王様が作った。', 'The Hangul alphabet was created by a king about 580 years ago.']),
  IN: c(['ニューデリー', 'New Delhi'], 28.61, 77.21, 1440, ['ヒンディー語・英語など', 'Hindi, English & more'], 'नमस्ते', ['ナマステ', 'Namaste'],
    ['🍛', 'カレー', 'Curry'], ['人口が世界でいちばん多い国。トラやゾウもくらしている。', 'The country with the most people in the world — tigers and elephants live here too.']),
  TH: c(['バンコク', 'Bangkok'], 13.76, 100.5, 72, ['タイ語', 'Thai'], 'สวัสดี', ['サワッディー', 'Sawasdee'],
    ['🍲', 'トムヤムクン', 'Tom yum soup'], ['「ほほえみの国」とよばれる。ゾウが国の動物。', 'Called the “Land of Smiles.” The elephant is its national animal.']),
  VN: c(['ハノイ', 'Hanoi'], 21.03, 105.85, 100, ['ベトナム語', 'Vietnamese'], 'Xin chào', ['シン チャオ', 'Sin chow'],
    ['🍜', 'フォー', 'Phở'], ['南北に細長い、Sの字のような形の国。', 'A long, thin country shaped like the letter S.']),
  ID: c(['ジャカルタ', 'Jakarta'], -6.2, 106.85, 279, ['インドネシア語', 'Indonesian'], 'Halo', ['ハロ', 'Halo'],
    ['🍚', 'ナシゴレン', 'Nasi goreng'], ['1万7000以上の島がある、世界最大の島国。', 'The world’s biggest island country, with over 17,000 islands.']),
  PH: c(['マニラ', 'Manila'], 14.6, 120.98, 115, ['フィリピノ語・英語', 'Filipino & English'], 'Kumusta', ['クムスタ', 'Kumusta'],
    ['🍗', 'アドボ', 'Adobo'], ['7000以上の島があつまってできた国。', 'A country made of more than 7,000 islands.']),
  MY: c(['クアラルンプール', 'Kuala Lumpur'], 3.14, 101.69, 35, ['マレー語', 'Malay'], 'Apa khabar', ['アパ カバール', 'Apa kabar'],
    ['🍚', 'ナシレマ', 'Nasi lemak'], ['世界でいちばん大きな花「ラフレシア」がさく。', 'Home of the rafflesia — the biggest flower in the world.']),
  KH: c(['プノンペン', 'Phnom Penh'], 11.56, 104.92, 18, ['クメール語', 'Khmer'], 'សួស្តី', ['スオスダイ', 'Suostei'],
    ['🍛', 'アモック', 'Amok'], ['国旗に建物（アンコール・ワット）がえがかれている。', 'Its flag shows a building — Angkor Wat!']),
  MM: c(['ネピドー', 'Naypyidaw'], 19.75, 96.1, 54, ['ミャンマー語', 'Burmese'], 'မင်္ဂလာပါ', ['ミンガラーバー', 'Mingalaba'],
    ['🍜', 'モヒンガー', 'Mohinga'], ['金色にかがやく仏塔（パゴダ）がたくさんある。', 'Full of shining golden pagodas.']),
  MN: c(['ウランバートル', 'Ulaanbaatar'], 47.89, 106.91, 3.4, ['モンゴル語', 'Mongolian'], 'Сайн байна уу', ['サイン バイノー', 'Sain baina uu'],
    ['🥟', 'ボーズ', 'Buuz dumplings'], ['人よりウマのほうが多いといわれる、草原の国。', 'A land of grasslands said to have more horses than people.']),
  NP: c(['カトマンズ', 'Kathmandu'], 27.72, 85.32, 31, ['ネパール語', 'Nepali'], 'नमस्ते', ['ナマステ', 'Namaste'],
    ['🥟', 'モモ', 'Momo dumplings'], ['国旗が四角じゃない、世界でただ一つの国。', 'The only country whose flag is not a rectangle.']),
  TR: c(['アンカラ', 'Ankara'], 39.93, 32.86, 86, ['トルコ語', 'Turkish'], 'Merhaba', ['メルハバ', 'Merhaba'],
    ['🥙', 'ケバブ', 'Kebab'], ['アジアとヨーロッパの両方にまたがる国。', 'A country that sits in both Asia and Europe.']),
  SA: c(['リヤド', 'Riyadh'], 24.71, 46.68, 33, ['アラビア語', 'Arabic'], 'السلام عليكم', ['アッサラーム アライクム', 'As-salamu alaykum'],
    ['🌴', 'デーツ（ナツメヤシ）', 'Dates'], ['一年中流れている川が一本もない国。', 'There is not a single river that flows all year round.']),
  AE: c(['アブダビ', 'Abu Dhabi'], 24.45, 54.38, 10, ['アラビア語', 'Arabic'], 'مرحبا', ['マルハバ', 'Marhaba'],
    ['🌴', 'デーツ（ナツメヤシ）', 'Dates'], ['世界一高いビル、ブルジュ・ハリファがある。', 'Home of the tallest building on Earth.']),
  RU: c(['モスクワ', 'Moscow'], 55.76, 37.62, 144, ['ロシア語', 'Russian'], 'Здравствуйте', ['ズドラーストヴィチェ', 'Zdravstvuyte'],
    ['🍲', 'ボルシチ', 'Borscht'], ['世界でいちばん大きな国。時間帯が11もある！', 'The biggest country in the world — it has 11 time zones!']),

  // ---- ヨーロッパ ----
  FR: c(['パリ', 'Paris'], 48.86, 2.35, 68, ['フランス語', 'French'], 'Bonjour', ['ボンジュール', 'Bonjour'],
    ['🥐', 'クロワッサン', 'Croissant'], ['世界でいちばん多くの観光客がおとずれる国。', 'More tourists visit France than any other country.']),
  GB: c(['ロンドン', 'London'], 51.51, -0.13, 68, ['英語', 'English'], 'Hello', ['ハロー', 'Hello'],
    ['🐟', 'フィッシュ・アンド・チップス', 'Fish and chips'], ['イングランド・スコットランド・ウェールズ・北アイルランドの4つが集まった国。', 'Four nations in one: England, Scotland, Wales and Northern Ireland.']),
  DE: c(['ベルリン', 'Berlin'], 52.52, 13.4, 84, ['ドイツ語', 'German'], 'Guten Tag', ['グーテン ターク', 'Guten Tag'],
    ['🌭', 'ソーセージ', 'Sausages'], ['ソーセージの種類が1500以上あるといわれる。', 'Said to have more than 1,500 kinds of sausage.']),
  IT: c(['ローマ', 'Rome'], 41.9, 12.5, 59, ['イタリア語', 'Italian'], 'Ciao', ['チャオ', 'Ciao'],
    ['🍕', 'ピザ', 'Pizza'], ['長ぐつの形をした国。ピザとパスタのふるさと。', 'Shaped like a boot — the home of pizza and pasta.']),
  ES: c(['マドリード', 'Madrid'], 40.42, -3.7, 49, ['スペイン語', 'Spanish'], 'Hola', ['オラ', 'Hola'],
    ['🥘', 'パエリア', 'Paella'], ['毎年トマトを投げあうお祭り「トマティーナ」がある。', 'Every year there is a giant tomato-throwing festival!']),
  NL: c(['アムステルダム', 'Amsterdam'], 52.37, 4.9, 18, ['オランダ語', 'Dutch'], 'Hallo', ['ハロー', 'Hallo'],
    ['🧀', 'チーズ', 'Cheese'], ['国の約4分の1が海面より低い土地。', 'About a quarter of the country is below sea level.']),
  CH: c(['ベルン', 'Bern'], 46.95, 7.45, 9, ['ドイツ語・フランス語など4つ', '4 languages incl. German & French'], 'Grüezi', ['グリュエツィ', 'Grüezi'],
    ['🫕', 'チーズフォンデュ', 'Cheese fondue'], ['アルプスの山の国。ことばが4つもある。', 'A mountain country in the Alps with four official languages.']),
  GR: c(['アテネ', 'Athens'], 37.98, 23.73, 10, ['ギリシャ語', 'Greek'], 'Γειά σου', ['ヤースー', 'Yassou'],
    ['🫒', 'オリーブ', 'Olives'], ['オリンピックが生まれた国。', 'The birthplace of the Olympic Games.']),
  IS: c(['レイキャビク', 'Reykjavík'], 64.15, -21.94, 0.39, ['アイスランド語', 'Icelandic'], 'Halló', ['ハロウ', 'Hallo'],
    ['🥛', 'スキール（ヨーグルト）', 'Skyr yogurt'], ['火山と氷河の国。なんと蚊がいない！', 'A land of volcanoes and glaciers — with no mosquitoes!']),
  NO: c(['オスロ', 'Oslo'], 59.91, 10.75, 5.6, ['ノルウェー語', 'Norwegian'], 'Hei', ['ハイ', 'Hei'],
    ['🐟', 'サーモン', 'Salmon'], ['夏は夜になっても太陽がしずまない「白夜」がある。', 'In summer the sun doesn’t set at night — the “midnight sun.”']),

  // ---- アフリカ ----
  EG: c(['カイロ', 'Cairo'], 30.04, 31.24, 114, ['アラビア語', 'Arabic'], 'مرحبا', ['マルハバ', 'Marhaba'],
    ['🧆', 'ターメイヤ', 'Ta’ameya (falafel)'], ['世界で最も長い川のひとつ、ナイル川が流れる。', 'The Nile, one of the longest rivers in the world, flows here.']),
  MA: c(['ラバト', 'Rabat'], 34.02, -6.84, 38, ['アラビア語・ベルベル語', 'Arabic & Berber'], 'السلام عليكم', ['アッサラーム アライクム', 'As-salamu alaykum'],
    ['🍲', 'タジン', 'Tagine'], ['サハラ砂漠の入り口。カラフルな市場が有名。', 'Gateway to the Sahara, famous for its colorful markets.']),
  KE: c(['ナイロビ', 'Nairobi'], -1.29, 36.82, 56, ['スワヒリ語・英語', 'Swahili & English'], 'Jambo', ['ジャンボ', 'Jambo'],
    ['🌽', 'ウガリ', 'Ugali'], ['サファリで有名。キリンやゾウに会える。赤道が通っている。', 'Famous for safaris with giraffes and elephants. The equator runs through it.']),
  TZ: c(['ドドマ', 'Dodoma'], -6.16, 35.75, 68, ['スワヒリ語・英語', 'Swahili & English'], 'Jambo', ['ジャンボ', 'Jambo'],
    ['🌽', 'ウガリ', 'Ugali'], ['アフリカでいちばん高い山、キリマンジャロがある。', 'Home of Kilimanjaro, the highest mountain in Africa.']),
  ZA: c(['プレトリア', 'Pretoria'], -25.75, 28.19, 63, ['英語・ズールー語など12', '12 incl. English & Zulu'], 'Sawubona', ['サウボナ', 'Sawubona'],
    ['🍖', 'ブラーイ（バーベキュー）', 'Braai (barbecue)'], ['首都が3つもある国！', 'A country with three capital cities!']),
  NG: c(['アブジャ', 'Abuja'], 9.06, 7.49, 230, ['英語', 'English'], 'Hello', ['ハロー', 'Hello'],
    ['🍚', 'ジョロフライス', 'Jollof rice'], ['アフリカで人口がいちばん多い国。', 'The country with the most people in Africa.']),
  CD: c(['キンシャサ', 'Kinshasa'], -4.32, 15.31, 109, ['フランス語', 'French'], 'Mbote', ['ンボテ', 'Mbote'],
    ['🍠', 'フフ', 'Fufu'], ['アフリカで2番目に大きい国。ゴリラがくらす森がある。', 'Africa’s 2nd-largest country, with forests where gorillas live.']),
  MG: c(['アンタナナリボ', 'Antananarivo'], -18.88, 47.51, 31, ['マダガスカル語・フランス語', 'Malagasy & French'], 'Manao ahoana', ['マナウ アウナ', 'Manao ahoana'],
    ['🍚', 'お米', 'Rice'], ['生きものの多くが、この島にしかいない。', 'Most of its animals live nowhere else on Earth.']),

  // ---- 北アメリカ ----
  US: c(['ワシントンD.C.', 'Washington, D.C.'], 38.9, -77.04, 340, ['英語', 'English'], 'Hello', ['ハロー', 'Hello'],
    ['🍔', 'ハンバーガー', 'Hamburger'], ['50の州がある。世界で最初の国立公園イエローストーンがある。', 'It has 50 states and Yellowstone, the world’s first national park.']),
  CA: c(['オタワ', 'Ottawa'], 45.42, -75.7, 41, ['英語・フランス語', 'English & French'], 'Hello / Bonjour', ['ハロー / ボンジュール', 'Hello / Bonjour'],
    ['🍁', 'メープルシロップ', 'Maple syrup'], ['世界で2番目に大きな国。湖の数が世界一！', 'The 2nd-largest country — with more lakes than anywhere else!']),
  MX: c(['メキシコシティ', 'Mexico City'], 19.43, -99.13, 130, ['スペイン語', 'Spanish'], 'Hola', ['オラ', 'Hola'],
    ['🌮', 'タコス', 'Tacos'], ['チョコレート（カカオ）とトウモロコシのふるさと。', 'The homeland of chocolate (cacao) and corn.']),

  // ---- 南アメリカ ----
  BR: c(['ブラジリア', 'Brasília'], -15.79, -47.88, 212, ['ポルトガル語', 'Portuguese'], 'Olá', ['オラ', 'Olá'],
    ['🍖', 'シュラスコ', 'Churrasco'], ['アマゾンの熱帯雨林がある。サッカーW杯で5回優勝！', 'Home of the Amazon rainforest — and 5-time World Cup winners!']),
  AR: c(['ブエノスアイレス', 'Buenos Aires'], -34.6, -58.38, 46, ['スペイン語', 'Spanish'], 'Hola', ['オラ', 'Hola'],
    ['🥩', 'アサード', 'Asado'], ['タンゴというおどりが生まれた国。', 'The birthplace of the tango dance.']),
  PE: c(['リマ', 'Lima'], -12.05, -77.04, 34, ['スペイン語・ケチュア語', 'Spanish & Quechua'], 'Hola', ['オラ', 'Hola'],
    ['🥔', 'ジャガイモ料理', 'Potato dishes'], ['ジャガイモのふるさと。何千種類もある！', 'The homeland of the potato — there are thousands of kinds!']),
  CL: c(['サンティアゴ', 'Santiago'], -33.45, -70.67, 20, ['スペイン語', 'Spanish'], 'Hola', ['オラ', 'Hola'],
    ['🥟', 'エンパナーダ', 'Empanada'], ['南北に4000km以上ある、世界一細長い国。', 'The world’s longest, thinnest country — over 4,000 km north to south.']),
  EC: c(['キト', 'Quito'], -0.18, -78.47, 18, ['スペイン語', 'Spanish'], 'Hola', ['オラ', 'Hola'],
    ['🍌', 'バナナ', 'Bananas'], ['国の名前はスペイン語で「赤道」という意味。', 'Its name means “equator” in Spanish.']),

  // ---- オセアニア ----
  AU: c(['キャンベラ', 'Canberra'], -35.28, 149.13, 27, ['英語', 'English'], "G'day", ['グッダイ', "G'day"],
    ['🥧', 'ミートパイ', 'Meat pie'], ['ひとつの大陸がまるごと一つの国。カンガルーとコアラの国。', 'A whole continent in one country — land of kangaroos and koalas.']),
  NZ: c(['ウェリントン', 'Wellington'], -41.29, 174.78, 5.3, ['英語・マオリ語', 'English & Māori'], 'Kia ora', ['キア オラ', 'Kia ora'],
    ['🥝', 'キウイフルーツ', 'Kiwifruit'], ['人よりヒツジのほうがずっと多い国。', 'There are many more sheep than people!']),
};
