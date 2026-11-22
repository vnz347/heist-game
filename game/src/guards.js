// guards.js — the museum's night guards.
// A guard walks its patrol loop, turns to face where it walks, and watches
// its cone. States:
//   patrol — walk the loop, slow.
//   suspicious — heard a coin, or glimpsed the thief: walk to the spot,
//     look around, then return to patrol.
//   alert — the thief is in the cone right now: hurry at the thief.
//   search — lost the thief: sweep the last place it was seen, then patrol.
// A guard only ever chases what it can see; breaking line of sight is
// always a way out, which is what makes a near miss fair.
import { CONFIG } from './config.js';
import { angleDifference, canSee, distance } from './vision.js';

export function makeGuard(def) {
  const start = def.patrol[0];
  return {
    x: start.x,
    y: start.y,
    facing: def.facing,
    patrol: def.patrol,
    waypointIndex: 1,
    state: 'patrol',
    stateTime: 0,
    lastSeen: null,
    investigate: null,
    searchTimer: 0,
    blindUntil: 0,
    speed: CONFIG.guardPatrolSpeed,
  };
}

function moveToward(guard, tx, ty, speed, dt, walls) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const nx = guard.x + (dx / dist) * step;
  const ny = guard.y + (dy / dist) * step;
  // Guards slide along walls instead of sticking on corners.
  if (!hitsWall(nx, guard.y, walls)) guard.x = nx;
  if (!hitsWall(guard.x, ny, walls)) guard.y = ny;
  guard.facing = Math.atan2(dy, dx);
  return dist - step < 3;
}

function hitsWall(x, y, walls) {
  const r = CONFIG.guardRadius - 2;
  for (const w of walls) {
    if (x + r > w.x && x - r < w.x + w.w && y + r > w.y && y - r < w.y + w.h) {
      return true;
    }
  }
  return false;
}

export function updateGuard(guard, dt, now, player, walls, onHeardCoin) {
  guard.stateTime += dt;
  const blinded = now < guard.blindUntil;

  // --- What does the guard see right now? ---
  let sight = { seen: false, closeness: 0 };
  if (!blinded) {
    sight = canSee(
      guard.x, guard.y, guard.facing,
      CONFIG.guardVisionRange, CONFIG.guardVisionHalfAngle,
      player.x, player.y, walls,
    );
  }
  if (sight.seen) {
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.state !== 'alert') {
      guard.state = 'alert';
      guard.stateTime = 0;
    }
  }

  // --- Hearing: a coin toss nearby pulls a patrolling guard over. ---
  if (onHeardCoin && guard.state === 'patrol') {
    const d = distance(guard.x, guard.y, onHeardCoin.x, onHeardCoin.y);
    if (d < CONFIG.coinDistractRadius) {
      guard.state = 'suspicious';
      guard.stateTime = 0;
      guard.investigate = { ...onHeardCoin };
    }
  }

  switch (guard.state) {
    case 'patrol': {
      const target = guard.patrol[guard.waypointIndex];
      if (moveToward(guard, target.x, target.y, CONFIG.guardPatrolSpeed, dt, walls)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.patrol.length;
      }
      break;
    }
    case 'suspicious': {
      const target = guard.investigate;
      if (!target) { guard.state = 'patrol'; break; }
      if (moveToward(guard, target.x, target.y, CONFIG.guardSearchSpeed, dt, walls)) {
        // Arrived: look around for a moment, then give up.
        guard.facing += dt * 1.6;
        if (guard.stateTime > CONFIG.coinInvestigateSeconds + 1.5) {
          guard.state = 'patrol';
          guard.stateTime = 0;
          guard.investigate = null;
        }
      }
      break;
    }
    case 'alert': {
      if (sight.seen) {
        moveToward(guard, player.x, player.y, CONFIG.guardChaseSpeed, dt, walls);
      } else {
        // Lost sight: search where the thief was last seen.
        guard.state = 'search';
        guard.stateTime = 0;
        guard.searchTimer = CONFIG.guardMemorySeconds;
      }
      break;
    }
    case 'search': {
      guard.searchTimer -= dt;
      const target = guard.lastSeen;
      if (target && moveToward(guard, target.x, target.y, CONFIG.guardSearchSpeed, dt, walls)) {
        guard.facing += dt * 2.2; // sweep the room
      }
      if (guard.searchTimer <= 0) {
        guard.state = 'patrol';
        guard.stateTime = 0;
        guard.lastSeen = null;
      }
      break;
    }
  }
  return sight;
}

// A guard catches the thief by touch — only while it is actively chasing.
export function guardTouchesPlayer(guard, player) {
  return (
    guard.state === 'alert' &&
    distance(guard.x, guard.y, player.x, player.y) <
      CONFIG.guardRadius + CONFIG.playerRadius + 2
  );
}
