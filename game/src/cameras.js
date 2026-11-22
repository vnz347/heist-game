// cameras.js — the wall cameras.
// A camera sits on a wall and sweeps its cone back and forth, slow and
// readable: the player can time the sweep and cross between passes.
// A camera never chases. When it sees the thief it fills the alarm and
// its little red light turns on; smoke blinds it for a while.
import { CONFIG } from './config.js';
import { canSee } from './vision.js';

export function makeCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.angle,
    sweep: def.sweep,
    angle: def.angle,
    phase: Math.random() * Math.PI * 2,
    blindUntil: 0,
    seeing: false,
  };
}

export function updateCamera(camera, dt, now, player, walls) {
  // Ping-pong sweep: angle = base + sweep * sin(t * speed + phase).
  camera.phase += dt * CONFIG.cameraSweepSpeed;
  camera.angle = camera.baseAngle + camera.sweep * Math.sin(camera.phase);
  const blinded = now < camera.blindUntil;
  if (blinded) {
    camera.seeing = false;
    return { seen: false, closeness: 0 };
  }
  const sight = canSee(
    camera.x, camera.y, camera.angle,
    CONFIG.cameraVisionRange, CONFIG.cameraVisionHalfAngle,
    player.x, player.y, walls,
  );
  camera.seeing = sight.seen;
  return sight;
}
