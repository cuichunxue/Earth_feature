import { feature, neighbors } from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import type { Feature, Geometry } from 'geojson';
import isoCountries from 'i18n-iso-countries';
import en from 'i18n-iso-countries/langs/en.json';
import ja from 'i18n-iso-countries/langs/ja.json';
import ko from 'i18n-iso-countries/langs/ko.json';
import zh from 'i18n-iso-countries/langs/zh.json';
import { COUNTRY_COLORS } from './palette';
import type { Lang } from '../i18n';

isoCountries.registerLocale(en);
isoCountries.registerLocale(ja);
isoCountries.registerLocale(ko);
isoCountries.registerLocale(zh);

export interface Country {
  index: number;
  /** ISO 3166-1 数字コード（例: 日本 = "392"） */
  numericId: string | undefined;
  /** ISO 3166-1 2文字コード（例: 日本 = "JP"）。国旗の絵文字や多言語名に使います */
  alpha2: string | undefined;
  englishName: string;
  color: string;
  feature: Feature<Geometry>;
}

/**
 * 国境データ（world-atlas, Natural Earth 1:50m）を読み込みます。
 * 大きめのJSONなので、動的 import で別ファイルに分けて読み込みます。
 */
export async function loadCountries(): Promise<Country[]> {
  const topo = (await import('world-atlas/countries-50m.json')).default as unknown as Topology<{
    countries: GeometryCollection<{ name: string }>;
  }>;
  const geoms = topo.objects.countries.geometries;
  const collection = feature(topo, topo.objects.countries);
  const adjacency = neighbors(geoms);
  const colors = assignColors(adjacency);

  return collection.features.map((f, i) => {
    const numericId = geoms[i].id === undefined ? undefined : String(geoms[i].id);
    const alpha2 = numericId ? isoCountries.numericToAlpha2(numericId) : undefined;
    return {
      index: i,
      numericId,
      alpha2,
      englishName: (geoms[i].properties as { name?: string } | undefined)?.name ?? '',
      color: COUNTRY_COLORS[colors[i]],
      feature: f as Feature<Geometry>,
    };
  });
}

/**
 * 「隣の国と同じ色にしない」色ぬり（貪欲法）。
 * 隣が多い国から順に、まだ使われていない色の中で一番使用回数が少ない色を選びます。
 */
function assignColors(adjacency: number[][]): number[] {
  const n = adjacency.length;
  const result = new Array<number>(n).fill(-1);
  const usage = new Array<number>(COUNTRY_COLORS.length).fill(0);
  const order = [...Array(n).keys()].sort((a, b) => adjacency[b].length - adjacency[a].length);

  for (const i of order) {
    const taken = new Set(adjacency[i].map((j) => result[j]));
    let best = -1;
    for (let c = 0; c < COUNTRY_COLORS.length; c++) {
      // 番号をずらして選び始めることで、似た色が偏らないようにする
      const color = (c + i) % COUNTRY_COLORS.length;
      if (taken.has(color)) continue;
      if (best === -1 || usage[color] < usage[best]) best = color;
    }
    if (best === -1) best = i % COUNTRY_COLORS.length;
    result[i] = best;
    usage[best]++;
  }
  return result;
}

export function countryName(country: Country, lang: Lang): string {
  if (country.alpha2) {
    const name = isoCountries.getName(country.alpha2, lang, { select: 'alias' });
    if (name) return name;
  }
  return country.englishName;
}

/** "JP" → 🇯🇵 */
export function flagEmoji(alpha2: string | undefined): string {
  if (!alpha2) return '🏳️';
  return String.fromCodePoint(...[...alpha2.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
}
