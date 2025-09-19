export interface Vector2 {
  x: number;
  y: number;
}

export type Point = Vector2;

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Polygon {
  vertices: Vector2[];
}

export enum GameState {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  STAGE_CLEAR = 'STAGE_CLEAR'
}

export enum PlayerState {
  ON_BORDER = 'ON_BORDER',
  DRAWING_FAST = 'DRAWING_FAST',
  DRAWING_SLOW = 'DRAWING_SLOW'
}

export enum Direction {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  UP_LEFT = 'UP_LEFT',
  UP_RIGHT = 'UP_RIGHT',
  DOWN_LEFT = 'DOWN_LEFT',
  DOWN_RIGHT = 'DOWN_RIGHT'
}

export interface GameConfig {
  fieldWidth: number;
  fieldHeight: number;
  targetAreaPercentage: number;
  playerSpeed: number;
  playerSlowSpeed: number;
  qixSpeed: number;
  sparkSpeed: number;
  lives: number;
}