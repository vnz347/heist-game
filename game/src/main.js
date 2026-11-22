// main.js — The Velvet Vault: game loop, alarm, loot, exits, overlays.
// Vesper the thief crosses three rooms of the Marlow Museum, steals the
// Star, and slips out the skylight. The alarm meter is the tension: it
// fills while any guard or camera sees the thief and drains in hiding.
// At 100 the net closes — but only after a short grace, so a player who
// breaks line of sight in time always gets away.
//
// Screenshots: ?shot=cover|loot|alarm|escape&seed=1 stages a frozen,
// deterministic frame of the game (the same code, the same room) and
// sets window.__shotReady when it has rendered once.
import { CONFIG } from './config.js';
import { LEVELS } from './levels.js';
import { makeGuard, updateGuard, guardTouchesPlayer } from './guards.js';
import { makeCamera, updateCamera } from './cameras.js';
import {
  makePlayer, updatePlayer, useSmoke, tossCoin, pointInSmoke, pruneTimed,
} from './player.js';
import { pointInRect } from './vision.js';
import { makeAudio } from './audio.js';
import { render } from './render.js';
import { bindHud, updateHud, showBanner, hideBanner } from './hud.js';
import { bindInput } from './input.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const hud = bindHud(document);
const audio = makeAudio();

const game = {
  mode: 'title', // title | playing | paused | caught | levelClear | won
  levelIndex: 0,
  level: LEVELS[0],
  player: null,
  guards: [],
  cameras: [],
  coins: [],
  starTaken: false,
  exitOpen: false,
  loot: 0,
  alarm: 0,
  elapsed: 0,
  now: 0,
  caughtTimer: 0,
  frozen: false,
  pendingCoin: null,
  pendingCoinAt: 0,
  spottedAnnounced: false,
};

function loadLevel(index) {
  const def = LEVELS[index];
  game.levelIndex = index;
  game.level = def;
  game.player = makePlayer(def.playerStart);
  game.guards = def.guards.map(makeGuard);
  game.cameras = def.cameras.map(makeCamera);
  game.coins = def.coins.map((c) => ({ ...c, taken: false }));
  game.starTaken = false;
  game.exitOpen = false;
  game.alarm = 0;
  game.caughtTimer = 0;
  game.pendingCoin = null;
  game.spottedAnnounced = false;
  hideBanner(hud);
}

function startGame() {
  audio.unlock();
  game.loot = 0;
  game.elapsed = 0;
  loadLevel(0);
  setMode('playing');
}

function setMode(mode) {
  game.mode = mode;
  for (const id of ['overlay-title', 'overlay-paused', 'overlay-caught', 'overlay-clear', 'overlay-won']) {
    document.getElementById(id).classList.remove('visible');
  }
  if (mode === 'title') document.getElementById('overlay-title').classList.add('visible');
  if (mode === 'paused') document.getElementById('overlay-paused').classList.add('visible');
  if (mode === 'caught') {
    document.getElementById('overlay-caught').classList.add('visible');
    document.getElementById('caught-detail').textContent =
      `Room ${game.levelIndex + 1} — ${game.level.name}. The guards closed the net.`;
  }
  if (mode === 'levelClear') {
    document.getElementById('overlay-clear').classList.add('visible');
    document.getElementById('clear-detail').textContent =
      game.levelIndex + 1 < LEVELS.length
        ? `Room ${game.levelIndex + 1} cleared — loot so far $${game.loot.toLocaleString('en-US')}.`
        : '';
  }
  if (mode === 'won') {
    const score = Math.max(0, game.loot - Math.floor(game.elapsed) * CONFIG.timePenaltyPerSecond);
    document.getElementById('won-detail').textContent =
      `The Star of Marlow is yours. Loot $${game.loot.toLocaleString('en-US')} in ` +
      `${Math.floor(game.elapsed / 60)}:${String(Math.floor(game.elapsed % 60)).padStart(2, '0')} — score ${score.toLocaleString('en-US')}.`;
    document.getElementById('overlay-won').classList.add('visible');
  }
}

const input = bindInput(canvas, {
  onSmoke() {
    if (game.mode !== 'playing') return;
    if (useSmoke(game.player, game.now)) {
      audio.smoke();
      // Smoke blinds every guard and camera standing in the cloud.
      for (const guard of game.guards) {
        if (pointInSmoke(guard.x, guard.y, game.player.smokeClouds, game.now)) {
          guard.blindUntil = game.now + CONFIG.smokeSeconds;
        }
      }
      for (const camera of game.cameras) {
        if (pointInSmoke(camera.x, camera.y, game.player.smokeClouds, game.now)) {
          camera.blindUntil = game.now + CONFIG.smokeSeconds;
        }
      }
    }
  },
  onCoin() {
    if (game.mode !== 'playing') return;
    const point = tossCoin(game.player);
    if (point) {
      audio.toss();
      game.pendingCoin = point;
      game.pendingCoinAt = game.now;
    }
  },
  onPause() {
    if (game.mode === 'playing') setMode('paused');
    else if (game.mode === 'paused') setMode('playing');
  },
  onRestart() {
    if (game.mode === 'playing' || game.mode === 'paused' || game.mode === 'caught') {
      game.loot = game.loot; // keep the haul; restart only this room
      loadLevel(game.levelIndex);
      setMode('playing');
    }
  },
  onMute() {
    const muted = audio.toggleMute();
    document.getElementById('mute-button').textContent = muted ? 'Sound: off (M)' : 'Sound: on (M)';
  },
  onConfirm() {
    if (game.mode === 'title') startGame();
    else if (game.mode === 'levelClear') nextLevel();
    else if (game.mode === 'caught') { loadLevel(game.levelIndex); setMode('playing'); }
    else if (game.mode === 'won') startGame();
  },
  onClickToMove(point) {
    if (game.mode === 'playing') game.player.clickTarget = point;
  },
});

document.getElementById('start-button').addEventListener('click', startGame);
document.getElementById('resume-button').addEventListener('click', () => setMode('playing'));
document.getElementById('retry-button').addEventListener('click', () => {
  loadLevel(game.levelIndex);
  setMode('playing');
});
document.getElementById('next-button').addEventListener('click', nextLevel);
document.getElementById('again-button').addEventListener('click', startGame);
document.getElementById('mute-button').addEventListener('click', () => {
  const muted = audio.toggleMute();
  document.getElementById('mute-button').textContent = muted ? 'Sound: off (M)' : 'Sound: on (M)';
});

function nextLevel() {
  if (game.levelIndex + 1 < LEVELS.length) {
    loadLevel(game.levelIndex + 1);
    setMode('playing');
  } else {
    setMode('won');
  }
}

function inShadow(x, y) {
  return game.level.shadows.some((s) => pointInRect(x, y, s));
}

function update(dt) {
  game.now += dt;
  game.elapsed += dt;
  const player = game.player;
  const level = game.level;

  updatePlayer(player, input, dt, level.walls);
  player.sneaking = input.sneak;
  pruneTimed(player, game.now);

  // Smoke keeps blinding watchers who stand in it.
  for (const guard of game.guards) {
    if (pointInSmoke(guard.x, guard.y, player.smokeClouds, game.now)) {
      guard.blindUntil = game.now + CONFIG.smokeSeconds;
    }
  }
  for (const camera of game.cameras) {
    if (pointInSmoke(camera.x, camera.y, player.smokeClouds, game.now)) {
      camera.blindUntil = game.now + CONFIG.smokeSeconds;
    }
  }

  // The coin toss only distracts for a moment after it lands.
  const coin = game.now - game.pendingCoinAt < 1 ? game.pendingCoin : null;

  let seenBy = null;
  let seenCloseness = 0;
  for (const guard of game.guards) {
    const sight = updateGuard(guard, dt, game.now, player, level.walls, coin);
    if (sight.seen && sight.closeness > seenCloseness) {
      seenBy = 'guard';
      seenCloseness = sight.closeness;
    }
    if (guardTouchesPlayer(guard, player)) {
      catchThief('A guard laid a hand on your shoulder.');
      return;
    }
  }
  for (const camera of game.cameras) {
    const sight = updateCamera(camera, dt, game.now, player, level.walls);
    if (sight.seen && sight.closeness > seenCloseness) {
      seenBy = 'camera';
      seenCloseness = sight.closeness;
    }
  }

  // --- The alarm meter ---
  if (seenBy) {
    let rate = seenBy === 'guard' ? CONFIG.alarmFillGuard : CONFIG.alarmFillCamera;
    rate += CONFIG.alarmFillCloseBonus * seenCloseness;
    if (player.sneaking) rate *= CONFIG.sneakSpotFactor;
    if (inShadow(player.x, player.y)) rate *= CONFIG.shadowSpotFactor;
    game.alarm = Math.min(CONFIG.alarmCaughtAt, game.alarm + rate * dt);
    if (game.alarm >= CONFIG.alarmWarningAt && !game.spottedAnnounced) {
      game.spottedAnnounced = true;
      audio.spotted();
      showBanner(hud, 'SPOTTED! Break line of sight!', 'danger');
    }
    if (game.alarm >= CONFIG.alarmCaughtAt) {
      game.caughtTimer += dt;
      audio.startSiren();
      if (game.caughtTimer >= CONFIG.caughtGraceSeconds) {
        catchThief('The alarm hit 100 — the museum locked down.');
        return;
      }
    }
  } else {
    game.alarm = Math.max(0, game.alarm - CONFIG.alarmDrain * dt);
    game.caughtTimer = 0;
    audio.stopSiren();
    if (game.alarm < CONFIG.alarmWarningAt) {
      game.spottedAnnounced = false;
      hideBanner(hud);
    }
  }

  // --- Loot ---
  for (const coinLoot of game.coins) {
    if (!coinLoot.taken && Math.hypot(player.x - coinLoot.x, player.y - coinLoot.y) < 26) {
      coinLoot.taken = true;
      game.loot += CONFIG.coinValue;
      audio.coin();
    }
  }
  if (!game.starTaken &&
      Math.hypot(player.x - game.level.star.x, player.y - game.level.star.y) < 30) {
    game.starTaken = true;
    game.exitOpen = true;
    game.loot += CONFIG.starValue;
    audio.star();
    showBanner(hud, 'STAR TAKEN — get to the EXIT!', 'good');
    setTimeout(() => { if (game.mode === 'playing') hideBanner(hud); }, 2500);
  }

  // --- Exit ---
  const exit = level.exit;
  if (game.exitOpen && pointInRect(player.x, player.y, exit)) {
    audio.stopSiren();
    if (game.levelIndex + 1 < LEVELS.length) {
      audio.levelClear();
      setMode('levelClear');
    } else {
      audio.win();
      setMode('won');
    }
  }
}

function catchThief(detail) {
  audio.stopSiren();
  audio.caught();
  game.caughtDetail = detail;
  setMode('caught');
}

function draw() {
  render(ctx, {
    level: game.level,
    player: game.player,
    guards: game.guards,
    cameras: game.cameras,
    coins: game.coins.filter((c) => !c.taken),
    starTaken: game.starTaken,
    exitOpen: game.exitOpen,
    now: game.now,
  });
  updateHud(hud, {
    levelIndex: game.levelIndex,
    levelName: game.level.name,
    loot: game.loot,
    starTaken: game.starTaken,
    alarm: game.alarm,
    elapsed: game.elapsed,
    player: game.player,
    exitOpen: game.exitOpen,
  });
}

// --- Screenshot staging: a frozen, deterministic frame per shot name. ---
function stageShot(name) {
  game.frozen = true;
  loadLevel(0);
  game.mode = 'playing';
  const player = game.player;

  if (name === 'cover') {
    // The whole game in one frame: room, two guards with cones, a camera
    // sweeping, the Star on its pedestal, coins, the locked exit, and the
    // alarm meter part-filled after a near miss.
    player.x = 430;
    player.y = 380;
    player.facing = -Math.PI / 2;
    game.guards[0].x = 480; game.guards[0].y = 300;
    game.guards[0].facing = Math.PI / 2;
    game.guards[1].x = 700; game.guards[1].y = 200;
    game.guards[1].facing = Math.PI;
    game.cameras[0].angle = Math.PI / 2 + 0.55;
    game.alarm = 35;
    game.loot = 100;
    game.coins[0].taken = true;
    game.coins[1].taken = true;
    game.elapsed = 47;
  } else if (name === 'loot') {
    // Vesper reaching the Star, a guard's cone sweeping past the pedestal.
    player.x = 480;
    player.y = 165;
    player.facing = -Math.PI / 2;
    game.guards[0].x = 330; game.guards[0].y = 300;
    game.guards[0].facing = 0;
    game.guards[1].x = 700; game.guards[1].y = 420;
    game.guards[1].facing = -Math.PI / 2;
    game.cameras[0].angle = Math.PI / 2 - 0.6;
    game.alarm = 48;
    game.loot = 250;
    game.coins[0].taken = true;
    game.coins[2].taken = true;
    game.coins[4].taken = true;
    game.elapsed = 96;
    showBanner(hud, 'SPOTTED! Break line of sight!', 'danger');
  } else if (name === 'alarm') {
    // The alarm nearly full, a guard closing in, the exit open — run!
    player.x = 800;
    player.y = 480;
    player.facing = Math.PI;
    player.sneaking = true;
    game.starTaken = true;
    game.exitOpen = true;
    game.guards[0].x = 690; game.guards[0].y = 430;
    game.guards[0].facing = 0.5;
    game.guards[0].state = 'alert';
    game.guards[1].x = 480; game.guards[1].y = 300;
    game.guards[1].facing = 0;
    game.cameras[0].angle = Math.PI / 2 + 0.8;
    game.cameras[0].seeing = true;
    game.alarm = 82;
    game.loot = 750;
    game.coins.forEach((c) => { c.taken = true; });
    game.elapsed = 148;
    showBanner(hud, 'SPOTTED! Break line of sight!', 'danger');
  } else if (name === 'escape') {
    // Room 3, the rooftop: Star in hand, the skylight exit open ahead.
    loadLevel(2);
    const roofPlayer = game.player;
    roofPlayer.x = 820;
    roofPlayer.y = 150;
    roofPlayer.facing = Math.PI / 4;
    game.starTaken = true;
    game.exitOpen = true;
    game.guards[0].x = 300; game.guards[0].y = 300;
    game.guards[0].facing = 0;
    game.guards[1].x = 620; game.guards[1].y = 480;
    game.guards[1].facing = -Math.PI / 2;
    game.cameras[0].angle = Math.PI / 2 - 0.5;
    game.cameras[1].angle = -0.4;
    game.alarm = 18;
    game.loot = 1150;
    game.coins[0].taken = true;
    game.coins[2].taken = true;
    game.elapsed = 231;
    showBanner(hud, 'STAR TAKEN — get to the EXIT!', 'good');
  }
  game.now = 1.0;
  draw();
  window.__shotReady = true;
}

// --- Boot ---
loadLevel(0);
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot) {
  stageShot(shot);
} else {
  setMode('title');
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (game.mode === 'playing' && !game.frozen) update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Exposed for play-testing in the browser console.
window.__game = game;
