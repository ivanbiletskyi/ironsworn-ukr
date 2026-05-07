import type { ComboPreset } from './oracle-types';

export const COMBO_PRESETS: ComboPreset[] = [
  {
    id: 'action-theme',
    label: { en: 'Action + Theme', uk: 'Дія + Тема' },
    description: {
      en: 'A creative prompt for nearly any situation.',
      uk: 'Творча підказка для майже будь-якої ситуації.',
    },
    oracleIds: ['action', 'theme'],
  },
  {
    id: 'npc',
    label: { en: 'NPC', uk: 'НПС' },
    description: {
      en: 'Full NPC sketch: role, goal, descriptor, and name.',
      uk: 'Повний начерк НПС: роль, ціль, опис та ім\'я.',
    },
    oracleIds: ['character-role', 'character-goal', 'character-descriptor', 'ironlander-names'],
  },
  {
    id: 'settlement',
    label: { en: 'Settlement', uk: 'Поселення' },
    description: {
      en: 'Settlement name and a trouble facing the community.',
      uk: 'Назва поселення та проблема, з якою воно стикається.',
    },
    oracleIds: ['settlement-name', 'settlement-trouble'],
  },
];
