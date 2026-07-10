export const COLORS = {
  taxiYellow: 0xf4c430,
  taxiYellowDark: 0xd1a520,
  colonialWhite: 0xf5f0e6,
  laterite: 0xb5502f,
  vegDark: 0x4a7c3c,
  vegLight: 0x7fa65c,
  sky: 0x5fa8d3,
  water: 0x2e6f95,
  asphalt: 0x55565c,
  roadLine: 0xf5f0e6,
  sidewalk: 0xbfb9a8,
  glass: 0x9fd3e8,
  tin: 0x8a7f6a,
  marketRed: 0xc0392b,
  marketBlue: 0x2d6a8f,
  marketGreen: 0x5c8a3a,
  marketOrange: 0xd9822b,
  wood: 0x7a5230,
  tireBlack: 0x1c1c1c,
};

// City grid: 4x4 blocks
export const BLOCK_SIZE = 22; // building footprint side
export const ROAD_WIDTH = 10;
export const CELL = BLOCK_SIZE + ROAD_WIDTH; // distance between block centers
export const GRID_N = 4;

// City spans from -HALF to +HALF on both axes (approx, plus a margin for waterfront)
export const HALF_SPAN = (GRID_N * CELL) / 2;

export const PHYSICS = {
  maxSpeed: 25, // units/sec
  reverseMaxSpeed: 10,
  acceleration: 16,
  brakeDeceleration: 30,
  friction: 8,
  turnSpeed: 2.4, // rad/sec at reference speed
  handbrakeDeceleration: 45,
};

export const FARE = {
  ratePerUnit: 50, // Ar per unit distance
  speedBonusMax: 0.5, // up to +50%
  baseTimeSecPerUnit: 0.32, // time budget scaling with trip distance
  minTime: 18,
};
