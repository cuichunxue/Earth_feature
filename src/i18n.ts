export type Lang = 'ja' | 'en' | 'ko' | 'zh';

const STRINGS = {
  loading: { ja: 'ちきゅうを つくっているよ…', en: 'Building your planet…', ko: '지구를 만들고 있어요…', zh: '正在制作地球…' },
  subtitle: {
    ja: 'まわして・ズームして・タップしてみよう！',
    en: 'Spin it, zoom it, tap it!',
    ko: '돌리고, 확대하고, 눌러 보세요!',
    zh: '转一转、放大、点一点！',
  },
} satisfies Record<string, Record<Lang, string>>;

export type StringKey = keyof typeof STRINGS;

const STORAGE_KEY = 'earth-toy-lang';

export function detectLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ja' || saved === 'en' || saved === 'ko' || saved === 'zh') return saved;
  } catch {
    /* プライベートモードなどで localStorage が使えないときは無視 */
  }
  const nav = navigator.language.slice(0, 2);
  if (nav === 'ja' || nav === 'ko' || nav === 'zh') return nav;
  return 'en';
}

export function saveLang(lang: Lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* 保存できなくても動作には影響しない */
  }
}

export function t(key: StringKey, lang: Lang): string {
  return STRINGS[key][lang];
}

/** data-i18n="キー" が付いた要素の文字を、選んだ言語に入れ替える */
export function applyStaticTexts(lang: Lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as StringKey, lang);
  });
}
