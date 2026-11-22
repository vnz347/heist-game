// levels.js — the three rooms of the Marlow Museum.
// Each level is a room the thief crosses: walls and display cases make
// cover, carpets mark the quiet routes, shadow zones hide the thief,
// guards walk patrol loops, cameras sweep, loot waits, and one exit
// opens only once the Star of Marlow is taken.
//
// Coordinates are pixels on the 960 x 600 canvas. A wall is {x, y, w, h}.
// A patrol is a list of waypoints the guard walks in a loop.
// A camera is {x, y, angle, sweep} — it sweeps angle +/- sweep, in radians.
export const LEVELS = [
  {
    name: 'The Gallery',
    subtitle: 'Room 1 of 3 — lift the Star of Marlow',
    playerStart: { x: 70, y: 530 },
    exit: { x: 856, y: 512, w: 56, h: 56 },
    star: { x: 480, y: 92 },
    coins: [
      { x: 200, y: 150 }, { x: 760, y: 150 }, { x: 120, y: 330 },
      { x: 840, y: 330 }, { x: 480, y: 300 },
    ],
    walls: [
      { x: 0, y: 0, w: 960, h: 24 },
      { x: 0, y: 576, w: 960, h: 24 },
      { x: 0, y: 0, w: 24, h: 600 },
      { x: 936, y: 0, w: 24, h: 600 },
      // Display cases — solid cover in the middle of the room.
      { x: 250, y: 180, w: 110, h: 46 },
      { x: 600, y: 180, w: 110, h: 46 },
      { x: 250, y: 380, w: 110, h: 46 },
      { x: 600, y: 380, w: 110, h: 46 },
      // The Star's pedestal hall: two pillars frame the approach.
      { x: 400, y: 60, w: 30, h: 70 },
      { x: 530, y: 60, w: 30, h: 70 },
      // A long bench along the bottom, one more route around it.
      { x: 380, y: 470, w: 200, h: 34 },
    ],
    carpets: [
      { x: 60, y: 240, w: 840, h: 110 },
      { x: 430, y: 60, w: 100, h: 180 },
    ],
    shadows: [
      { x: 60, y: 60, w: 150, h: 120 },
      { x: 750, y: 420, w: 150, h: 120 },
    ],
    guards: [
      {
        patrol: [
          { x: 200, y: 300 }, { x: 480, y: 300 }, { x: 760, y: 300 },
          { x: 480, y: 300 },
        ],
        facing: 0,
      },
      {
        patrol: [
          { x: 830, y: 120 }, { x: 830, y: 480 }, { x: 130, y: 480 },
          { x: 130, y: 120 },
        ],
        facing: Math.PI,
      },
    ],
    cameras: [
      { x: 480, y: 24, angle: Math.PI / 2, sweep: 0.9 },
    ],
  },
  {
    name: 'The Vault Wing',
    subtitle: 'Room 2 of 3 — three guards, two cameras, no easy line',
    playerStart: { x: 70, y: 70 },
    exit: { x: 856, y: 64, w: 56, h: 56 },
    star: { x: 480, y: 510 },
    coins: [
      { x: 200, y: 300 }, { x: 760, y: 300 }, { x: 480, y: 150 },
      { x: 120, y: 480 }, { x: 840, y: 480 }, { x: 480, y: 420 },
    ],
    walls: [
      { x: 0, y: 0, w: 960, h: 24 },
      { x: 0, y: 576, w: 960, h: 24 },
      { x: 0, y: 0, w: 24, h: 600 },
      { x: 936, y: 0, w: 24, h: 600 },
      // Vault blocks: a maze of safes with three gaps to thread.
      { x: 180, y: 120, w: 46, h: 180 },
      { x: 180, y: 380, w: 46, h: 140 },
      { x: 420, y: 120, w: 120, h: 46 },
      { x: 420, y: 300, w: 120, h: 46 },
      { x: 420, y: 460, w: 120, h: 46 },
      { x: 700, y: 120, w: 46, h: 180 },
      { x: 700, y: 380, w: 46, h: 140 },
      { x: 300, y: 240, w: 90, h: 40 },
      { x: 570, y: 240, w: 90, h: 40 },
    ],
    carpets: [
      { x: 240, y: 300, w: 480, h: 60 },
      { x: 60, y: 60, w: 840, h: 50 },
    ],
    shadows: [
      { x: 240, y: 420, w: 140, h: 110 },
      { x: 580, y: 70, w: 140, h: 110 },
      { x: 60, y: 300, w: 100, h: 120 },
    ],
    guards: [
      {
        patrol: [
          { x: 300, y: 180 }, { x: 660, y: 180 }, { x: 660, y: 420 },
          { x: 300, y: 420 },
        ],
        facing: 0,
      },
      {
        patrol: [
          { x: 130, y: 200 }, { x: 130, y: 500 }, { x: 480, y: 500 },
          { x: 480, y: 200 },
        ],
        facing: Math.PI / 2,
      },
      {
        patrol: [
          { x: 830, y: 200 }, { x: 830, y: 500 }, { x: 620, y: 350 },
          { x: 830, y: 200 },
        ],
        facing: -Math.PI / 2,
      },
    ],
    cameras: [
      { x: 240, y: 24, angle: Math.PI / 2, sweep: 0.8 },
      { x: 720, y: 576, angle: -Math.PI / 2, sweep: 0.8 },
    ],
  },
  {
    name: 'The Rooftop Getaway',
    subtitle: 'Room 3 of 3 — grab the ledger, reach the skylight',
    playerStart: { x: 70, y: 530 },
    exit: { x: 856, y: 72, w: 56, h: 56 },
    star: { x: 480, y: 300 },
    coins: [
      { x: 200, y: 120 }, { x: 760, y: 480 }, { x: 120, y: 300 },
      { x: 840, y: 200 }, { x: 480, y: 520 },
    ],
    walls: [
      { x: 0, y: 0, w: 960, h: 24 },
      { x: 0, y: 576, w: 960, h: 24 },
      { x: 0, y: 0, w: 24, h: 600 },
      { x: 936, y: 0, w: 24, h: 600 },
      // Air vents and skylight frames — cover on an open roof.
      { x: 200, y: 140, w: 140, h: 40 },
      { x: 620, y: 140, w: 140, h: 40 },
      { x: 200, y: 420, w: 140, h: 40 },
      { x: 620, y: 420, w: 140, h: 40 },
      { x: 430, y: 200, w: 100, h: 36 },
      { x: 430, y: 380, w: 100, h: 36 },
    ],
    carpets: [
      { x: 60, y: 270, w: 840, h: 60 },
    ],
    shadows: [
      { x: 60, y: 60, w: 150, h: 120 },
      { x: 750, y: 420, w: 150, h: 120 },
      { x: 400, y: 470, w: 160, h: 80 },
    ],
    guards: [
      {
        patrol: [
          { x: 160, y: 300 }, { x: 480, y: 300 }, { x: 800, y: 300 },
          { x: 480, y: 300 },
        ],
        facing: 0,
      },
      {
        patrol: [
          { x: 880, y: 200 }, { x: 880, y: 500 }, { x: 480, y: 500 },
          { x: 480, y: 200 },
        ],
        facing: Math.PI,
      },
    ],
    cameras: [
      { x: 480, y: 24, angle: Math.PI / 2, sweep: 1.0 },
      { x: 24, y: 300, angle: 0, sweep: 0.7 },
    ],
  },
];
