// player.js — Vesper, the thief.
// Moves with WASD or arrows (Shift to sneak: slower, harder to spot),
// or click-to-move with the mouse. Carries the tools: smoke puffs and
// tossed coins, each limited per level, so every use is a decision.
// Collision is a circle against the level's walls.
import { CONFIG } from './config.js';

export function makePlayer(start) {
  return {
    x: start.x,
    y: start.y,
    facing: -Math.PI / 2,
    sneaking: false,
    moving: false,
    clickTarget: null,
    smoke: CONFIG.smokePerLevel,
    coins: CONFIG.coinPerLevel,
    smokeClouds: [], // {x, y, until}
    coinTosses: [], // {x, y, until} — the spot guards investigate
  };
}

function hitsWall(x, y, radius, walls) {
  for (const w of walls) {
    if (x + radius > w.x && x - radius < w.x + w.w &&
        y + radius > w.y && y - radius < w.y + w.h) {
      return true;
    }
  }
  return false;
}

export function updatePlayer(player, input, dt, walls) {
  const speed = player.sneaking ? CONFIG.playerSneakSpeed : CONFIG.playerWalkSpeed;
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  if (dx !== 0 || dy !== 0) {
    // Keyboard movement cancels a click-to-move target.
    player.clickTarget = null;
    const len = Math.hypot(dx, dy);
    dx /= len;
    dy /= len;
    player.facing = Math.atan2(dy, dx);
  } else if (player.clickTarget) {
    const tx = player.clickTarget.x - player.x;
    const ty = player.clickTarget.y - player.y;
    const dist = Math.hypot(tx, ty);
    if (dist < 6) {
      player.clickTarget = null;
    } else {
      dx = tx / dist;
      dy = ty / dist;
      player.facing = Math.atan2(dy, dx);
    }
  }

  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) {
    const radius = player.sneaking ? CONFIG.playerRadiusSneak : CONFIG.playerRadius;
    const nx = player.x + dx * speed * dt;
    const ny = player.y + dy * speed * dt;
    // Slide along walls: try each axis on its own.
    if (!hitsWall(nx, player.y, radius, walls)) player.x = nx;
    if (!hitsWall(player.x, ny, radius, walls)) player.y = ny;
  }
}

// Throw a smoke puff at the thief's feet. Guards and cameras inside the
// cloud cannot see for a few seconds. Returns true when one was spent.
export function useSmoke(player, now) {
  if (player.smoke <= 0) return false;
  player.smoke -= 1;
  player.smokeClouds.push({
    x: player.x,
    y: player.y,
    until: now + CONFIG.smokeSeconds,
  });
  return true;
}

// Toss a coin ahead of the thief. Guards near the landing spot walk over
// to look. Returns the landing point, or null when out of coins.
export function tossCoin(player) {
  if (player.coins <= 0) return null;
  player.coins -= 1;
  const point = {
    x: player.x + Math.cos(player.facing) * CONFIG.coinTossDistance,
    y: player.y + Math.sin(player.facing) * CONFIG.coinTossDistance,
  };
  player.coinTosses.push(point);
  return point;
}

export function pointInSmoke(x, y, clouds, now) {
  for (const cloud of clouds) {
    if (now < cloud.until && Math.hypot(x - cloud.x, y - cloud.y) < CONFIG.smokeRadius) {
      return true;
    }
  }
  return false;
}

export function pruneTimed(player, now) {
  player.smokeClouds = player.smokeClouds.filter((c) => now < c.until);
}
