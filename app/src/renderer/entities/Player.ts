import { Vector2, PlayerState, Direction } from '../types';

export class Player {
  position: Vector2;
  state: PlayerState;
  direction: Direction;
  speed: number;
  slowSpeed: number;
  currentSpeed: number;
  size: number = 10;
  trail: Vector2[] = [];

  constructor(startPosition: Vector2, speed: number, slowSpeed: number) {
    this.position = { ...startPosition };
    this.state = PlayerState.ON_BORDER;
    this.direction = Direction.RIGHT;
    this.speed = speed;
    this.slowSpeed = slowSpeed;
    this.currentSpeed = speed;
  }

  startDrawing(isSlow: boolean = false) {
    if (this.state === PlayerState.ON_BORDER) {
      this.state = isSlow ? PlayerState.DRAWING_SLOW : PlayerState.DRAWING_FAST;
      this.currentSpeed = isSlow ? this.slowSpeed : this.speed;
      this.trail = [{ ...this.position }];
    }
  }

  stopDrawing() {
    this.state = PlayerState.ON_BORDER;
    this.currentSpeed = this.speed;
    this.trail = [];
  }

  move(direction: Direction, delta: number) {
    this.direction = direction;
    const distance = this.currentSpeed * delta;

    switch (direction) {
      case Direction.UP:
        this.position.y -= distance;
        break;
      case Direction.DOWN:
        this.position.y += distance;
        break;
      case Direction.LEFT:
        this.position.x -= distance;
        break;
      case Direction.RIGHT:
        this.position.x += distance;
        break;
    }

    if (this.isDrawing() && this.trail.length > 0) {
      const lastPoint = this.trail[this.trail.length - 1];
      if (Math.abs(this.position.x - lastPoint.x) > 1 ||
          Math.abs(this.position.y - lastPoint.y) > 1) {
        this.trail.push({ ...this.position });
      }
    }
  }

  isDrawing(): boolean {
    return this.state === PlayerState.DRAWING_FAST ||
           this.state === PlayerState.DRAWING_SLOW;
  }

  reset(startPosition: Vector2) {
    this.position = { ...startPosition };
    this.state = PlayerState.ON_BORDER;
    this.direction = Direction.RIGHT;
    this.currentSpeed = this.speed;
    this.trail = [];
  }

  render(ctx: CanvasRenderingContext2D) {
    // Draw trail
    if (this.trail.length > 1) {
      ctx.strokeStyle = this.state === PlayerState.DRAWING_SLOW ? '#00ff00' : '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.lineTo(this.position.x, this.position.y);
      ctx.stroke();
    }

    // Draw player
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(
      this.position.x - this.size / 2,
      this.position.y - this.size / 2,
      this.size,
      this.size
    );
  }
}