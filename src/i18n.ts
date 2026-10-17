export type Lang = 'ja' | 'en' | 'ko' | 'zh';

const STRINGS = {
  loading: { ja: 'ちきゅうを つくっているよ…', en: 'Building your planet…', ko: '지구를 만들고 있어요…', zh: '正在制作地球…' },
  subtitle: {
    ja: 'まわして・ズームして・タップしてみよう！',
    en: 'Spin it, zoom it, tap it!',
    ko: '돌리고, 확대하고, 눌러 보세요!',
    zh: '转一转、放大、点一点！',
  },
  capital: { ja: 'しゅと', en: 'Capital', ko: '수도', zh: '首都' },
  population: { ja: 'じんこう', en: 'People', ko: '인구', zh: '人口' },
  language: { ja: 'ことば', en: 'Language', ko: '언어', zh: '语言' },
  hello: { ja: 'こんにちは', en: 'Say hello', ko: '인사', zh: '你好' },
  food: { ja: 'たべもの', en: 'Food', ko: '음식', zh: '美食' },
  secret: { ja: 'ひみつ', en: 'Fun fact', ko: '비밀', zh: '小秘密' },
  meetHere: { ja: 'ここで会える！', en: 'Find them here!', ko: '여기서 만나요!', zh: '在这里找找看！' },
  countryAnimals: { ja: '🐾 この国の動物', en: '🐾 Animals of this country', ko: '🐾 이 나라의 동물', zh: '🐾 这个国家的动物' },
  famousPlaces: { ja: '🏛️ 有名な場所', en: '🏛️ Famous places', ko: '🏛️ 유명한 곳', zh: '🏛️ 著名景点' },
  animalGuide: { ja: 'どうぶつずかん', en: 'Animal guide', ko: '동물 도감', zh: '动物图鉴' },
  animalGuideSub: {
    ja: 'タップすると、その動物のところへ飛んでいくよ',
    en: 'Tap an animal to fly to where it lives',
    ko: '동물을 누르면 그곳으로 날아가요',
    zh: '点一下，就能飞到它住的地方',
  },
  comingSoon: {
    ja: 'この国のひみつカードは じゅんびちゅう！',
    en: 'This country’s secret card is coming soon!',
    ko: '이 나라의 비밀 카드는 준비 중이에요!',
    zh: '这个国家的秘密卡片正在准备中！',
  },
  backToCountry: { ja: '国のカードへ', en: 'Back to country', ko: '나라 카드로', zh: '返回国家' },
  found: { ja: 'みつけた', en: 'Found', ko: '발견', zh: '发现' },
  newFind: { ja: 'あたらしく はっけん！', en: 'New discovery!', ko: '새로운 발견!', zh: '新发现！' },
  ocean: { ja: '海', en: 'Ocean', ko: '바다', zh: '海洋' },
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

/** 人口（百万人）を、その言語で読みやすい形にする */
export function formatPopulation(millions: number, lang: Lang): string {
  if (lang === 'ja' || lang === 'zh') {
    if (millions >= 100) return `約${(millions / 100).toFixed(1).replace(/\.0$/, '')}億人`;
    return `約${Math.round(millions * 100)}万人`;
  }
  if (lang === 'ko') {
    if (millions >= 100) return `약 ${(millions / 100).toFixed(1).replace(/\.0$/, '')}억 명`;
    return `약 ${Math.round(millions * 100)}만 명`;
  }
  if (millions >= 1000) return `about ${(millions / 1000).toFixed(2)} billion`;
  if (millions < 1) return `about ${Math.round(millions * 1000)},000`;
  return `about ${millions} million`;
}

/** data-i18n="キー" が付いた要素の文字を、選んだ言語に入れ替える */
export function applyStaticTexts(lang: Lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n as StringKey, lang);
  });
}
