// Vite-пресет для розширень сайту ironsworn-ukr.
//
// У vite.config.mjs розширення:
//   import { extensionPreset } from './host/extension-kit/vite.mjs';
//   export default extensionPreset();
//
// Що робить:
// - React, react/jsx-runtime і react-router-dom НЕ потрапляють у бандл:
//   імпорти підміняються модулями хоста з globalThis.__ironswornHost__
//   (див. website/src/extensions/hostModules.ts). Так на сторінці лишається
//   один React і один router.
// - Збирає один ES-модуль dist/extension.js: без чанків, CSS вбудовано в JS.
// - `vite` (dev) віддає розширення на :5174 з CORS для хоста на :5173.

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { execSync } from 'node:child_process';

const HOST_GLOBAL = '__ironswornHost__';
const SHARED = ['react', 'react/jsx-runtime', 'react/jsx-dev-runtime', 'react-router-dom', 'react-router'];
const VIRTUAL = '\0ironsworn-host:';
const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

export function readManifest(root) {
  return JSON.parse(fs.readFileSync(path.join(root, 'extension.json'), 'utf8'));
}

function currentVersion(root) {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { cwd: root }).toString().trim();
  } catch {
    return 'local';
  }
}

/** Імпорти спільних модулів → значення з globalThis хоста. */
function hostModules(root) {
  const require = createRequire(path.join(root, 'package.json'));
  return {
    name: 'ironsworn-host-modules',
    enforce: 'pre',
    resolveId(id) {
      return SHARED.includes(id) ? VIRTUAL + id : null;
    },
    load(id) {
      if (!id.startsWith(VIRTUAL)) return null;
      const name = id.slice(VIRTUAL.length);
      // Іменовані експорти беремо з тієї ж версії пакета, що встановлена в
      // розширенні (devDependency): ESM вимагає перелічити їх статично.
      const names = Object.keys(require(name)).filter(k => k !== 'default' && IDENTIFIER.test(k));
      return [
        `const m = globalThis.${HOST_GLOBAL}?.modules?.[${JSON.stringify(name)}];`,
        `if (!m) throw new Error(${JSON.stringify(`Хост не надав модуль ${name}`)});`,
        'export default m.default ?? m;',
        ...names.map(k => `export const ${k} = m[${JSON.stringify(k)}];`),
      ].join('\n');
    },
  };
}

/** CSS бандла → <style data-ext="id"> на початку модуля. */
function inlineCss(extId) {
  return {
    name: 'ironsworn-inline-css',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const css = [];
      for (const [file, item] of Object.entries(bundle)) {
        if (item.type === 'asset' && file.endsWith('.css')) {
          css.push(String(item.source));
          delete bundle[file];
        }
      }
      if (!css.length) return;
      const entry = Object.values(bundle).find(item => item.type === 'chunk' && item.isEntry);
      const inject =
        `(()=>{if(document.querySelector('style[data-ext=${JSON.stringify(extId)}]'))return;` +
        `const s=document.createElement('style');s.dataset.ext=${JSON.stringify(extId)};` +
        `s.textContent=${JSON.stringify(css.join('\n'))};document.head.appendChild(s);})();\n`;
      entry.code = inject + entry.code;
    },
  };
}

export function extensionPreset({ root = process.cwd() } = {}) {
  const manifest = readManifest(root);
  return {
    root,
    plugins: [hostModules(root), inlineCss(manifest.id)],
    define: {
      __EXT_ID__: JSON.stringify(manifest.id),
      __EXT_VERSION__: JSON.stringify(currentVersion(root)),
    },
    oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
    optimizeDeps: { exclude: SHARED, noDiscovery: true, include: [] },
    server: { port: 5174, strictPort: true, cors: true },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      cssCodeSplit: false,
      sourcemap: false,
      lib: {
        entry: path.join(root, manifest.entry),
        formats: ['es'],
        fileName: () => 'extension.js',
      },
      rolldownOptions: {
        output: { codeSplitting: false },
      },
    },
  };
}
