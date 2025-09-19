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
  private lastDirection: Direction | null = null;

  constructor(startPosition: Vector2, speed: number, slowSpeed: number) {
    this.position = { ...startPosition };
    this.state = PlayerState.ON_BORDER;
    this.direction = Direction.RIGHT;
    this.speed = speed;
    this.slowSpeed = slowSpeed;
    this.currentSpeed = speed;
  }

  startDrawing(isSlow: boolean = false) {
    console.log('startDrawing called with state:', this.state);
    if (this.state === PlayerState.ON_BORDER) {
      this.state = isSlow ? PlayerState.DRAWING_SLOW : PlayerState.DRAWING_FAST;
      this.currentSpeed = isSlow ? this.slowSpeed : this.speed;
      this.trail = [{ ...this.position }];
      this.lastDirection = this.direction;
      console.log('Drawing started! New state:', this.state, 'Trail:', this.trail);
    } else {
      console.log('Cannot start drawing - not ON_BORDER');
    }
  }

  stopDrawing() {
    this.state = PlayerState.ON_BORDER;
    this.currentSpeed = this.speed;
    this.trail = [];
    this.lastDirection = null;
  }

  move(direction: Direction, delta: number) {
    // Check for reverse direction while drawing (causes instant death)
    if (this.isDrawing() && this.lastDirection !== null) {
      const isReverse = this.isReverseDirection(direction, this.lastDirection);
      if (isReverse) {
        return false; // Signal collision/death
      }
    }

    this.direction = direction;
    this.lastDirection = direction;
    const distance = this.currentSpeed * delta;
    const diagonalDistance = distance * 0.707; // sqrt(2)/2 for diagonal movement

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
      case Direction.UP_LEFT:
        this.position.x -= diagonalDistance;
        this.position.y -= diagonalDistance;
        break;
      case Direction.UP_RIGHT:
        this.position.x += diagonalDistance;
        this.position.y -= diagonalDistance;
        break;
      case Direction.DOWN_LEFT:
        this.position.x -= diagonalDistance;
        this.position.y += diagonalDistance;
        break;
      case Direction.DOWN_RIGHT:
        this.position.x += diagonalDistance;
        this.position.y += diagonalDistance;
        break;
    }

    if (this.isDrawing()) {
      if (this.trail.length === 0) {
        this.trail.push({ ...this.position });
      } else {
        const lastPoint = this.trail[this.trail.length - 1];
        const distance = Math.sqrt(
          Math.pow(this.position.x - lastPoint.x, 2) +
          Math.pow(this.position.y - lastPoint.y, 2)
        );
        if (distance > 3) {
          this.trail.push({ ...this.position });
          console.log('Added trail point:', this.position, 'Total points:', this.trail.length);
        }
      }
    }

    return true;
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
    this.lastDirection = null;
  }

  update(delta: number) {
    // No update needed
  }

  checkFuseCollision(): boolean {
    return false; // Fuse system disabled
  }

  private isReverseDirection(current: Direction, last: Direction): boolean {
    return (
      (current === Direction.UP && last === Direction.DOWN) ||
      (current === Direction.DOWN && last === Direction.UP) ||
      (current === Direction.LEFT && last === Direction.RIGHT) ||
      (current === Direction.RIGHT && last === Direction.LEFT) ||
      (current === Direction.UP_LEFT && last === Direction.DOWN_RIGHT) ||
      (current === Direction.DOWN_RIGHT && last === Direction.UP_LEFT) ||
      (current === Direction.UP_RIGHT && last === Direction.DOWN_LEFT) ||
      (current === Direction.DOWN_LEFT && last === Direction.UP_RIGHT)
    );
  }

  render(ctx: CanvasRenderingContext2D) {
    // Draw trail - 1点でも線を引いていれば現在位置まで線を描画
    if (this.trail.length > 0 && this.isDrawing()) {
      ctx.strokeStyle = this.state === PlayerState.DRAWING_SLOW ? '#00ff00' : '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      // 常に現在位置まで線を引く
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