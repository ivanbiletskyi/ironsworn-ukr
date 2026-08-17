// Каталог профілів набору «Залізна Присяга»: 78 карток у порядку сторінок.
// Дані незмінні — стан гравця (відмічені навички, поля, шкала) живе
// в `Character.profiles`, див. PROFILES_PLAN.md §4.

export type {
  Profile,
  ProfileBlock,
  ProfileField,
  ProfileTrack,
  ProfileType,
} from './profile-types';
export { PROFILE_TYPES } from './profile-types';

import type { Profile, ProfileType } from './profile-types';
import COMPANIONS from './profile-01-companions';
import PATHS from './profile-02-paths';
import TALENTS from './profile-03-talents';
import RITUALS from './profile-04-rituals';

export const PROFILES: Profile[] = [...COMPANIONS, ...PATHS, ...TALENTS, ...RITUALS];

export const PROFILES_BY_TYPE: Record<ProfileType, Profile[]> = {
  companion: COMPANIONS,
  path: PATHS,
  talent: TALENTS,
  ritual: RITUALS,
};

const BY_ID = new Map(PROFILES.map(profile => [profile.id, profile]));

/** `undefined` для невідомого ключа: нормалізація на цьому відкидає запис. */
export function findProfile(id: string): Profile | undefined {
  return BY_ID.get(id);
}
