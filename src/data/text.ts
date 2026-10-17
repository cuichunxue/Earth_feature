import type { Lang } from '../i18n';

/** 多言語テキスト。韓国語・中国語がまだ無いものは英語で表示します */
export interface L {
  ja: string;
  en: string;
  ko?: string;
  zh?: string;
}

export function tr(text: L, lang: Lang): string {
  return text[lang] ?? text.en;
}
