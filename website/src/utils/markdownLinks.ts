// Перетворення посилань із Markdown-файлів на маршрути сайту.

/** Посилання з розширень на основну книгу: `../Ironsworn-md-ukr/3-Moves_2-….md`. */
const CORE_BOOK_LINK = /^(?:\.\.\/)+Ironsworn-md-(?:ukr|en)\//;

/** Маршрут сайту для внутрішнього посилання з Markdown. */
export function resolveMarkdownLink(href: string, lang: string, linkBase?: string): string {
  const [rawPath, rawHash] = href.split('#');
  const hash = rawHash !== undefined ? `#${rawHash}` : '';
  const file = rawPath.replace(/\.md$/, '').replace(/^\.\//, '');

  if (CORE_BOOK_LINK.test(file)) {
    return `/${lang}/${file.replace(CORE_BOOK_LINK, '')}${hash}`;
  }
  return `${linkBase ?? `/${lang}/`}${file}${hash}`;
}
