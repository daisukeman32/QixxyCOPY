import { Point } from '../types';

export class Fuse {
  public position: Point;
  public isActive: boolean = false;
  public isChasing: boolean = false;
  private currentPathIndex: number = 0;
  private playerTrail: Point[] = [];
  private speed: number;
  private delayTimer: number = 0;
  private readonly DELAY_TIME = 1000; // 1 second delay for better gameplay

  constructor(speed: number = 60) {
    this.position = { x: 0, y: 0 };
    this.speed = speed;
  }

  start(startPosition: Point, playerTrail: Point[]) {
    this.position = { ...startPosition };
    this.playerTrail = [...playerTrail];
    this.currentPathIndex = 0;
    this.isActive = true;
    this.isChasing = false;
    this.delayTimer = 0;
  }

  updateTrail(newTrail: Point[]) {
    if (this.isActive) {
      this.playerTrail = [...newTrail];
    }
  }

  update(delta: number) {
    if (!this.isActive) return;

    if (!this.isChasing) {
      this.delayTimer += delta * 1000;
      if (this.delayTimer >= this.DELAY_TIME) {
        this.isChasing = true;
      }
      return;
    }

    // Chase along the player's trail
    if (this.currentPathIndex < this.playerTrail.length) {
      const targetPoint = this.playerTrail[this.currentPathIndex];
      const dx = targetPoint.x - this.position.x;
      const dy = targetPoint.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 2) {
        // Reached current target, move to next point
        this.currentPathIndex++;
        if (this.currentPathIndex < this.playerTrail.length) {
          this.position = { ...this.playerTrail[this.currentPathIndex] };
        }
      } else {
        // Move towards target
        const moveDistance = this.speed * delta;
        this.position.x += (dx / distance) * moveDistance;
        this.position.y += (dy / distance) * moveDistance;
      }
    } else if (this.playerTrail.length > 0) {
      // Chase current player position
      const targetPoint = this.playerTrail[this.playerTrail.length - 1];
      const dx = targetPoint.x - this.position.x;
      const dy = targetPoint.y - this.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 1) {
        const moveDistance = this.speed * delta;
        this.position.x += (dx / distance) * moveDistance;
        this.position.y += (dy / distance) * moveDistance;
      }
    }
  }

  checkCollision(playerPosition: Point): boolean {
    if (!this.isActive || !this.isChasing) return false;

    const dx = this.position.x - playerPosition.x;
    const dy = this.position.y - playerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < 8; // Collision radius
  }

  stop() {
    this.isActive = false;
    this.isChasing = false;
    this.delayTimer = 0;
    this.currentPathIndex = 0;
    this.playerTrail = [];
  }

  render(ctx: CanvasRenderingContext2D) {
    if (!this.isActive || !this.isChasing) return;

    // Draw fuse as a bright spark
    ctx.save();
    ctx.fillStyle = '#ffff00';
    ctx.strokeStyle = '#ff6600';
    ctx.lineWidth = 2;

    // Draw main fuse body
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Draw sparks
    for (let i = 0; i < 3; i++) {
      const angle = (Date.now() / 100 + i * 120) % 360;
      const sparkX = this.position.x + Math.cos(angle) * 8;
      const sparkY = this.position.y + Math.sin(angle) * 8;

      ctx.beginPath();
      ctx.arc(sparkX, sparkY, 1, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  renderTrail(ctx: CanvasRenderingContext2D) {
    if (!this.isActive || this.playerTrail.length < 2) return;

    ctx.save();
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);

    ctx.beginPath();
    for (let i = 0; i < this.currentPathIndex && i < this.playerTrail.length - 1; i++) {
      const current = this.playerTrail[i];
      const next = this.playerTrail[i + 1];

      if (i === 0) {
        ctx.moveTo(current.x, current.y);
      }
      ctx.lineTo(next.x, next.y);
    }
    ctx.stroke();

    ctx.restore();
  }
}