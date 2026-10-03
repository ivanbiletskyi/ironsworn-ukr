// Типи контракту для коду розширення. Джерело правди — хост:
// website/src/extensions/api.ts. Тут лише реекспорт, тож розширення,
// зібране з цим submodule, бачить рівно ту версію API, проти якої збирається.

export type {
  ExtensionDefinition,
  HostApi,
  HostUser,
  Lang,
  MarkdownProps,
  NextLinkProps,
  RegisterExtension,
} from '../website/src/extensions/api';
