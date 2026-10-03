// Контракт між сайтом (хостом) і розширеннями.
//
// Розширення — окремий ES-модуль, який зберігається не в цьому репозиторії,
// а в Firestore, і завантажується лише для акаунтів із дозволом. Його
// `default` отримує HostApi й повертає ExtensionDefinition. Типи з цього
// файлу реекспортує extension-kit/types.ts, тож хост і розширення завжди
// бачать одну версію контракту.
//
// Версіонування: нові поля — мінорна зміна, вилучення чи зміна сигнатури —
// мажорна (HOST_API_VERSION + 1). Розширення оголошує `requires.hostApi`.

import type { ComponentType, ReactNode } from 'react';
import type { ComboPreset, Oracle } from '../utils/oracles/oracle-types';

export type {
  CompoundOracle,
  MultiColumnOracle,
  RangeOracle,
  RangeRow,
  SimpleOracle,
  TwoStepOracle,
} from '../utils/oracles/oracle-types';

/** Таблиця для сторінки «Генератори оракулів» — та сама форма, що й в основної книги. */
export type ExtensionOracle = Oracle;
/** Кнопка «Комбо»: кидає кілька оракулів за раз. */
export type ExtensionOracleCombo = ComboPreset;

export const HOST_API_VERSION = 1;

/** Глобальна точка, через яку розширення отримують React і router хоста. */
export const HOST_GLOBAL = '__ironswornHost__';

export type Lang = 'uk' | 'en';

export interface HostUser {
  uid: string;
  email: string | null;
}

export interface MarkdownProps {
  source: string;
  /** Куди ведуть відносні посилання на сусідні .md; зазвичай `host.basePath(lang)`. */
  linkBase?: string;
}

export interface NextLinkProps {
  to: string;
  title: string;
}

export interface HostApi {
  apiVersion: number;
  extId: string;
  /** Абсолютний шлях розширення для мови, напр. `/uk/x/demo/`. */
  basePath(lang: Lang): string;
  /** Хук: мова поточного маршруту. */
  useLang(): Lang;
  /** Хук: хто увійшов (розширення відкривається лише після входу). */
  useUser(): HostUser | null;
  ui: {
    /** Markdown-рендерер сайту: ті самі стилі, якорі, посилання на основну книгу. */
    Markdown: ComponentType<MarkdownProps>;
    /** Кнопка «Далі» внизу сторінки, як в основній книзі. */
    NextLink: ComponentType<NextLinkProps>;
  };
  links: {
    /** Маршрут до розділу основної книги: `coreBook('3-Moves_2-Adventure-Moves.md', 'uk', 'face-danger')`. */
    coreBook(file: string, lang: Lang, hash?: string): string;
  };
}

export interface ExtensionDefinition {
  /** Дерево <Route> відносно basePath. */
  routes: ReactNode;
  /**
   * Оракули, які сторінка «Генератори оракулів» показує окремою секцією під
   * назвою розширення. `id` достатньо унікальних у межах розширення: хост
   * сам додає до них префікс `{extId}/`.
   */
  oracles?: ExtensionOracle[];
  /**
   * Комбо для тієї ж сторінки. `oracleIds` — це `id` оракулів самого
   * розширення або оракулів основної книги (`settlement-name`, `action`…).
   */
  oracleCombos?: ExtensionOracleCombo[];
}

export type RegisterExtension = (host: HostApi) => ExtensionDefinition;

// --- Документи Firestore (пише лише CI розширення через Admin SDK) ---------

export interface ExtensionNavItem {
  label: string;
  /** Відносно basePath, без початкового «/». */
  path: string;
}

/** `ext/{extId}` */
export interface ExtensionManifestDoc {
  title: Partial<Record<Lang, string>>;
  nav: Partial<Record<Lang, ExtensionNavItem[]>>;
  requires: { hostApi: string };
  /** Версія релізу, який зараз показується (`releases/{current}`). */
  current: string;
}

/** `ext/{extId}/releases/{version}`; код — у `chunks/{0000…}` поле `data`. */
export interface ExtensionReleaseDoc {
  sha256: string;
  /** ECDSA P-256 / SHA-256 над байтами UTF-8 коду, IEEE P1363 (r‖s), base64. */
  signature: string;
  kid: string;
  chunks: number;
  size: number;
  commit: string;
}
