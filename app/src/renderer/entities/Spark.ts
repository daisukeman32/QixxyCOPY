import { Vector2 } from '../types';

export class Spark {
  position: Vector2;
  pathIndex: number = 0;
  isClockwise: boolean;
  speed: number;
  size: number = 8;
  currentPath: Vector2[] = [];
  targetPoint: Vector2;
  active: boolean = false;

  constructor(startPosition: Vector2, speed: number, isClockwise: boolean = true) {
    this.position = { ...startPosition };
    this.speed = speed;
    this.isClockwise = isClockwise;
    this.targetPoint = { ...startPosition };
  }

  setPath(borderPath: Vector2[]) {
    this.currentPath = [...borderPath];
    if (!this.isClockwise) {
      this.currentPath.reverse();
    }
    // Find closest point on path
    let minDist = Infinity;
    let closestIndex = 0;
    for (let i = 0; i < this.currentPath.length; i++) {
      const dx = this.currentPath[i].x - this.position.x;
      const dy = this.currentPath[i].y - this.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        closestIndex = i;
      }
    }
    this.pathIndex = closestIndex;
    this.targetPoint = { ...this.currentPath[this.pathIndex] };
  }

  start() {
    this.active = true;
  }

  update(delta: number) {
    if (!this.active || this.currentPath.length === 0) return;

    const dx = this.targetPoint.x - this.position.x;
    const dy = this.targetPoint.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 2) {
      // Reached target, move to next point
      this.pathIndex = (this.pathIndex + 1) % this.currentPath.length;
      this.targetPoint = { ...this.currentPath[this.pathIndex] };
    }

    // Move towards target
    if (distance > 0) {
      const moveDistance = this.speed * delta;
      const ratio = Math.min(moveDistance / distance, 1);
      this.position.x += dx * ratio;
      this.position.y += dy * ratio;
    }
  }

  checkCollision(point: Vector2): boolean {
    if (!this.active) return false;

    const dx = point.x - this.position.x;
    const dy = point.y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size;
  }

  render(ctx: CanvasRenderingContext2D) {
    // Always render sparks (even inactive ones) for debugging initially
    // Draw spark as a pulsing circle
    const pulse = Math.sin(Date.now() * 0.01) * 0.2 + 0.8;

    if (this.active) {
      ctx.fillStyle = '#ffaa00';
      ctx.shadowColor = '#ff6600';
      ctx.shadowBlur = 10 * pulse;
    } else {
      // Inactive sparks are dimmed
      ctx.fillStyle = '#666666';
      ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.size * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}