// @vitest-environment node
// Підпис релізу: хост виконує лише те, що підписано відомим ключем.

import { beforeAll, describe, expect, it } from 'vitest';
import { ExtensionIntegrityError, isHostApiCompatible, sha256Hex, verifyRelease } from '../verify';

const CODE = 'export default () => ({ routes: null });\n// «юнікод»';
let keys: Record<string, JsonWebKey>;
let release: { sha256: string; signature: string; kid: string };

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const bytes = new TextEncoder().encode(CODE);
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, bytes);
  keys = { test: await crypto.subtle.exportKey('jwk', pair.publicKey) };
  release = {
    sha256: await sha256Hex(bytes),
    signature: Buffer.from(signature).toString('base64'),
    kid: 'test',
  };
});

describe('verifyRelease', () => {
  it('accepts a release signed with a known key', async () => {
    await expect(verifyRelease(CODE, release, keys)).resolves.toBeUndefined();
  });

  it('rejects changed code', async () => {
    await expect(verifyRelease(CODE + ' ', release, keys)).rejects.toBeInstanceOf(ExtensionIntegrityError);
  });

  it('rejects a forged signature even with a matching checksum', async () => {
    const forged = { ...release, signature: Buffer.alloc(64, 1).toString('base64') };
    await expect(verifyRelease(CODE, forged, keys)).rejects.toThrow('Підпис релізу недійсний.');
  });

  it('rejects an unknown key id', async () => {
    await expect(verifyRelease(CODE, { ...release, kid: 'other' }, keys)).rejects.toThrow('Невідомий ключ');
  });
});

describe('isHostApiCompatible', () => {
  it('matches the major version only', () => {
    expect(isHostApiCompatible('^1', 1)).toBe(true);
    expect(isHostApiCompatible('1.2', 1)).toBe(true);
    expect(isHostApiCompatible('^2', 1)).toBe(false);
    expect(isHostApiCompatible('', 1)).toBe(false);
  });
});
