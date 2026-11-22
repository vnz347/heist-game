// input.js — keyboard and mouse.
// WASD or arrows move, Shift (or C) sneaks, Q throws a smoke puff,
// E tosses a coin, P or Esc pauses, R restarts, M mutes. Clicking the
// canvas walks the thief to that spot. The state object is read by the
// game loop; the callbacks let the loop react to single key presses.
export function bindInput(canvas, callbacks) {
  const state = {
    up: false,
    down: false,
    left: false,
    right: false,
    sneak: false,
  };

  const keyMap = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    ShiftLeft: 'sneak',
    ShiftRight: 'sneak',
    KeyC: 'sneak',
  };

  function onKeyDown(event) {
    const field = keyMap[event.code];
    if (field) {
      state[field] = true;
      event.preventDefault();
      return;
    }
    if (event.repeat) return;
    if (event.code === 'KeyQ') callbacks.onSmoke();
    if (event.code === 'KeyE') callbacks.onCoin();
    if (event.code === 'KeyP' || event.code === 'Escape') callbacks.onPause();
    if (event.code === 'KeyR') callbacks.onRestart();
    if (event.code === 'KeyM') callbacks.onMute();
    if (event.code === 'Enter' || event.code === 'Space') callbacks.onConfirm();
  }

  function onKeyUp(event) {
    const field = keyMap[event.code];
    if (field) state[field] = false;
  }

  function onClick(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    callbacks.onClickToMove({
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    });
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('click', onClick);

  return state;
}
