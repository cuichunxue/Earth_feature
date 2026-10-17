import './style.css';
import { GlobeApp } from './globe/GlobeApp';
import { countryName, flagEmoji, loadCountries, type Country } from './data/countries';
import { COUNTRY_INFO } from './data/countryInfo';
import { ANIMALS, LANDMARKS, type FeatureSpot } from './data/features';
import { tr } from './data/text';
import type { LabelSpec } from './globe/labels';
import { applyStaticTexts, detectLang, formatPopulation, saveLang, t, type Lang } from './i18n';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const LABEL_FONT = '"Baloo 2", "M PLUS Rounded 1c", system-ui, sans-serif';
const ALL_SPOTS = [...LANDMARKS, ...ANIMALS];
const RAD_TO_DEG = 180 / Math.PI;

let lang: Lang = detectLang();
let countries: Country[] = [];
/** いま開いているカード（言語を切りかえたときに作り直すため） */
let openCard: { kind: 'country'; country: Country } | { kind: 'spot'; spot: FeatureSpot } | null = null;

const app = new GlobeApp($<HTMLCanvasElement>('globe'));

// =====================================================================
// 「みつけた」コレクション：タップしたランドマーク・動物を覚えておく
// =====================================================================
const FOUND_KEY = 'earth-toy-found';
const spotKey = (s: FeatureSpot) => `${s.kind}:${s.name.en}`;
const uniqueSpotCount = new Set(ALL_SPOTS.map(spotKey)).size;
const found = new Set<string>(
  (() => {
    try {
      return JSON.parse(localStorage.getItem(FOUND_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  })(),
);
function renderFound() {
  $('found-count').textContent = `${found.size} / ${uniqueSpotCount}`;
}
function markFound(spot: FeatureSpot): boolean {
  const key = spotKey(spot);
  if (found.has(key)) return false;
  found.add(key);
  try {
    localStorage.setItem(FOUND_KEY, JSON.stringify([...found]));
  } catch {
    /* 保存できなくても遊べる */
  }
  renderFound();
  const badge = $('found-badge');
  badge.classList.remove('pop');
  void badge.offsetWidth;
  badge.classList.add('pop');
  return true;
}

function toast(text: string) {
  const el = $('toast');
  el.textContent = text;
  el.classList.remove('hidden', 'pop');
  void el.offsetWidth;
  el.classList.add('pop');
  clearTimeout((toast as unknown as { timer: number }).timer);
  (toast as unknown as { timer: number }).timer = window.setTimeout(() => el.classList.add('hidden'), 1800);
}

// =====================================================================
// カード（画面の下から出てくるパネル）
// =====================================================================
const sheet = $('sheet');

function openSheet(icon: string, title: string, sub: string, body: HTMLElement[]) {
  $('sheet-icon').textContent = icon;
  $('sheet-title').textContent = title;
  $('sheet-sub').textContent = sub;
  $('sheet-body').replaceChildren(...body);
  $('sheet-body').scrollTop = 0;
  sheet.classList.remove('hidden', 'pop');
  void sheet.offsetWidth;
  sheet.classList.add('pop');
  document.body.classList.add('sheet-open');
  // カードでかくれないように、地球の見える場所をずらす（横長の画面は左へ、縦長は上へ）
  if (window.innerWidth >= 900) app.setFocusShift(0.38, 0);
  else app.setFocusShift(0, Math.min(0.55, (sheet.offsetHeight / window.innerHeight) * 0.95));
}

function closeSheet() {
  sheet.classList.add('hidden');
  document.body.classList.remove('sheet-open');
  app.setFocusShift(0, 0);
  openCard = null;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text = '') {
  const e = document.createElement(tag);
  e.className = cls;
  e.textContent = text;
  return e;
}

function tile(icon: string, label: string, value: string, extra?: string) {
  const d = el('div', 'tile');
  d.append(el('div', 'tile-label', `${icon} ${label}`), el('div', 'tile-value', value));
  if (extra) d.append(el('div', 'tile-extra', extra));
  return d;
}

function spotChips(code: string) {
  const spots = ALL_SPOTS.filter((s) => s.country === code);
  if (!spots.length) return [];
  const wrap = el('div', 'chips');
  for (const s of spots) {
    const b = el('button', 'chip' + (found.has(spotKey(s)) ? ' found' : ''), `${s.emoji} ${tr(s.name, lang)}`);
    b.addEventListener('click', () => {
      app.flyToSpot(s);
      showSpot(s);
    });
    wrap.append(b);
  }
  return [el('div', 'section-title', t('meetHere', lang)), wrap];
}

function showCountry(country: Country | null) {
  if (!country) {
    closeSheet();
    return;
  }
  openCard = { kind: 'country', country };
  const info = country.alpha2 ? COUNTRY_INFO[country.alpha2] : undefined;
  const body: HTMLElement[] = [];
  if (info) {
    const grid = el('div', 'tiles');
    grid.append(
      tile('🏙️', t('capital', lang), tr(info.capital, lang)),
      tile('👥', t('population', lang), formatPopulation(info.population, lang)),
      tile('🗣️', t('language', lang), tr(info.language, lang)),
      tile('👋', t('hello', lang), info.hello, info.hello === tr(info.helloReading, lang) ? undefined : tr(info.helloReading, lang)),
      tile(info.food.emoji, t('food', lang), tr(info.food.name, lang)),
    );
    const secret = el('div', 'secret');
    secret.append(el('div', 'tile-label', `⭐ ${t('secret', lang)}`), el('div', 'secret-text', tr(info.fact, lang)));
    body.push(grid, secret);
  } else {
    body.push(el('div', 'secret-text muted', t('comingSoon', lang)));
  }
  body.push(...spotChips(country.alpha2 ?? ''));
  openSheet(flagEmoji(country.alpha2), countryName(country, lang), '', body);
}

function showSpot(spot: FeatureSpot) {
  openCard = { kind: 'spot', spot };
  const isNew = markFound(spot);
  if (isNew) toast(`🎉 ${t('newFind', lang)} ${spot.emoji}`);
  const country = spot.country ? app.countryByCode(spot.country) : null;
  const sub = country ? `${flagEmoji(country.alpha2)} ${countryName(country, lang)}` : `🌊 ${t('ocean', lang)}`;
  const body: HTMLElement[] = [el('div', 'secret-text big', tr(spot.fact, lang))];
  if (country) {
    const back = el('button', 'chip back', `${flagEmoji(country.alpha2)} ${t('backToCountry', lang)}`);
    back.addEventListener('click', () => {
      app.flyToCountry(country);
      showCountry(country);
    });
    body.push(back);
  }
  openSheet(spot.emoji, tr(spot.name, lang), sub, body);
}

app.onCountrySelected = (c) => {
  // ランドマークをタップしたときも国は選ばれるが、そのときはランドマークのカードを優先
  if (c && openCard?.kind === 'spot' && openCard.spot.country === c.alpha2) return;
  showCountry(c);
};
app.onSpotSelected = (spot) => {
  showSpot(spot);
  app.flyToSpot(spot);
};

$('sheet-close').addEventListener('click', () => closeSheet());

// =====================================================================
// 地面に書く文字（国名・首都）
// =====================================================================
function buildLabelSpecs(): LabelSpec[] {
  const specs: LabelSpec[] = [];
  for (const c of countries) {
    const size = Math.sqrt(c.area);
    if (size < 0.004) continue; // とても小さな島はのせない
    const height = 0.011 + size * 0.04;
    const showBelow = 1.45 + size * 8;
    const hideBelow = size > 0.05 ? 1 + size * 2.5 : undefined;
    specs.push({ text: countryName(c, lang), lat: c.labelLat, lon: c.labelLon, height, showBelow, hideBelow, style: 'country' });
    // 国名の下に、小さく人口を書く（ひみつカードがある国だけ）
    const info = c.alpha2 ? COUNTRY_INFO[c.alpha2] : undefined;
    if (info) {
      specs.push({
        text: `${t('population', lang)} ${formatPopulation(info.population, lang)}`,
        lat: c.labelLat - RAD_TO_DEG * height * 1.05,
        lon: c.labelLon,
        height: height * 0.55,
        showBelow: Math.min(showBelow, 2.6),
        hideBelow,
        style: 'sub',
        anchorLat: c.labelLat,
        anchorLon: c.labelLon,
      });
    }
  }
  for (const info of Object.values(COUNTRY_INFO)) {
    specs.push({
      text: `★ ${tr(info.capital, lang)}`,
      lat: info.capitalLat,
      lon: info.capitalLon,
      height: 0.0075,
      showBelow: 1.9,
      style: 'capital',
    });
  }
  return specs;
}

async function refreshLabels() {
  const specs = buildLabelSpecs();
  const text = specs.map((s) => s.text).join('');
  // 日本語フォントは文字ごとに分かれて読み込まれるので、使う文字を全部指定して待つ
  await Promise.allSettled([
    document.fonts.load('800 56px "Baloo 2"', text),
    document.fonts.load('800 56px "M PLUS Rounded 1c"', text),
  ]);
  app.setLabels(specs, LABEL_FONT);
}

// =====================================================================
// ボタン・言語
// =====================================================================
$('btn-zoom-in').addEventListener('click', () => app.zoomBy(0.65));
$('btn-zoom-out').addEventListener('click', () => app.zoomBy(1 / 0.65));
$('btn-home').addEventListener('click', () => {
  closeSheet();
  app.goHome();
});
const spinBtn = $('btn-spin');
spinBtn.addEventListener('click', () => {
  app.setSpin(!app.isSpinning);
  spinBtn.classList.toggle('off', !app.isSpinning);
});

const langSelect = $<HTMLSelectElement>('lang');
langSelect.value = lang;
langSelect.addEventListener('change', () => {
  lang = langSelect.value as Lang;
  saveLang(lang);
  applyStaticTexts(lang);
  refreshLabels();
  if (openCard?.kind === 'country') showCountry(openCard.country);
  else if (openCard?.kind === 'spot') showSpot(openCard.spot);
});
applyStaticTexts(lang);
renderFound();

// =====================================================================
// 起動
// =====================================================================
loadCountries()
  .then(async (list) => {
    countries = list;
    await app.init(list);
    await refreshLabels();
  })
  .then(() => $('loading').classList.add('done'))
  .catch((err) => {
    console.error(err);
    $('loading').querySelector('p')!.textContent = '😢 ' + String(err);
  });

// 開発中だけ、ブラウザのコンソールから app をさわれるようにする
if (import.meta.env.DEV) Object.assign(window, { app });
