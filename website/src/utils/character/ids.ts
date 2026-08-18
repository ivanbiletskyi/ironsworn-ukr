// Генератор ідентифікаторів рядків аркуша — окремим модулем, бо ним
// користуються і `storage.ts` (нормалізація), і `profiles.ts` (створення
// профілю), а імпортувати одне одного вони не можуть: storage вже залежить
// від profiles.

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
