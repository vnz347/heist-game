// render.js — draws the whole room on one canvas.
// The look is the read: velvet-red carpets mark the quiet routes, dark
// blue shadow zones hide the thief, gold is loot, red cones are danger,
// and the exit glows green once the Star is taken. A guard's drawn cone
// is clipped by walls, so what you see is exactly what the guard sees.
import { CONFIG, PALETTE } from './config.js';
import { coneRayEnd } from './vision.js';

function drawCone(ctx, x, y, facing, range, halfAngle, walls, fill, edge) {
  const steps = 26;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= steps; i++) {
    const a = facing - halfAngle + (2 * halfAngle * i) / steps;
    const end = coneRayEnd(x, y, a, range, walls);
    ctx.lineTo(end.x, end.y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuard(ctx, guard, walls, now) {
  const alerted = guard.state === 'alert';
  const suspicious = guard.state === 'suspicious' || guard.state === 'search';
  const blinded = now < guard.blindUntil;

  if (!blinded) {
    drawCone(
      ctx, guard.x, guard.y, guard.facing,
      CONFIG.guardVisionRange, CONFIG.guardVisionHalfAngle, walls,
      alerted ? 'rgba(255, 60, 60, 0.34)' : PALETTE.cone,
      alerted ? 'rgba(255, 90, 90, 0.7)' : PALETTE.coneEdge,
    );
  }

  // Body: navy uniform, brass buttons, a cap.
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, CONFIG.guardRadius, 0, Math.PI * 2);
  ctx.fillStyle = alerted ? PALETTE.guardAlert : PALETTE.guard;
  ctx.fill();
  ctx.strokeStyle = '#d8c27a';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(guard.x, guard.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#f4e6b8';
  ctx.fill();
  // Facing tick — the direction the guard is looking.
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.lineTo(
    guard.x + Math.cos(guard.facing) * (CONFIG.guardRadius + 7),
    guard.y + Math.sin(guard.facing) * (CONFIG.guardRadius + 7),
  );
  ctx.strokeStyle = '#f4e6b8';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  if (suspicious && !alerted) {
    drawMark(ctx, guard.x, guard.y - 24, '?', '#ffd94d');
  }
  if (alerted) {
    drawMark(ctx, guard.x, guard.y - 24, '!', '#ff5b5b');
  }
}

function drawMark(ctx, x, y, text, color) {
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawCamera(ctx, camera, walls) {
  // Wall mount.
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 8, 0, Math.PI * 2);
  ctx.fillStyle = '#3a4a5c';
  ctx.fill();
  ctx.strokeStyle = '#8fa3b8';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Lens dot: red while it sees the thief.
  ctx.beginPath();
  ctx.arc(camera.x, camera.y, 3, 0, Math.PI * 2);
  ctx.fillStyle = camera.seeing ? '#ff3b3b' : '#37d67a';
  ctx.fill();
  drawCone(
    ctx, camera.x, camera.y, camera.angle,
    CONFIG.cameraVisionRange, CONFIG.cameraVisionHalfAngle, walls,
    camera.seeing ? 'rgba(255, 90, 60, 0.3)' : PALETTE.cameraCone,
    'rgba(255, 190, 90, 0.4)',
  );
}

function drawCoin(ctx, coin) {
  ctx.beginPath();
  ctx.arc(coin.x, coin.y, 9, 0, Math.PI * 2);
  ctx.fillStyle = PALETTE.loot;
  ctx.fill();
  ctx.strokeStyle = '#a67c00';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = 'bold 11px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#7a5a00';
  ctx.fillText('$', coin.x, coin.y + 0.5);
}

function drawStar(ctx, x, y, pulse) {
  const r = 15 + Math.sin(pulse) * 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(pulse * 0.7) * 0.08);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + Math.PI / 4;
    ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    const b = a + Math.PI / 4;
    ctx.lineTo(Math.cos(b) * (r * 0.42), Math.sin(b) * (r * 0.42));
  }
  ctx.closePath();
  ctx.fillStyle = PALETTE.star;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  // Glow ring so the target reads from across the room.
  ctx.beginPath();
  ctx.arc(x, y, r + 9 + Math.sin(pulse) * 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(142, 241, 255, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function render(ctx, state) {
  const { level, player, guards, cameras, coins, starTaken, exitOpen, now } = state;
  const W = CONFIG.canvasWidth;
  const H = CONFIG.canvasHeight;

  // Floor: two-tone checker, deep teal.
  for (let ty = 0; ty < H / CONFIG.tile; ty++) {
    for (let tx = 0; tx < W / CONFIG.tile; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorAlt;
      ctx.fillRect(tx * CONFIG.tile, ty * CONFIG.tile, CONFIG.tile, CONFIG.tile);
    }
  }

  // Carpets — the quiet routes.
  for (const carpet of level.carpets) {
    ctx.fillStyle = PALETTE.carpet;
    ctx.fillRect(carpet.x, carpet.y, carpet.w, carpet.h);
    ctx.strokeStyle = PALETTE.carpetEdge;
    ctx.lineWidth = 3;
    ctx.strokeRect(carpet.x + 2, carpet.y + 2, carpet.w - 4, carpet.h - 4);
  }

  // Shadow zones — dark blue pools where the alarm fills half as fast.
  for (const shadow of level.shadows) {
    ctx.fillStyle = PALETTE.shadowZone;
    ctx.fillRect(shadow.x, shadow.y, shadow.w, shadow.h);
    ctx.strokeStyle = 'rgba(120, 170, 220, 0.25)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.strokeRect(shadow.x, shadow.y, shadow.w, shadow.h);
    ctx.setLineDash([]);
  }

  // Exit door.
  const exit = level.exit;
  ctx.fillStyle = exitOpen ? PALETTE.exitDoor : PALETTE.exitDoorLocked;
  ctx.fillRect(exit.x, exit.y, exit.w, exit.h);
  ctx.strokeStyle = exitOpen ? '#b8ffce' : '#8a97a5';
  ctx.lineWidth = 3;
  ctx.strokeRect(exit.x, exit.y, exit.w, exit.h);
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#0c1a12';
  ctx.fillText(exitOpen ? 'EXIT' : 'LOCKED', exit.x + exit.w / 2, exit.y + exit.h / 2);

  // Loot.
  for (const coin of coins) drawCoin(ctx, coin);
  if (!starTaken) {
    // The Star's pedestal.
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(level.star.x - 22, level.star.y - 8, 44, 34);
    ctx.strokeStyle = '#8f8468';
    ctx.lineWidth = 2;
    ctx.strokeRect(level.star.x - 22, level.star.y - 8, 44, 34);
    drawStar(ctx, level.star.x, level.star.y - 16, now * 2.4);
  }

  // Cameras under the cones, then guards, then the thief on top.
  for (const camera of cameras) drawCamera(ctx, camera, level.walls);
  for (const guard of guards) drawGuard(ctx, guard, level.walls, now);

  // Smoke clouds.
  for (const cloud of player.smokeClouds) {
    if (now >= cloud.until) continue;
    const fade = Math.min(1, (cloud.until - now) / 1.5);
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, CONFIG.smokeRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(190, 200, 215, ${0.5 * fade})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cloud.x - 30, cloud.y + 18, CONFIG.smokeRadius * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(210, 220, 235, ${0.4 * fade})`;
    ctx.fill();
  }

  // Tossed coins, still ringing.
  for (const toss of player.coinTosses) {
    ctx.beginPath();
    ctx.arc(toss.x, toss.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.loot;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(toss.x, toss.y, 12, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 217, 77, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // The thief: a gold-hooded figure, smaller and dimmer while sneaking.
  const radius = player.sneaking ? CONFIG.playerRadiusSneak : CONFIG.playerRadius;
  ctx.beginPath();
  ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
  ctx.fillStyle = player.sneaking ? PALETTE.playerSneak : PALETTE.player;
  ctx.fill();
  ctx.strokeStyle = '#7a5a00';
  ctx.lineWidth = 2;
  ctx.stroke();
  // Hood point shows facing.
  ctx.beginPath();
  ctx.moveTo(player.x, player.y);
  ctx.lineTo(
    player.x + Math.cos(player.facing) * (radius + 8),
    player.y + Math.sin(player.facing) * (radius + 8),
  );
  ctx.strokeStyle = '#fff3c4';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Click-to-move marker.
  if (player.clickTarget) {
    ctx.beginPath();
    ctx.arc(player.clickTarget.x, player.clickTarget.y, 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 243, 196, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Walls on top: cream marble with a dark edge, so cover reads as cover.
  for (const wall of level.walls) {
    ctx.fillStyle = PALETTE.marble;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(wall.x, wall.y, wall.w, 5);
    ctx.strokeStyle = PALETTE.marbleEdge;
    ctx.lineWidth = 2;
    ctx.strokeRect(wall.x, wall.y, wall.w, wall.h);
  }
}
