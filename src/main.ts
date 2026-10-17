import './style.css';
import { GlobeApp } from './globe/GlobeApp';
import { countryName, flagEmoji, loadCountries, type Country } from './data/countries';
import { applyStaticTexts, detectLang, saveLang, type Lang } from './i18n';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let lang: Lang = detectLang();
let currentCountry: Country | null = null;

const app = new GlobeApp($<HTMLCanvasElement>('globe'));

// ---- 国の名前カード ----
const card = $('country-card');
function showCountry(country: Country | null) {
  currentCountry = country;
  if (!country) {
    card.classList.add('hidden');
    return;
  }
  $('country-flag').textContent = flagEmoji(country.alpha2);
  $('country-name').textContent = countryName(country, lang);
  card.classList.remove('hidden');
  // ぴょこっと出るアニメーションを毎回やり直す
  card.classList.remove('pop');
  void card.offsetWidth;
  card.classList.add('pop');
}
app.onCountrySelected = showCountry;

// ---- ボタン ----
$('btn-zoom-in').addEventListener('click', () => app.zoomBy(0.65));
$('btn-zoom-out').addEventListener('click', () => app.zoomBy(1 / 0.65));
$('btn-home').addEventListener('click', () => app.goHome());
const spinBtn = $('btn-spin');
spinBtn.addEventListener('click', () => {
  app.setSpin(!app.isSpinning);
  spinBtn.classList.toggle('off', !app.isSpinning);
});

// ---- 言語切り替え ----
const langSelect = $<HTMLSelectElement>('lang');
langSelect.value = lang;
langSelect.addEventListener('change', () => {
  lang = langSelect.value as Lang;
  saveLang(lang);
  applyStaticTexts(lang);
  showCountry(currentCountry);
});
applyStaticTexts(lang);

// ---- 起動 ----
loadCountries()
  .then((countries) => app.init(countries))
  .then(() => $('loading').classList.add('done'))
  .catch((err) => {
    console.error(err);
    $('loading').querySelector('p')!.textContent = '😢 ' + String(err);
  });
