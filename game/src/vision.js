// vision.js — what a guard or a camera can actually see.
// A watcher sees the thief only when all three hold: the thief is inside
// the cone's range, inside its angle, and no wall blocks the line of sight.
// The cone a guard shows on screen is exactly the cone it sees with.
export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

// Does segment (x1,y1)-(x2,y2) cross rectangle r? Slab test.
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tMin = 0;
  let tMax = 1;
  for (const [p, q] of [
    [-dx, x1 - r.x],
    [dx, r.x + r.w - x1],
    [-dy, y1 - r.y],
    [dy, r.y + r.h - y1],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const t = q / p;
      if (p < 0) {
        if (t > tMax) return false;
        if (t > tMin) tMin = t;
      } else {
        if (t < tMin) return false;
        if (t < tMax) tMax = t;
      }
    }
  }
  return true;
}

export function lineOfSightClear(x1, y1, x2, y2, walls) {
  for (const wall of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return false;
  }
  return true;
}

// Can this watcher (x, y, facing, range, halfAngle) see point (tx, ty)?
// Returns { seen, closeness } — closeness is 1 up close, 0 at max range.
export function canSee(x, y, facing, range, halfAngle, tx, ty, walls) {
  const dist = distance(x, y, tx, ty);
  if (dist > range) return { seen: false, closeness: 0 };
  const toTarget = Math.atan2(ty - y, tx - x);
  if (Math.abs(angleDifference(toTarget, facing)) > halfAngle) {
    return { seen: false, closeness: 0 };
  }
  if (!lineOfSightClear(x, y, tx, ty, walls)) {
    return { seen: false, closeness: 0 };
  }
  return { seen: true, closeness: 1 - dist / range };
}

// Where does a cone end? Walk the ray until a wall stops it, so the drawn
// cone hugs the walls instead of painting over them.
export function coneRayEnd(x, y, angle, range, walls) {
  let best = range;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (const wall of walls) {
    // Ray vs rectangle: earliest positive t where the ray enters the rect.
    let tMin = 0;
    let tMax = Infinity;
    let ok = true;
    for (const [p, q] of [
      [-dx, x - wall.x],
      [dx, wall.x + wall.w - x],
      [-dy, y - wall.y],
      [dy, wall.y + wall.h - y],
    ]) {
      if (p === 0) {
        if (q < 0) { ok = false; break; }
      } else {
        const t = q / p;
        if (p < 0) {
          if (t > tMax) { ok = false; break; }
          if (t > tMin) tMin = t;
        } else {
          if (t < tMin) { ok = false; break; }
          if (t < tMax) tMax = t;
        }
      }
    }
    if (ok && tMin > 0 && tMin < best) best = tMin;
  }
  return { x: x + dx * best, y: y + dy * best, length: best };
}

export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}
