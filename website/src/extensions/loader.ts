// Звідки беруться розширення.
//
// Firestore (пише лише CI розширення, читає — правила, див. firestore.rules):
//   grants/{email}/ext/{extId}               — дозволи поточного акаунта
//   ext/{extId}                              — маніфест: назва, меню, current
//   ext/{extId}/releases/{version}           — підпис і контрольна сума
//   ext/{extId}/releases/{version}/chunks/*  — сам код, шматками
//
// У dev-збірці VITE_EXT_DEV="id=http://localhost:5174" бере розширення прямо
// з його Vite-сервера (без Firestore й підпису). У production цього шляху немає.

import { getFirebase } from '../utils/firebase/client';
import type {
  ExtensionManifestDoc,
  ExtensionNavItem,
  ExtensionReleaseDoc,
  Lang,
  RegisterExtension,
} from './api';
import { HOST_API_VERSION } from './api';
import { SIGNING_KEYS } from './keys';
import { isHostApiCompatible, verifyRelease } from './verify';

export interface CatalogEntry {
  id: string;
  title: Partial<Record<Lang, string>>;
  nav: Partial<Record<Lang, ExtensionNavItem[]>>;
  requires: string;
  current: string;
  /** Лише в dev: адреса модуля на Vite-сервері розширення. */
  devEntry?: string;
}

export class ExtensionIncompatibleError extends Error {
  constructor() {
    super('Розширення потребує іншої версії сайту.');
    this.name = 'ExtensionIncompatibleError';
  }
}

const CACHE_NAME = 'ironsworn-ext-v1';

function devOverrides(): Map<string, string> {
  const overrides = new Map<string, string>();
  if (!import.meta.env.DEV) return overrides;
  const raw = String(import.meta.env.VITE_EXT_DEV ?? '');
  for (const pair of raw.split(',')) {
    const [id, origin] = pair.split('=').map(s => s.trim());
    if (id && origin) overrides.set(id, origin);
  }
  return overrides;
}

async function devCatalog(): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  for (const [id, origin] of devOverrides()) {
    try {
      const manifest = await (await fetch(new URL('/extension.json', origin))).json();
      entries.push({
        id,
        title: manifest.title ?? {},
        nav: manifest.nav ?? {},
        requires: manifest.requires?.hostApi ?? '',
        current: 'dev',
        devEntry: new URL(`/${manifest.entry}`, origin).href,
      });
    } catch (cause) {
      console.error(`Dev-розширення ${id} недоступне на ${origin}:`, cause);
    }
  }
  return entries;
}

/** Розширення, до яких має доступ ця пошта. Порожньо — сайт про них не згадує. */
export async function fetchCatalog(email: string): Promise<CatalogEntry[]> {
  const { db } = await getFirebase();
  const { collection, doc, getDoc, getDocs } = await import('firebase/firestore');

  const grants = await getDocs(collection(db, 'grants', email.toLowerCase(), 'ext'));
  const granted = await Promise.all(
    grants.docs.map(async grant => {
      const snap = await getDoc(doc(db, 'ext', grant.id));
      if (!snap.exists()) return null;
      const data = snap.data() as ExtensionManifestDoc;
      const entry: CatalogEntry = {
        id: grant.id,
        title: data.title ?? {},
        nav: data.nav ?? {},
        requires: data.requires?.hostApi ?? '',
        current: data.current,
      };
      return entry;
    }),
  );

  const dev = await devCatalog();
  const devIds = new Set(dev.map(e => e.id));
  return [...granted.filter((e): e is CatalogEntry => e !== null && !devIds.has(e.id)), ...dev];
}

// --- Код релізу -------------------------------------------------------------

async function cacheGet(sha: string): Promise<string | null> {
  if (typeof caches === 'undefined') return null;
  const hit = await (await caches.open(CACHE_NAME)).match(`/__ext__/${sha}`);
  return hit ? hit.text() : null;
}

async function cachePut(sha: string, code: string): Promise<void> {
  if (typeof caches === 'undefined') return;
  await (await caches.open(CACHE_NAME)).put(`/__ext__/${sha}`, new Response(code));
}

/** Під час виходу з акаунта: код розширень не лишається на пристрої. */
export async function clearExtensionCache(): Promise<void> {
  if (typeof caches !== 'undefined') await caches.delete(CACHE_NAME);
}

async function fetchReleaseCode(extId: string, version: string): Promise<{ code: string; release: ExtensionReleaseDoc }> {
  const { db } = await getFirebase();
  const { collection, doc, getDoc, getDocs } = await import('firebase/firestore');

  const releaseSnap = await getDoc(doc(db, 'ext', extId, 'releases', version));
  if (!releaseSnap.exists()) throw new Error(`Реліз ${version} не знайдено.`);
  const release = releaseSnap.data() as ExtensionReleaseDoc;

  const cached = await cacheGet(release.sha256);
  if (cached !== null) return { code: cached, release };

  // Документи повертаються впорядкованими за id: 0000, 0001, …
  const chunks = await getDocs(collection(db, 'ext', extId, 'releases', version, 'chunks'));
  if (chunks.size !== release.chunks) throw new Error('Реліз завантажено не повністю.');
  const code = chunks.docs.map(c => String(c.data().data ?? '')).join('');
  return { code, release };
}

async function importCode(code: string): Promise<{ default?: unknown }> {
  const url = URL.createObjectURL(new Blob([code], { type: 'text/javascript' }));
  try {
    return await import(/* @vite-ignore */ url);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function registerFrom(module: { default?: unknown }): RegisterExtension {
  if (typeof module.default !== 'function') throw new Error('Модуль розширення не експортує register().');
  return module.default as RegisterExtension;
}

/** Завантажує, перевіряє й виконує модуль розширення. */
export async function loadExtension(entry: CatalogEntry): Promise<RegisterExtension> {
  if (!isHostApiCompatible(entry.requires, HOST_API_VERSION)) throw new ExtensionIncompatibleError();

  const { installHostModules } = await import('./hostModules');
  installHostModules();

  if (entry.devEntry) return registerFrom(await import(/* @vite-ignore */ entry.devEntry));

  const { code, release } = await fetchReleaseCode(entry.id, entry.current);
  await verifyRelease(code, release, SIGNING_KEYS);
  await cachePut(release.sha256, code);
  return registerFrom(await importCode(code));
}
