import { Vector2 } from '../types';

export class Qix {
  position: Vector2;
  targetPosition: Vector2;
  speed: number;
  size: number = 40;
  rotation: number = 0;

  constructor(startPosition: Vector2, speed: number) {
    this.position = { ...startPosition };
    this.targetPosition = { ...startPosition };
    this.speed = speed;
  }

  update(delta: number, fieldBounds: { x: number, y: number, width: number, height: number }) {
    // If reached target, choose new random target
    const dx = this.targetPosition.x - this.position.x;
    const dy = this.targetPosition.y - this.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 5) {
      // Choose new random target within field bounds
      this.targetPosition = {
        x: fieldBounds.x + Math.random() * fieldBounds.width,
        y: fieldBounds.y + Math.random() * fieldBounds.height
      };
    }

    // Move towards target
    if (distance > 0) {
      const moveDistance = this.speed * delta;
      const ratio = Math.min(moveDistance / distance, 1);
      this.position.x += dx * ratio;
      this.position.y += dy * ratio;
    }

    // Update rotation for visual effect
    this.rotation += delta * 2;
  }

  checkCollision(point: Vector2): boolean {
    const dx = point.x - this.position.x;
    const dy = point.y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy) < this.size / 2;
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.position.x, this.position.y);
    ctx.rotate(this.rotation);

    // Draw as a rotating diamond shape
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -this.size / 2);
    ctx.lineTo(this.size / 2, 0);
    ctx.lineTo(0, this.size / 2);
    ctx.lineTo(-this.size / 2, 0);
    ctx.closePath();
    ctx.stroke();

    // Inner lines for visual effect
    ctx.strokeStyle = '#ff88ff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -this.size / 4);
    ctx.lineTo(this.size / 4, 0);
    ctx.lineTo(0, this.size / 4);
    ctx.lineTo(-this.size / 4, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}