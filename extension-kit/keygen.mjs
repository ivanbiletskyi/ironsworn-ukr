#!/usr/bin/env node
// Генерує пару ключів ECDSA P-256 для підпису релізів розширень.
//
//   node extension-kit/keygen.mjs ~/.config/ironsworn-ext/signing-key.json
//
// Приватний ключ (JWK з полем kid) записується у вказаний файл з правами 600 —
// його вміст стає секретом EXT_SIGNING_KEY у приватних репо розширень.
// Публічний ключ друкується в консоль: додайте його в
// website/src/extensions/keys.ts під тим самим kid.

import { generateKeyPairSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const target = process.argv[2];
if (!target) {
  console.error('Вкажіть файл для приватного ключа: node extension-kit/keygen.mjs <path>');
  process.exit(1);
}
if (existsSync(target)) {
  console.error(`${target} уже існує — не перезаписую.`);
  process.exit(1);
}

const kid = `k${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`;
const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });

mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
writeFileSync(target, JSON.stringify({ ...privateKey.export({ format: 'jwk' }), kid }) + '\n', { mode: 0o600 });

const { kty, crv, x, y } = publicKey.export({ format: 'jwk' });
console.log(`Приватний ключ: ${target}`);
console.log(`Публічний ключ для keys.ts:\n  '${kid}': ${JSON.stringify({ kty, crv, x, y })},`);
