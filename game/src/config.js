// config.js — every tunable number for The Velvet Vault, in one place.
// Canvas is 960 x 600. Speeds are pixels per second, rates are per second.
export const CONFIG = {
  canvasWidth: 960,
  canvasHeight: 600,
  tile: 40,

  playerRadius: 13,
  playerWalkSpeed: 165,
  playerSneakSpeed: 95,
  playerRadiusSneak: 11,

  guardRadius: 14,
  guardPatrolSpeed: 62,
  guardChaseSpeed: 118,
  guardSearchSpeed: 80,
  guardVisionRange: 195,
  guardVisionHalfAngle: 0.62, // radians, ~35 degrees each side
  guardHearingRadius: 170,

  cameraVisionRange: 215,
  cameraVisionHalfAngle: 0.42,
  cameraSweepSpeed: 0.55, // radians per second

  // Alarm meter 0..100. Fills while any eye sees the thief, drains otherwise.
  alarmFillGuard: 58,
  alarmFillCamera: 44,
  alarmFillCloseBonus: 26, // extra when the watcher is very close
  alarmDrain: 34,
  alarmWarningAt: 60, // "SPOTTED!" banner shows from here
  alarmCaughtAt: 100,
  caughtGraceSeconds: 1.1, // time at 100 before the net closes

  smokeRadius: 115,
  smokeSeconds: 5,
  smokePerLevel: 2,
  coinPerLevel: 3,
  coinTossDistance: 150,
  coinDistractRadius: 300,
  coinInvestigateSeconds: 4.5,

  sneakSpotFactor: 0.45, // sneaking fills the alarm this much slower
  shadowSpotFactor: 0.5, // standing in a shadow zone fills it this much slower
  guardMemorySeconds: 5, // how long a guard searches the last seen spot

  coinValue: 50,
  starValue: 500,
  timePenaltyPerSecond: 2,
};

// Palette: a night museum — deep teal floors, velvet red carpets,
// cream marble, gold loot, red danger. Safe cover reads dark blue,
// danger reads red, loot reads gold, at a glance.
export const PALETTE = {
  floor: '#16283a',
  floorAlt: '#1a2f44',
  carpet: '#5e1f2b',
  carpetEdge: '#7a2a38',
  marble: '#cfc4a8',
  marbleEdge: '#8f8468',
  wallTop: '#e8dcc0',
  shadowZone: '#0d1a2b',
  exitDoor: '#2fbf71',
  exitDoorLocked: '#5a6b7d',
  player: '#f2c14e',
  playerSneak: '#d9a441',
  guard: '#4a6fa5',
  guardAlert: '#d64545',
  cone: 'rgba(255, 84, 84, 0.28)',
  coneEdge: 'rgba(255, 120, 120, 0.55)',
  cameraCone: 'rgba(255, 170, 60, 0.22)',
  loot: '#ffd94d',
  star: '#8ef1ff',
  smoke: 'rgba(190, 200, 215, 0.55)',
};
