// playtest.mjs — drives The Velvet Vault in a real browser and checks
// the mechanics end to end: movement, coin pickup, guard sight raising
// the alarm, hiding draining it, the Star opening the exit, reaching the
// exit clearing the room, and being caught. Run from this directory:
//   node playtest.mjs
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';

const ENTRY = '/home/hatch/workspace/makefun/best-heist-game-20261122-0559/entry';
const PORT = 8904;
const BASE = `http://127.0.0.1:${PORT}`;
const errors = [];
const failures = [];

function check(name, ok, detail) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures.push(name);
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
  cwd: ENTRY,
  stdio: 'ignore',
});

try {
  for (let i = 0; i < 30; i++) {
    try {
      const r = await fetch(`${BASE}/`);
      if (r.ok) break;
    } catch { /* not up yet */ }
    await setTimeout(200);
  }
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 800 } })).newPage();
  page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`CONSOLE: ${m.text()}`);
  });
  const state = () => page.evaluate(() => {
    const g = window.__game;
    return {
      mode: g.mode,
      alarm: Math.round(g.alarm),
      loot: g.loot,
      starTaken: g.starTaken,
      exitOpen: g.exitOpen,
      px: Math.round(g.player.x),
      py: Math.round(g.player.y),
      guard0: g.guards[0].state,
      level: g.levelIndex,
    };
  });
  const place = (x, y) => page.evaluate(([x, y]) => {
    window.__game.player.x = x;
    window.__game.player.y = y;
    window.__game.player.clickTarget = null;
  }, [x, y]);

  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  await page.click('#start-button');
  await page.waitForFunction(() => window.__game.mode === 'playing');

  // 1. Keyboard movement really moves the thief.
  const before = await state();
  await page.keyboard.down('KeyD');
  await setTimeout(700);
  await page.keyboard.up('KeyD');
  const moved = await state();
  check('keyboard moves player right', moved.px > before.px + 50, `${before.px} -> ${moved.px}`);

  // 2. Walking onto a coin collects it.
  await place(200, 150);
  await setTimeout(400);
  const afterCoin = await state();
  check('coin pickup adds $50', afterCoin.loot >= 50, `loot $${afterCoin.loot}`);

  // 3. Standing in a guard's cone fills the alarm and alerts the guard.
  // Freeze the guard on the spot first (single-point patrol), so its
  // cone stays on the thief instead of walking away mid-test.
  await page.evaluate(() => {
    const g = window.__game;
    g.guards[0].patrol = [{ x: 480, y: 300 }];
    g.guards[0].waypointIndex = 0;
    g.guards[0].x = 480; g.guards[0].y = 300; g.guards[0].facing = -Math.PI / 2;
    g.guards[0].state = 'patrol';
    g.player.x = 480; g.player.y = 200; g.player.clickTarget = null;
  });
  await setTimeout(800);
  const spotted = await state();
  check('guard sight fills alarm', spotted.alarm > 30, `alarm ${spotted.alarm}`);
  check('guard goes alert', spotted.guard0 === 'alert', spotted.guard0);

  // 4. Hiding behind a wall drains the alarm again.
  await place(300, 150); // behind the display case, out of the cone
  await setTimeout(2500);
  const hidden = await state();
  check('alarm drains when hidden', hidden.alarm < spotted.alarm, `${spotted.alarm} -> ${hidden.alarm}`);

  // 5. The Star opens the exit. Park the guard far away first.
  await page.evaluate(() => {
    const g = window.__game;
    g.guards[0].patrol = [
      { x: 200, y: 300 }, { x: 480, y: 300 }, { x: 760, y: 300 }, { x: 480, y: 300 },
    ];
    g.guards[0].waypointIndex = 2;
    g.guards[0].x = 760; g.guards[0].y = 300; g.guards[0].facing = 0;
    g.guards[0].state = 'patrol';
    g.player.x = 480; g.player.y = 120; g.player.clickTarget = null;
  });
  await setTimeout(400);
  const starred = await state();
  check('Star taken, exit opens', starred.starTaken && starred.exitOpen, JSON.stringify(starred));

  // 6. Reaching the exit clears the room.
  await place(884, 540);
  await setTimeout(400);
  const cleared = await state();
  check('exit clears room 1', cleared.mode === 'levelClear' && cleared.level === 0, cleared.mode);
  await page.click('#next-button');
  await setTimeout(300);
  const room2 = await state();
  check('next room loads (Vault Wing)', room2.mode === 'playing' && room2.level === 1, `level ${room2.level}`);

  // 7. Being caught: freeze a guard facing the thief until the alarm
  // hits 100 and the grace runs out.
  await page.evaluate(() => {
    const g = window.__game;
    g.guards[0].patrol = [{ x: 480, y: 200 }];
    g.guards[0].waypointIndex = 0;
    g.guards[0].x = 480; g.guards[0].y = 200; g.guards[0].facing = Math.PI / 2;
    g.guards[0].state = 'patrol';
    g.player.x = 480; g.player.y = 260; g.player.clickTarget = null;
  });
  await setTimeout(4000);
  const caught = await state();
  check('alarm 100 catches the thief', caught.mode === 'caught', `${caught.mode} alarm ${caught.alarm}`);

  // 8. Retry works.
  await page.click('#retry-button');
  await setTimeout(300);
  const retried = await state();
  check('retry restarts the room', retried.mode === 'playing' && retried.alarm === 0, retried.mode);

  await browser.close();
} finally {
  server.kill();
}

if (errors.length > 0) {
  console.log('PAGE ERRORS:');
  for (const e of errors) console.log(' ', e);
}
console.log(failures.length === 0 && errors.length === 0 ? 'PLAYTEST: ALL PASS' : 'PLAYTEST: FAILURES PRESENT');
process.exitCode = failures.length === 0 && errors.length === 0 ? 0 : 1;
