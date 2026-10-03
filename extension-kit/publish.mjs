#!/usr/bin/env node
// Публікація розширення у Firestore сайту ironsworn-ukr. Запускається з кореня
// репозиторію розширення після `vite build`:
//
//   node host/extension-kit/publish.mjs --dry-run      перевірки, без запису
//   node host/extension-kit/publish.mjs                публікація dist/extension.js
//   node host/extension-kit/publish.mjs rollback <v>   показувати реліз <v>
//
// Оточення:
//   FIREBASE_SERVICE_ACCOUNT  JSON ключа сервісного акаунта (роль Cloud Datastore User)
//   EXT_SIGNING_KEY           приватний JWK із полем kid (extension-kit/keygen.mjs)
//   FIREBASE_PROJECT_ID       типово ironsworn-uk
//
// Пише:
//   ext/{id}                               маніфест: назва, меню, current
//   ext/{id}/releases/{version}            підпис, контрольна сума, розмір
//   ext/{id}/releases/{version}/chunks/*   код шматками
//   grants/{email}/ext/{id}                дозволи з access.json
//   extAcl/{id}                            попередній список пошт (клієнтам недоступний)

import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? 'ironsworn-uk';
const BUNDLE = path.join(ROOT, 'dist', 'extension.js');
/** Документ Firestore ≤ 1 МіБ; 200 000 UTF-16 одиниць ≤ 800 КБ в UTF-8. */
const CHUNK_UNITS = 200_000;
const KEEP_RELEASES = 5;

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

// --- Перевірки ----------------------------------------------------------------

function fail(errors) {
  console.error(errors.map(e => `✗ ${e}`).join('\n'));
  process.exit(1);
}

function readJson(file) {
  return JSON.parse(readFileSync(path.join(ROOT, file), 'utf8'));
}

function readManifest() {
  const m = readJson('extension.json');
  const errors = [];
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(m.id ?? '')) errors.push('extension.json: id — 2–40 символів a-z, 0-9, «-»');
  if (!m.title?.uk) errors.push('extension.json: потрібен title.uk');
  if (!/^\^?\d+/.test(m.requires?.hostApi ?? '')) errors.push('extension.json: потрібен requires.hostApi, напр. "^1"');
  if (!m.entry) errors.push('extension.json: потрібен entry');
  for (const [lang, items] of Object.entries(m.nav ?? {})) {
    if (!Array.isArray(items) || items.some(i => !i.label || typeof i.path !== 'string')) {
      errors.push(`extension.json: nav.${lang} — масив { label, path }`);
    }
  }
  if (errors.length) fail(errors);
  return m;
}

function readAccess() {
  const raw = readJson('access.json');
  if (!Array.isArray(raw.emails)) fail(['access.json: очікується { "emails": [...] }']);
  const emails = [...new Set(raw.emails.map(e => String(e).trim().toLowerCase()))];
  const bad = emails.filter(e => !/^[^@\s/]+@[^@\s/]+\.[^@\s/]+$/.test(e));
  if (bad.length) fail([`access.json: некоректні адреси: ${bad.join(', ')}`]);
  return emails;
}

/** Той самий алгоритм, що в GitHub і rehype-slug (github-slugger). */
function slug(text) {
  return text.trim().toLowerCase().replace(/[^\p{L}\p{M}\p{N}\p{Pc} -]/gu, '').replace(/ /g, '-');
}

function anchorsOf(body) {
  const seen = new Map();
  const anchors = new Set();
  for (const m of body.matchAll(/^(?:>\s*)?#{1,6}\s+(.+?)\s*$/gm)) {
    const base = slug(m[1]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    anchors.add(n ? `${base}-${n}` : base);
  }
  return anchors;
}

/** Внутрішні посилання й якорі в content/{lang}/*.md. */
function checkContent() {
  const dir = path.join(ROOT, 'content');
  if (!existsSync(dir)) return [];
  const errors = [];
  for (const lang of readdirSync(dir)) {
    const langDir = path.join(dir, lang);
    const files = new Map(
      readdirSync(langDir).filter(f => f.endsWith('.md')).map(f => [f, readFileSync(path.join(langDir, f), 'utf8')]),
    );
    for (const [file, body] of files) {
      if (Buffer.byteLength(body) > 900_000) errors.push(`${lang}/${file}: файл понад 900 КБ`);
      for (const m of body.matchAll(/\]\(([^)\s]+)\)/g)) {
        const href = m[1];
        if (/^(https?:|mailto:)/.test(href) || href.startsWith('../Ironsworn-md-')) continue;
        const [target, hash] = href.split('#');
        const targetBody = target ? files.get(target) : body;
        if (targetBody === undefined) errors.push(`${lang}/${file}: немає файлу «${target}»`);
        else if (hash && !anchorsOf(targetBody).has(hash)) errors.push(`${lang}/${file}: немає якоря «#${hash}» у ${target || file}`);
      }
    }
  }
  return errors;
}

function currentVersion() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  const sha = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
  const dirty = execSync('git status --porcelain', { cwd: ROOT }).toString().trim();
  return dirty ? `${sha}-dirty` : sha;
}

// --- Підпис і шматки ------------------------------------------------------------

function signBundle(code) {
  const raw = process.env.EXT_SIGNING_KEY;
  if (!raw) fail(['EXT_SIGNING_KEY не задано']);
  const { kid, ...jwk } = JSON.parse(raw);
  if (!kid) fail(['EXT_SIGNING_KEY: немає kid']);
  const key = createPrivateKey({ key: jwk, format: 'jwk' });
  const bytes = Buffer.from(code, 'utf8');
  const signature = sign('sha256', bytes, { key, dsaEncoding: 'ieee-p1363' });
  // Самоперевірка тим самим шляхом, яким перевірятиме хост.
  if (!verify('sha256', bytes, { key: createPublicKey(key), dsaEncoding: 'ieee-p1363' }, signature)) {
    fail(['самоперевірка підпису не пройшла']);
  }
  return {
    kid,
    signature: signature.toString('base64'),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    size: bytes.length,
  };
}

/** Ріже рядок, не розриваючи сурогатних пар (Firestore зберігає UTF-8). */
function chunk(code) {
  const parts = [];
  let start = 0;
  while (start < code.length) {
    let end = Math.min(start + CHUNK_UNITS, code.length);
    const unit = code.charCodeAt(end - 1);
    if (end < code.length && unit >= 0xd800 && unit <= 0xdbff) end -= 1;
    parts.push(code.slice(start, end));
    start = end;
  }
  return parts;
}

// --- Firestore ---------------------------------------------------------------------

async function connect() {
  const { initializeApp, cert, applicationDefault } = await import('firebase-admin/app');
  const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  initializeApp({ credential: json ? cert(JSON.parse(json)) : applicationDefault(), projectId: PROJECT_ID });
  return { db: getFirestore(), FieldValue };
}

async function syncGrants(db, FieldValue, extId, emails) {
  const aclRef = db.collection('extAcl').doc(extId);
  const previous = (await aclRef.get()).data()?.emails ?? [];
  const batch = db.batch();
  for (const email of previous) {
    if (!emails.includes(email)) batch.delete(db.doc(`grants/${email}/ext/${extId}`));
  }
  for (const email of emails) {
    batch.set(db.doc(`grants/${email}/ext/${extId}`), { extId, grantedAt: FieldValue.serverTimestamp() }, { merge: true });
  }
  batch.set(aclRef, { emails, updatedAt: FieldValue.serverTimestamp() });
  await batch.commit();
  const removed = previous.filter(e => !emails.includes(e)).length;
  console.log(`✓ Доступ: ${emails.length} адрес${removed ? `, відкликано ${removed}` : ''}.`);
}

async function pruneReleases(db, extId, current) {
  const releases = await db.collection('ext').doc(extId).collection('releases').get();
  const old = releases.docs
    .sort((a, b) => (b.data().builtAt?.toMillis?.() ?? 0) - (a.data().builtAt?.toMillis?.() ?? 0))
    .slice(KEEP_RELEASES)
    .filter(d => d.id !== current);
  for (const doc of old) await db.recursiveDelete(doc.ref);
  if (old.length) console.log(`✓ Прибрано старих релізів: ${old.length}.`);
}

async function publish(manifest, emails) {
  if (!existsSync(BUNDLE)) fail(['немає dist/extension.js — спершу `vite build`']);
  const code = readFileSync(BUNDLE, 'utf8');
  const version = currentVersion();
  const signed = signBundle(code);
  const parts = chunk(code);
  console.log(`${manifest.id}@${version}: ${(signed.size / 1024).toFixed(1)} КБ, ${parts.length} шм., ключ ${signed.kid}`);

  if (DRY_RUN) {
    console.log('--dry-run: у Firestore нічого не записано.');
    return;
  }

  const { db, FieldValue } = await connect();
  const extRef = db.collection('ext').doc(manifest.id);
  const releaseRef = extRef.collection('releases').doc(version);

  // Спершу реліз цілком, і лише потім перемикаємо current: гравець ніколи не
  // отримає маніфест, що вказує на недописаний реліз.
  const old = await releaseRef.collection('chunks').listDocuments();
  const batch = db.batch();
  for (const ref of old) batch.delete(ref);
  parts.forEach((data, i) => batch.set(releaseRef.collection('chunks').doc(String(i).padStart(4, '0')), { data }));
  batch.set(releaseRef, {
    ...signed,
    chunks: parts.length,
    commit: process.env.GITHUB_SHA ?? version,
    builtAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  await extRef.set({
    title: manifest.title,
    nav: manifest.nav ?? {},
    requires: manifest.requires,
    current: version,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log(`✓ Опубліковано ${manifest.id}@${version} у ${PROJECT_ID}.`);

  await syncGrants(db, FieldValue, manifest.id, emails);
  await pruneReleases(db, manifest.id, version);
}

async function rollback(manifest, version) {
  if (!version) fail(['вкажіть версію: publish.mjs rollback <version>']);
  const { db, FieldValue } = await connect();
  const extRef = db.collection('ext').doc(manifest.id);
  if (!(await extRef.collection('releases').doc(version).get()).exists) fail([`реліз ${version} не знайдено`]);
  await extRef.update({ current: version, updatedAt: FieldValue.serverTimestamp() });
  console.log(`✓ ${manifest.id} тепер показує ${version}.`);
}

async function main() {
  const manifest = readManifest();
  const emails = readAccess();
  const errors = checkContent();
  if (errors.length) fail(errors);

  if (args[0] === 'rollback') return rollback(manifest, args[1]);

  if (DRY_RUN && !existsSync(BUNDLE)) {
    console.log(`${manifest.id}: маніфест, доступ (${emails.length}) і посилання в порядку. Бандла ще немає.`);
    return;
  }
  if (DRY_RUN && !process.env.EXT_SIGNING_KEY) {
    console.log(`${manifest.id}: перевірки пройдено; підпис пропущено (немає EXT_SIGNING_KEY).`);
    return;
  }
  await publish(manifest, emails);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
