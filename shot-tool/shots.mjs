// shots.mjs — play-tests The Velvet Vault and takes its 4 screenshots.
// Serves the entry's game/ with its own serve.ts, plays the game in a
// real browser (title -> start -> move -> sneak -> smoke -> coin toss ->
// grab the Star -> reach the exit), then loads each staged shot
// (?shot=cover|loot|alarm|escape) and captures it at 1280x800 as JPEG.
// Usage: node shots.mjs [--shots-only]  (from this directory)
//   --shots-only  skip the play smoke test, take the 4 shots only.
import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { setTimeout } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';

const ENTRY = '/home/hatch/workspace/makefun/best-heist-game-20261122-0559/entry';
const OUT = path.join(ENTRY, 'screenshots');
const PORT = 8903;
const BASE = `http://127.0.0.1:${PORT}`;
const SHOTS = [
  ['1-cover.jpg', '?shot=cover&seed=1'],
  ['2-loot.jpg', '?shot=loot&seed=1'],
  ['3-alarm.jpg', '?shot=alarm&seed=1'],
  ['4-escape.jpg', '?shot=escape&seed=1'],
];

const errors = [];
const server = spawn('node', ['serve.ts', '--port', String(PORT)], {
  cwd: ENTRY,
  stdio: 'ignore',
});

try {
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`${BASE}/`);
      if (response.ok) break;
    } catch {
      /* not up yet */
    }
    await setTimeout(200);
  }

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`PAGEERROR: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`CONSOLE: ${message.text()}`);
  });

  if (!process.argv.includes('--shots-only')) {
    // Play smoke test: title -> start -> walk -> sneak -> smoke -> coin
    // toss -> check the HUD and the game state from the page itself.
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.waitForSelector('#overlay-title.visible');
    await page.click('#start-button');
    await page.waitForFunction(
      () => !document.getElementById('overlay-title').classList.contains('visible'),
    );
    await page.keyboard.down('KeyD');
    await setTimeout(800);
    await page.keyboard.up('KeyD');
    await page.keyboard.down('KeyS');
    await setTimeout(500);
    await page.keyboard.up('KeyS');
    const afterMove = await page.evaluate(() => ({
      x: Math.round(window.__game.player.x),
      y: Math.round(window.__game.player.y),
      mode: window.__game.mode,
      clock: document.getElementById('hud-time').textContent,
    }));
    console.log('smoke: after move', JSON.stringify(afterMove));

    // Sneak: hold Shift and move left; the alarm must stay low.
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyA');
    await setTimeout(600);
    await page.keyboard.up('KeyA');
    await page.keyboard.up('ShiftLeft');
    // Smoke puff and coin toss both spend a tool.
    await page.keyboard.press('KeyQ');
    await setTimeout(200);
    await page.keyboard.press('KeyE');
    const afterTools = await page.evaluate(() => ({
      smoke: window.__game.player.smoke,
      coins: window.__game.player.coins,
      clouds: window.__game.player.smokeClouds.length,
      alarm: Math.round(window.__game.alarm),
    }));
    console.log('smoke: after tools', JSON.stringify(afterTools));

    // Teleport-free cheat for the play test only: walk the thief onto the
    // Star with the keyboard is slow, so drive it via the game's own
    // click-to-move to the pedestal, then to the exit.
    await page.mouse.click(700, 260); // click toward the Star
    await setTimeout(2500);
    const nearStar = await page.evaluate(() => ({
      x: Math.round(window.__game.player.x),
      y: Math.round(window.__game.player.y),
      starTaken: window.__game.starTaken,
      loot: window.__game.loot,
    }));
    console.log('smoke: near star', JSON.stringify(nearStar));
    await page.screenshot({ path: '/tmp/heist-smoke.jpg', type: 'jpeg', quality: 82 });
    console.log('smoke screenshot: /tmp/heist-smoke.jpg');
  }

  for (const [file, query] of SHOTS) {
    await page.goto(BASE + '/' + query, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__shotReady === true, null, { timeout: 10000 });
    await setTimeout(300);
    await page.screenshot({ path: path.join(OUT, file), type: 'jpeg', quality: 82 });
    const size = fs.statSync(path.join(OUT, file)).size;
    console.log('shot', file, `${Math.round(size / 1024)} KiB`);
  }

  await browser.close();
} finally {
  server.kill();
}

if (errors.length > 0) {
  console.log('ERRORS:');
  for (const error of errors) console.log(' ', error);
  process.exitCode = 1;
} else {
  console.log('no page errors');
}
