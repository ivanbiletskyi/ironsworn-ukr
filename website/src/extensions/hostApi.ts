// Те, що хост дає розширенню: шляхи, мова, користувач і спільні компоненти.

import type { HostApi } from './api';
import { HOST_API_VERSION } from './api';
import { Markdown, NextLink } from './hostComponents';
import { useLang, useUser } from './hostHooks';

export function createHostApi(extId: string): HostApi {
  return {
    apiVersion: HOST_API_VERSION,
    extId,
    basePath: lang => `/${lang}/x/${extId}/`,
    useLang,
    useUser,
    ui: { Markdown, NextLink },
    links: {
      coreBook: (file, lang, hash) => `/${lang}/${file.replace(/\.md$/, '')}${hash ? `#${hash}` : ''}`,
    },
  };
}
