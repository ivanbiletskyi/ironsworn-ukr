// Layout audit for the moves reference (/uk/moves).
//
// Same approach as audit-layout.mjs: jsdom has no layout engine, so this
// drives a real headless Chrome over the DevTools protocol and measures
// horizontal overflow, tap targets and the opened states (the move sheet on a
// phone, the drawer next to the cheat sheet on a desktop).
//
// Usage:
//   yarn dev                      # in another terminal
//   yarn audit:layout:moves
//
// Options via env vars:
//   MOVES_URL       page to audit      (default http://localhost:5173/uk/moves)
//   CHROME_PATH     browser executable (default macOS Google Chrome)
//   DEBUG_PORT      DevTools port      (default 9223)
//   SCREENSHOT_DIR  also save a PNG of every checked state there

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const MOVES_URL = process.env.MOVES_URL ?? 'http://localhost:5173/uk/moves';
const CHROME_PATH =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = Number(process.env.DEBUG_PORT ?? 9223);
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR;

const WIDTHS = [320, 360, 390, 480, 768, 900, 1024, 1280, 1440];

const OVERFLOW_PROBE = `
  JSON.stringify([...document.querySelectorAll('.moves-page *, .navigation *')]
    .filter(el => el.scrollWidth > el.clientWidth + 1
      && getComputedStyle(el).overflowX === 'visible'
      && el.clientWidth > 0
      && !el.closest('.moves-print'))
    .map(el => ({
      selector: el.className.toString().split(' ')[0] || el.tagName,
      text: el.textContent.trim().slice(0, 24),
      content: el.scrollWidth,
      box: el.clientWidth,
    }))
    .slice(0, 12))
`;

const TOUCH_PROBE = `
  JSON.stringify([...document.querySelectorAll(
      '.moves-page button, .moves-page input, .moves-page a')]
    // Посилання всередині речення — виняток WCAG 2.5.8 для вбудованих посилань.
    .filter(el => !el.closest('.moves-print') && !el.closest('.combat-hint')
      && !(el.tagName === 'A' && el.closest('p')))
    .map(el => {
      const rect = el.getBoundingClientRect();
      return {
        selector: el.className.toString().split(' ')[0] || el.tagName,
        text: el.textContent.trim().slice(0, 20),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    })
    .filter(m => m.width > 0 && m.height > 0 && (m.width < 24 || m.height < 24))
    .slice(0, 20))
`;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function connect() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const targets = await (await fetch(`http://localhost:${DEBUG_PORT}/json`)).json();
      const page = targets.find(target => target.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      // browser not up yet
    }
    await wait(250);
  }
  throw new Error('Could not reach Chrome over the DevTools protocol.');
}

function createClient(socket) {
  let id = 0;
  const pending = new Map();
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    message.error ? entry.reject(new Error(JSON.stringify(message.error))) : entry.resolve(message.result);
  };
  return (method, params = {}) =>
    new Promise((resolve, reject) => {
      const messageId = ++id;
      pending.set(messageId, { resolve, reject });
      socket.send(JSON.stringify({ id: messageId, method, params }));
    });
}

const profile = mkdtempSync(join(tmpdir(), 'ironsworn-moves-audit-'));
const chrome = spawn(
  CHROME_PATH,
  ['--headless', '--disable-gpu', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: 'ignore' },
);
chrome.on('error', error => {
  console.error(`Could not start Chrome at ${CHROME_PATH}\n${error.message}`);
  process.exit(1);
});

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};

try {
  try {
    await fetch(MOVES_URL);
  } catch {
    throw new Error(`Cannot reach ${MOVES_URL}\nStart the dev server first (yarn dev), or set MOVES_URL.`);
  }

  const socket = new WebSocket(await connect());
  await new Promise(resolve => (socket.onopen = resolve));
  const send = createClient(socket);
  const evaluate = async expression => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };

  await send('Page.enable');

  const load = async (path, width, height = 900) => {
    const mobile = width <= 700;
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await send('Page.navigate', { url: MOVES_URL.replace(/\/uk\/moves.*$/, path) });
    await wait(1300);
  };

  const shoot = async name => {
    if (!SCREENSHOT_DIR) return;
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SCREENSHOT_DIR, `${name}.png`), Buffer.from(data, 'base64'));
  };

  const overflowCheck = async name => {
    const documentWidth = await evaluate('document.documentElement.scrollWidth');
    const viewport = await evaluate('innerWidth');
    const overflowing = JSON.parse(await evaluate(OVERFLOW_PROBE));
    check(
      name,
      documentWidth <= viewport && overflowing.length === 0,
      `document ${documentWidth}/${viewport}, overflowing ${JSON.stringify(overflowing)}`,
    );
  };

  console.log('\nHorizontal overflow: list and an opened move');
  for (const width of WIDTHS) {
    await load('/uk/moves', width);
    await overflowCheck(`${width}px list`);
    await shoot(`list-${width}`);
    await load('/uk/moves/face-danger', width);
    await overflowCheck(`${width}px /uk/moves/face-danger`);
    await shoot(`face-danger-${width}`);
  }

  console.log('\nCheat sheet and trainer');
  for (const width of [360, 1280, 1440]) {
    await load('/uk/moves?view=sheet', width);
    await overflowCheck(`${width}px cheat sheet`);
    await shoot(`sheet-${width}`);
    await load('/uk/moves?view=train', width);
    await overflowCheck(`${width}px trainer`);
  }
  await load('/uk/moves/endure-harm?view=sheet', 1440);
  check(
    'the drawer opens next to the cheat sheet',
    await evaluate(`!!document.querySelector('.move-drawer .move-detail')`),
  );
  await shoot('sheet-drawer-1440');

  // Шпаргалка має вміщатися на одному екрані 1440×900 (дизайн-план).
  await load('/uk/moves?view=sheet', 1440, 900);
  const sheetFits = JSON.parse(
    await evaluate(`
      JSON.stringify((() => {
        const sheet = document.querySelector('.cheat-sheet');
        const rect = sheet.getBoundingClientRect();
        return { bottom: Math.round(rect.bottom + document.querySelector('.moves-single').scrollTop) };
      })())
    `),
  );
  check('the cheat sheet fits a 1440×900 screen', sheetFits.bottom <= 900 + 120, JSON.stringify(sheetFits));

  console.log('\nThe move sheet on a phone (390px)');
  await load('/uk/moves/endure-harm', 390, 844);
  const sheet = JSON.parse(
    await evaluate(`
      JSON.stringify((() => {
        const el = document.querySelector('.move-sheet');
        const switcher = document.querySelector('.outcome-switcher--floating');
        if (!el || !switcher) return null;
        const s = switcher.getBoundingClientRect();
        return { sheet: el.getBoundingClientRect().height, switcherBottom: Math.round(s.bottom),
          switcherHeight: Math.round(s.height), viewport: innerHeight };
      })())
    `),
  );
  check('the move opens as a fullscreen sheet', sheet && sheet.sheet === sheet.viewport, JSON.stringify(sheet));
  check(
    'the outcome switcher sits at the bottom and is tappable',
    sheet && sheet.switcherBottom <= sheet.viewport && sheet.switcherHeight >= 44,
    JSON.stringify(sheet),
  );
  await evaluate(`document.querySelector('.outcome-switcher__btn--weak').click()`);
  await wait(400);
  const dimmed = await evaluate(`document.querySelectorAll('.outcome-band--dimmed').length`);
  check('picking a result dims the other two bands', dimmed === 2, `dimmed ${dimmed}`);
  await shoot('phone-sheet-weak');
  await overflowCheck('the sheet fits the viewport');

  const tooSmall = JSON.parse(await evaluate(TOUCH_PROBE));
  check('nothing in the sheet is smaller than 24px', tooSmall.length === 0, JSON.stringify(tooSmall));

  const input = await evaluate(`
    (() => {
      history.back();
      return true;
    })()
  `);
  await wait(800);
  check(
    'system Back closes the sheet',
    input && (await evaluate(`!document.querySelector('.move-sheet')`)),
  );

  console.log('\nTap targets on the phone list (390px)');
  await load('/uk/moves', 390, 844);
  const listSmall = JSON.parse(await evaluate(TOUCH_PROBE));
  check('nothing smaller than 24px', listSmall.length === 0, JSON.stringify(listSmall));
  const sizes = JSON.parse(
    await evaluate(`
      JSON.stringify(['.move-search__input', '.move-card__link', '.star-btn', '.chip']
        .map(selector => {
          const el = document.querySelector('.moves-page ' + selector);
          if (!el) return { selector, missing: true };
          const rect = el.getBoundingClientRect();
          return { selector, height: Math.round(rect.height),
            font: getComputedStyle(el).fontSize };
        }))
    `),
  );
  const of = selector => sizes.find(size => size.selector === selector) ?? {};
  check('the search field is at least 44px tall', of('.move-search__input').height >= 44, JSON.stringify(sizes));
  check('the search field uses 16px text (no iOS zoom)', of('.move-search__input').font === '16px');
  check('list cards are at least 56px tall', of('.move-card__link').height >= 56);
  check('stars are at least 44px tall', of('.star-btn').height >= 44);
  check('chips are at least 36px tall', of('.chip').height >= 36);

  await evaluate(`
    (() => {
      const input = document.querySelector('.move-search__input');
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(input, 'тікаю');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    })()
  `);
  await wait(400);
  const first = await evaluate(`document.querySelector('.move-card__name')?.textContent`);
  check('searching «тікаю» finds «Стріти небезпеку» first', first === 'Стріти небезпеку', first);
  await shoot('phone-search');

  console.log('\nLight theme');
  for (const width of [1440, 390]) {
    await load('/uk/moves/face-danger', width);
    await evaluate(`document.documentElement.setAttribute('data-theme', 'light')`);
    await wait(300);
    await overflowCheck(`${width}px has no overflow in the light theme`);
    await shoot(`light-${width}`);
  }

  // Друкована шпаргалка — на 2 аркуші A4 (дизайн-план, «Друк»).
  console.log('\nPrint');
  await load('/uk/moves', 1440);
  const { data: pdf } = await send('Page.printToPDF', {
    paperWidth: 8.27,
    paperHeight: 11.69,
    preferCSSPageSize: true,
  });
  const pdfText = Buffer.from(pdf, 'base64').toString('latin1');
  const pages = (pdfText.match(/\/Type\s*\/Page[^s]/g) ?? []).length;
  check('the cheat sheet prints on 2 A4 pages', pages > 0 && pages <= 2, `${pages} pages`);
  if (SCREENSHOT_DIR) writeFileSync(join(SCREENSHOT_DIR, 'print.pdf'), Buffer.from(pdf, 'base64'));

  console.log('\nReduced motion');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await load('/uk/moves/face-danger', 390, 844);
  const animation = await evaluate(`getComputedStyle(document.querySelector('.move-sheet')).animationName`);
  check('the sheet slide is switched off', animation === 'none', animation);

  socket.close();
} catch (error) {
  console.error(`\n${error.message}`);
  failed++;
} finally {
  chrome.kill();
  await Promise.race([once(chrome, 'exit'), wait(3000)]);
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    console.warn(`Left a temporary Chrome profile behind: ${profile}`);
  }
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
