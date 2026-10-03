// Перевірка цілісності й автентичності релізу розширення перед виконанням.
//
// Записати реліз у Firestore може лише CI з ключем сервісного акаунта, але
// виконати його хост погодиться, тільки якщо підпис зроблено приватним
// ключем, публічна половина якого вшита сюди (keys.ts). Отже, витік ключа
// Firestore сам по собі не дає запустити чужий код у браузерах гравців.

import type { ExtensionReleaseDoc } from './api';

export class ExtensionIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExtensionIntegrityError';
  }
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function sha256Hex(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', bytes));
}

export async function verifyRelease(
  code: string,
  release: Pick<ExtensionReleaseDoc, 'sha256' | 'signature' | 'kid'>,
  keys: Readonly<Record<string, JsonWebKey>>,
): Promise<void> {
  const jwk = keys[release.kid];
  if (!jwk) throw new ExtensionIntegrityError(`Невідомий ключ підпису «${release.kid}».`);

  const bytes = new TextEncoder().encode(code) as Uint8Array<ArrayBuffer>;
  if ((await sha256Hex(bytes)) !== release.sha256) {
    throw new ExtensionIntegrityError('Контрольна сума релізу не збігається.');
  }

  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify(
    { name: 'ECDSA', hash: 'SHA-256' },
    key,
    fromBase64(release.signature),
    bytes,
  );
  if (!ok) throw new ExtensionIntegrityError('Підпис релізу недійсний.');
}

/** `^1`, `1`, `1.x` → чи підходить мажорна версія API хоста. */
export function isHostApiCompatible(range: string, hostVersion: number): boolean {
  const major = Number(/^\^?(\d+)/.exec(range.trim())?.[1]);
  return Number.isInteger(major) && major === hostVersion;
}
