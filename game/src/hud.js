// hud.js — the heads-up display around the canvas.
// The alarm meter is the heart of it: a bar that fills red while any eye
// is on the thief and drains when the thief is hidden, with the word
// SPOTTED! above it once it passes the warning line. Loot, level, timer
// and the two tools sit beside it, and the objective line says what to do.
export function bindHud(document) {
  return {
    level: document.getElementById('hud-level'),
    loot: document.getElementById('hud-loot'),
    alarmFill: document.getElementById('hud-alarm-fill'),
    alarmLabel: document.getElementById('hud-alarm-label'),
    time: document.getElementById('hud-time'),
    smoke: document.getElementById('hud-smoke'),
    coins: document.getElementById('hud-coins'),
    objective: document.getElementById('hud-objective'),
    banner: document.getElementById('hud-banner'),
  };
}

export function updateHud(hud, state) {
  const { levelIndex, loot, starTaken, alarm, elapsed, player, exitOpen } = state;
  hud.level.textContent = `Room ${levelIndex + 1} / 3 — ${state.levelName}`;
  hud.loot.textContent = `$${loot.toLocaleString('en-US')}`;
  hud.time.textContent = formatTime(elapsed);
  hud.smoke.textContent = `Smoke ×${player.smoke}`;
  hud.coins.textContent = `Coins ×${player.coins}`;

  const pct = Math.max(0, Math.min(100, alarm));
  hud.alarmFill.style.width = `${pct}%`;
  hud.alarmFill.style.background =
    pct >= 60 ? '#ff4b4b' : pct >= 30 ? '#ffb13b' : '#37d67a';
  hud.alarmLabel.textContent =
    pct >= 100 ? 'CAUGHT!' : pct >= 60 ? 'SPOTTED!' : pct >= 30 ? 'Seen…' : 'Hidden';

  if (!starTaken) {
    hud.objective.textContent = 'Objective: steal the Star of Marlow, then reach the EXIT.';
  } else if (!exitOpen) {
    hud.objective.textContent = 'Star taken — get to the EXIT.';
  } else {
    hud.objective.textContent = 'EXIT open — slip out before the alarm fills!';
  }
}

export function showBanner(hud, text, kind) {
  hud.banner.textContent = text;
  hud.banner.className = `banner ${kind}`;
  hud.banner.classList.add('visible');
}

export function hideBanner(hud) {
  hud.banner.classList.remove('visible');
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
