// Типи контракту для коду розширення. Джерело правди — хост:
// website/src/extensions/api.ts. Тут лише реекспорт, тож розширення,
// зібране з цим submodule, бачить рівно ту версію API, проти якої збирається.

export type {
  CompoundOracle,
  ExtensionDefinition,
  ExtensionOracle,
  ExtensionOracleCombo,
  HostApi,
  HostUser,
  Lang,
  MarkdownProps,
  MultiColumnOracle,
  NextLinkProps,
  RangeOracle,
  RangeRow,
  RegisterExtension,
  SimpleOracle,
  TwoStepOracle,
} from '../website/src/extensions/api';
