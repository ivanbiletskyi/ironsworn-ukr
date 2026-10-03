// Layout audit for the character sheet.
//
// This cannot live in the vitest suite: jsdom has no layout engine, so it
// cannot measure horizontal overflow or tap-target sizes. It drives a real
// headless Chrome over the DevTools protocol instead.
//
// Usage:
//   yarn dev                      # in another terminal
//   yarn audit:layout
//
// Options via env vars:
//   SHEET_URL   page to audit      (default http://localhost:5173/uk/character)
//   CHROME_PATH browser executable (default macOS Google Chrome)
//   DEBUG_PORT  DevTools port      (default 9222)
//   SCREENSHOT_DIR  also save PNGs of the moves drawer states there

import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SHEET_URL = process.env.SHEET_URL ?? 'http://localhost:5173/uk/character';
const CHROME_PATH =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const DEBUG_PORT = Number(process.env.DEBUG_PORT ?? 9222);
const SCREENSHOT_DIR = process.env.SCREENSHOT_DIR;

const WIDTHS = [320, 360, 390, 414, 480, 600, 700, 768, 900, 1024, 1200, 1300, 1500, 1800];

/** A filled-in character, so every zone has content that could overflow. */
const SEED = `
  (() => {
    const store = JSON.parse(localStorage.getItem('ironsworn-characters-v1'));
    if (!store || !store.characters.length) return false;
    const c = store.characters[0];
    c.name = 'Ульріка Залізнобока';
    c.attributes = { edge: 3, heart: 3, iron: 2, shadow: 1, wits: 2 };
    c.stats = { health: 3, spirit: 4, supply: 2 };
    c.momentum = 4;
    c.debilities.wounded = true;
    c.xp = Array.from({ length: 30 }, (_, i) => (i < 5 ? 1 : i < 8 ? 2 : 0));
    c.vows[0] = { id: 'v1', name: 'Знайти сестру', rank: 'formidable', ticks: 13 };
    c.vows[1] = { id: 'v2', name: 'Помститися за село дуже довгою назвою присяги', rank: 'extreme', ticks: 6 };
    c.bondTicks = 11;
    c.bonds = [
      { id: 'b1', name: 'Ковалиха Інґрід, селище Кам’яний Брід' },
      { id: 'b2', name: 'Морська відьма' },
    ];
    c.notes = 'Меч батька.';
    c.extraTracks = [
      { id: 't1', name: 'Зграя вовків', rank: 'dangerous', ticks: 10, kind: 'combat' },
      { id: 't2', name: 'Через Крижані Пустки', rank: 'formidable', ticks: 5, kind: 'journey' },
    ];
    // П'ять профілів, підібраних під найгірші випадки картки: супутник із
    // вписаним ім'ям і вибраною шкалою, найдовший шлях, ритуал із вкладеним
    // списком, талант зі шкалою словами й довга назва в корінці.
    c.profiles = [
      { id: 'pr1', profileId: 'companion-pes', marked: ['2', '3'], fields: { name: 'Баск' }, trackIndex: 2 },
      { id: 'pr2', profileId: 'path-poviazanyi', marked: [], fields: {}, trackIndex: null },
      { id: 'pr3', profileId: 'ritual-vartove-kolo', marked: ['1'], fields: {}, trackIndex: null },
      { id: 'pr4', profileId: 'talent-bronenosets', marked: [], fields: {}, trackIndex: 1 },
      { id: 'pr5', profileId: 'path-myslyvets-za-nazhyvoiu', marked: [], fields: {}, trackIndex: null },
    ];
    localStorage.setItem('ironsworn-characters-v1', JSON.stringify(store));
    return true;
  })()
`;

/** Elements whose content is wider than their box and which cannot scroll. */
const OVERFLOW_PROBE = `
  JSON.stringify([...document.querySelectorAll('.character-sheet-page *')]
    .filter(el => el.scrollWidth > el.clientWidth + 1
      && getComputedStyle(el).overflowX === 'visible'
      && el.clientWidth > 0)
    .map(el => ({
      selector: el.className.toString().split(' ')[0] || el.tagName,
      content: el.scrollWidth,
      box: el.clientWidth,
    }))
    .slice(0, 12))
`;

/**
 * Interactive elements that are too small to tap. For a checkbox the tap
 * target is its wrapping label, not the box itself; the hidden import input is
 * not a tap target at all.
 */
const TOUCH_PROBE = `
  JSON.stringify([...document.querySelectorAll(
      '.character-sheet-page button, .character-sheet-page input,' +
      '.character-sheet-page select, .character-sheet-page textarea')]
    .filter(el => !el.classList.contains('visually-hidden'))
    .map(el => {
      const target = el.type === 'checkbox' ? el.closest('label') ?? el : el;
      const rect = target.getBoundingClientRect();
      return {
        selector: target.className.toString().split(' ')[0] || target.tagName,
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    })
    .filter(m => m.width > 0 && (m.width < 24 || m.height < 24))
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

const profile = mkdtempSync(join(tmpdir(), 'ironsworn-audit-'));
const chrome = spawn(
  CHROME_PATH,
  [
    '--headless',
    '--disable-gpu',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: 'ignore' },
);
chrome.on('error', error => {
  console.error(`Could not start Chrome at ${CHROME_PATH}\n${error.message}`);
  console.error('Set CHROME_PATH to your browser executable.');
  process.exit(1);
});

let passed = 0;
let failed = 0;
const check = (name, ok, detail = '') => {
  ok ? passed++ : failed++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${name}${ok || !detail ? '' : ` — ${detail}`}`);
};

try {
  // Fail fast and clearly: without a running dev server every later check
  // would fail with an unhelpful message from inside the browser.
  try {
    await fetch(SHEET_URL);
  } catch {
    throw new Error(
      `Cannot reach ${SHEET_URL}\nStart the dev server first (yarn dev), ` +
        'or point SHEET_URL at a running instance.',
    );
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
    if (exceptionDetails) {
      throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    }
    return result.value;
  };

  await send('Page.enable');

  const load = async (width, height, mobile, search = '') => {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: mobile ? 2 : 1,
      mobile,
    });
    await send('Page.navigate', { url: SHEET_URL });
    await wait(1200);
    const seeded = await evaluate(SEED);
    if (!seeded) throw new Error(`No character rendered at ${SHEET_URL}. Is the dev server up?`);
    await send('Page.navigate', { url: SHEET_URL + search });
    await wait(1400);
  };

  const shoot = async name => {
    if (!SCREENSHOT_DIR) return;
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(join(SCREENSHOT_DIR, `${name}.png`), Buffer.from(data, 'base64'));
  };

  console.log('\nHorizontal overflow across viewport widths');
  for (const width of WIDTHS) {
    await load(width, 900, width <= 700);
    const documentWidth = await evaluate('document.documentElement.scrollWidth');
    const viewport = await evaluate('innerWidth');
    const overflowing = JSON.parse(await evaluate(OVERFLOW_PROBE));
    check(
      `${width}px`,
      documentWidth <= viewport && overflowing.length === 0,
      `document ${documentWidth}/${viewport}, overflowing ${JSON.stringify(overflowing)}`,
    );
  }

  console.log('\nTap targets at 390px');
  await load(390, 900, true);
  // Дії над персонажем живуть у меню під бургером: поки воно закрите,
  // ні виміряти їх, ні перевірити, чи меню вміщається у вьюпорт, неможливо.
  await evaluate(`document.querySelector('.character-menu__toggle').click()`);
  // Степери характеристик з'являються лише в режимі редагування, тож без
  // натискання «Редагувати» їх у розмітці немає й міряти нічого.
  await evaluate(`document.querySelector('.attribute-edit-toggle').click()`);
  await wait(200);
  const menuWidth = await evaluate('document.documentElement.scrollWidth');
  check(
    'the character menu fits the viewport',
    menuWidth <= (await evaluate('innerWidth')),
    `document ${menuWidth}`,
  );
  const tooSmall = JSON.parse(await evaluate(TOUCH_PROBE));
  check('nothing smaller than 24px', tooSmall.length === 0, JSON.stringify(tooSmall));

  const sizes = JSON.parse(
    await evaluate(`
      JSON.stringify(['.track-button', '.bar-button', '.stepper', '.scale-cell',
        '.character-menu__toggle', '.character-bar__item', '.attribute-edit-toggle']
        .map(selector => {
          const el = document.querySelector('.character-sheet-page ' + selector);
          if (!el) return { selector, missing: true };
          const rect = el.getBoundingClientRect();
          return { selector, height: Math.round(rect.height) };
        }))
    `),
  );
  const heightOf = selector => sizes.find(size => size.selector === selector)?.height ?? 0;
  check('scale cells are at least 44px tall', heightOf('.scale-cell') >= 44);
  check('steppers are at least 44px tall', heightOf('.stepper') >= 44);
  check('track buttons are at least 44px tall', heightOf('.track-button') >= 44);
  check('bar buttons are at least 40px tall', heightOf('.bar-button') >= 40);
  check('character rows are at least 40px tall', heightOf('.character-bar__item') >= 40);
  check('the character menu button is at least 40px tall', heightOf('.character-menu__toggle') >= 40);
  check('the attribute edit toggle is at least 40px tall', heightOf('.attribute-edit-toggle') >= 40);

  // Корінці й закритий футер нічого не переповнюють — переповнює вміст, який
  // з'являється лише після кліку: піднята карта, шухляда, фулскрін, вікно
  // вибору. Тож кожен із цих станів відкриваємо й міряємо окремо.
  console.log('\nProfiles: opened states');
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
  const click = async selector => {
    const hit = await evaluate(`
      (() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return false;
        el.click();
        return true;
      })()
    `);
    await wait(250);
    return hit;
  };

  for (const width of [768, 1200, 1500]) {
    await load(width, 1000, false);
    check(`${width}px renders the profiles zone`, await click('.profile-spine'));
    await overflowCheck(`${width}px with a card raised`);
    // Найдовша картка прокручується всередині себе, а не розтягує зону.
    const raised = JSON.parse(
      await evaluate(`
        (() => {
          const el = document.querySelector('.profile-card--raised');
          if (!el) return 'null';
          return JSON.stringify({ height: Math.round(el.getBoundingClientRect().height),
            scrollable: getComputedStyle(el).overflowY });
        })()
      `),
    );
    check(
      `${width}px keeps the raised card inside the zone`,
      raised && raised.scrollable === 'auto' && raised.height <= 1000,
      JSON.stringify(raised),
    );

    await click('.sheet-zone--profiles .zone-add');
    await overflowCheck(`${width}px with the picker open`);
  }

  console.log('\nProfiles on a phone (390px)');
  await load(390, 900, true);
  check('the zone is replaced by a sticky footer', await click('.profiles-footer__toggle'));
  await overflowCheck('the drawer fits the viewport');

  // Футер накривав би журнал кидків, якби сторінка не лишала під собою його висоту.
  const clearance = JSON.parse(
    await evaluate(`
      JSON.stringify({
        padding: Math.round(parseFloat(
          getComputedStyle(document.querySelector('.character-sheet-page')).paddingBottom)),
        footer: Math.round(
          document.querySelector('.profiles-footer__bar').getBoundingClientRect().height),
      })
    `),
  );
  check(
    'the page leaves room for the footer',
    clearance.padding >= clearance.footer,
    JSON.stringify(clearance),
  );

  check('a card opens fullscreen', await click('.profile-spine'));
  await overflowCheck('the fullscreen card fits the viewport');

  const profileTargets = JSON.parse(
    await evaluate(`
      JSON.stringify(['.profile-mark', '.profile-track__cell', '.profile-field__input',
        '.profiles-footer__toggle', '.profile-modal__close']
        .map(selector => {
          const el = document.querySelector(selector);
          if (!el) return { selector, missing: true };
          const rect = el.getBoundingClientRect();
          return { selector, height: Math.round(rect.height), width: Math.round(rect.width) };
        }))
    `),
  );
  for (const target of profileTargets) {
    check(
      `${target.selector} is a real tap target`,
      !target.missing && target.height >= 40 && target.width >= 24,
      JSON.stringify(target),
    );
  }

  console.log('\nLight theme');
  for (const [width, mobile] of [
    [1500, false],
    [390, true],
  ]) {
    await load(width, mobile ? 900 : 1400, mobile);
    await evaluate(`document.documentElement.setAttribute('data-theme', 'light')`);
    await wait(300);
    const documentWidth = await evaluate('document.documentElement.scrollWidth');
    const viewport = await evaluate('innerWidth');
    const zoneBackground = await evaluate(
      `getComputedStyle(document.querySelector('.sheet-zone')).backgroundColor`,
    );
    check(`${width}px has no overflow in the light theme`, documentWidth <= viewport);
    check(`${width}px picks up light theme colours`, zoneBackground !== 'rgb(22, 27, 34)', zoneBackground);
  }

  // Шторка ходів: на десктопі — колонка поруч з аркушем, і аркуш під неї не
  // залазить; на телефоні — діалог на весь екран із кнопкою кидка внизу.
  console.log('\nMoves drawer');
  for (const width of [1024, 1280, 1440]) {
    await load(width, 900, false, '?move=face-danger');
    const placement = JSON.parse(
      await evaluate(`
        JSON.stringify((() => {
          const drawer = document.querySelector('.moves-drawer--wide');
          const sheet = document.querySelector('.character-sheet');
          if (!drawer || !sheet) return null;
          return { drawerLeft: Math.round(drawer.getBoundingClientRect().left),
            sheetRight: Math.round(sheet.getBoundingClientRect().right) };
        })())
      `),
    );
    check(
      `${width}px docks the drawer beside the sheet`,
      placement !== null && placement.sheetRight <= placement.drawerLeft,
      JSON.stringify(placement),
    );
    await overflowCheck(`${width}px with the drawer open`);
    await evaluate(`document.querySelector('.moves-drawer .play-option').click()`);
    await wait(150);
    await evaluate(`document.querySelector('.moves-drawer__roll').click()`);
    await wait(500);
    check(
      `${width}px rolls from the move card and picks the band`,
      await evaluate(`!!document.querySelector('.move-roll-result .roll-card') && !!document.querySelector('.outcome-band--rolled')`),
    );
    await shoot(`drawer-${width}`);
  }

  await load(390, 844, true, '?moves');
  await shoot('drawer-390-list');
  await load(390, 844, true, '?move=endure-harm');
  const phone = JSON.parse(
    await evaluate(`
      JSON.stringify((() => {
        const drawer = document.querySelector('.moves-drawer--full');
        const bar = document.querySelector('.moves-drawer__bar');
        if (!drawer || !bar) return null;
        // Розкладка, а не getBoundingClientRect: анімація виїзду ще могла не скінчитися.
        return { height: drawer.clientHeight, viewport: innerHeight,
          barBottom: bar.offsetTop + bar.offsetHeight,
          rollHeight: Math.round(document.querySelector('.moves-drawer__roll').getBoundingClientRect().height) };
      })())
    `),
  );
  check('390px opens the drawer fullscreen', phone !== null && phone.height === phone.viewport, JSON.stringify(phone));
  check(
    '390px keeps the roll button at the bottom and tappable',
    phone !== null && phone.barBottom <= phone.viewport && phone.rollHeight >= 44,
    JSON.stringify(phone),
  );
  await overflowCheck('390px drawer fits the viewport');
  const drawerTargets = JSON.parse(await evaluate(TOUCH_PROBE));
  check('390px drawer has nothing smaller than 24px', drawerTargets.length === 0, JSON.stringify(drawerTargets));
  await shoot('drawer-390');

  console.log('\nReduced motion');
  await send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });
  await load(1500, 1200, false);
  const animation = await evaluate(`
    (async () => {
      document.querySelectorAll('.attribute-box__value')[0].click();
      await new Promise(resolve => setTimeout(resolve, 200));
      document.querySelector('.roll-button').click();
      await new Promise(resolve => setTimeout(resolve, 200));
      const die = document.querySelector('.die');
      return die ? getComputedStyle(die).animationName : 'no die rendered';
    })()
  `);
  check('dice animation is switched off', animation === 'none', animation);

  const spineMotion = await evaluate(`
    (() => {
      const el = document.querySelector('.profile-spine');
      if (!el) return 'no spine rendered';
      return getComputedStyle(el).transitionDuration;
    })()
  `);
  check('the card lift is switched off', spineMotion === '0s', spineMotion);

  socket.close();
} catch (error) {
  console.error(`\n${error.message}`);
  failed++;
} finally {
  chrome.kill();
  // Chrome needs a moment to let go of its profile directory, and a leftover
  // temp directory must never turn a passing audit into a crash.
  await Promise.race([once(chrome, 'exit'), wait(3000)]);
  try {
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  } catch {
    console.warn(`Left a temporary Chrome profile behind: ${profile}`);
  }
}

console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'}  ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
