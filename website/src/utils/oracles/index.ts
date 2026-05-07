export type { Lang, Localized, Oracle, ComboPreset } from './oracle-types';

import oracle01 from './oracle-01-action';
import oracle02 from './oracle-02-theme';
import oracle03 from './oracle-03-region';
import oracle04 from './oracle-04-location';
import oracle05 from './oracle-05-coastal';
import oracle06 from './oracle-06-location-descriptor';
import oracle07 from './oracle-07-settlement-name';
import oracle08 from './oracle-08-quick-settlement-name';
import oracle09 from './oracle-09-settlement-trouble';
import oracle10 from './oracle-10-character-role';
import oracle11 from './oracle-11-character-goal';
import oracle12 from './oracle-12-character-descriptor';
import oracle13 from './oracle-13-ironlander-names';
import oracle14 from './oracle-14-elf-names';
import oracle15 from './oracle-15-other-names';
import oracle16 from './oracle-16-combat-action';
import oracle17 from './oracle-17-mystic-backlash';
import oracle18 from './oracle-18-major-plot-twist';
import oracle19 from './oracle-19-challenge-rank';

import type { Oracle } from './oracle-types';

export const ORACLES: Oracle[] = [
  oracle01, oracle02, oracle03, oracle04, oracle05,
  oracle06, oracle07, oracle08, oracle09, oracle10,
  oracle11, oracle12, oracle13, oracle14, oracle15,
  oracle16, oracle17, oracle18, oracle19,
];

export { COMBO_PRESETS } from './oracle-combos';
