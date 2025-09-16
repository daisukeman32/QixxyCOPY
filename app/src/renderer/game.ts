import { Player } from './entities/Player';
import { Qix } from './entities/Qix';
import { Spark } from './entities/Spark';
import { GameField } from './core/GameField';
import { GameState, Direction, GameConfig } from './types';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameState: GameState = GameState.PLAYING;

  private player: Player;
  private qix: Qix;
  private sparks: Spark[] = [];
  private field: GameField;

  private config: GameConfig = {
    fieldWidth: 960,
    fieldHeight: 720,
    targetAreaPercentage: 75,
    playerSpeed: 120,
    playerSlowSpeed: 40,
    qixSpeed: 60,
    sparkSpeed: 100,
    lives: 3
  };

  private score: number = 0;
  private lives: number = 3;
  private lastTime: number = 0;
  private keys: Set<string> = new Set();

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    this.ctx = context;

    this.field = new GameField(this.config.fieldWidth, this.config.fieldHeight);

    const startPos = { x: this.config.fieldWidth / 2, y: 10 };
    this.player = new Player(startPos, this.config.playerSpeed, this.config.playerSlowSpeed);

    const qixStart = {
      x: this.config.fieldWidth / 2,
      y: this.config.fieldHeight / 2
    };
    this.qix = new Qix(qixStart, this.config.qixSpeed);

    // Create two sparks
    const spark1 = new Spark(
      { x: 10, y: 10 },
      this.config.sparkSpeed,
      true
    );
    const spark2 = new Spark(
      { x: this.config.fieldWidth - 10, y: 10 },
      this.config.sparkSpeed,
      false
    );

    spark1.setPath(this.field.getCurrentAreaBorders());
    spark2.setPath(this.field.getCurrentAreaBorders());

    this.sparks = [spark1, spark2];

    this.setupEventListeners();

    // Start sparks after delay
    setTimeout(() => {
      this.sparks.forEach(spark => spark.start());
    }, 2000);

    this.gameLoop(0);
  }

  private setupEventListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
  }

  private handleInput(delta: number) {
    if (this.gameState !== GameState.PLAYING) return;

    let moved = false;
    let direction: Direction | null = null;

    if (this.keys.has('ArrowUp')) {
      direction = Direction.UP;
      moved = true;
    } else if (this.keys.has('ArrowDown')) {
      direction = Direction.DOWN;
      moved = true;
    } else if (this.keys.has('ArrowLeft')) {
      direction = Direction.LEFT;
      moved = true;
    } else if (this.keys.has('ArrowRight')) {
      direction = Direction.RIGHT;
      moved = true;
    }

    if (moved && direction) {
      const oldPos = { ...this.player.position };
      this.player.move(direction, delta);

      // Check field boundaries
      if (this.player.position.x < 10) this.player.position.x = 10;
      if (this.player.position.x > this.config.fieldWidth - 10) {
        this.player.position.x = this.config.fieldWidth - 10;
      }
      if (this.player.position.y < 10) this.player.position.y = 10;
      if (this.player.position.y > this.config.fieldHeight - 10) {
        this.player.position.y = this.config.fieldHeight - 10;
      }

      // Handle drawing logic
      if (this.keys.has(' ') || this.keys.has('Shift')) {
        const isSlow = this.keys.has('Shift');
        if (!this.player.isDrawing()) {
          // Start drawing if on border
          if (this.field.isPointOnBorder(this.player.position)) {
            this.player.startDrawing(isSlow);
          }
        }
      } else if (this.player.isDrawing()) {
        // Stop drawing and process path when returning to border
        if (this.field.isPointOnBorder(this.player.position)) {
          const scoreGained = this.field.processPlayerPath(
            this.player.trail,
            this.qix.position
          );
          this.score += Math.floor(scoreGained * 0.1);
          this.player.stopDrawing();

          // Update spark paths
          this.sparks.forEach(spark => {
            spark.setPath(this.field.getCurrentAreaBorders());
          });

          this.updateUI();
        }
      }
    }
  }

  private checkCollisions() {
    if (this.gameState !== GameState.PLAYING) return;

    // Qix ONLY attacks when player is drawing (in danger zone)
    if (this.player.isDrawing()) {
      // Check if Qix hits player's trail
      for (const point of this.player.trail) {
        if (this.qix.checkCollision(point)) {
          this.loseLife();
          return;
        }
      }

      // Check if Qix hits current player position while drawing
      if (this.qix.checkCollision(this.player.position)) {
        this.loseLife();
        return;
      }
    }

    // Sparks can ALWAYS hit player (even on border) - this is correct Qixxy behavior
    for (const spark of this.sparks) {
      if (spark.checkCollision(this.player.position)) {
        this.loseLife();
        return;
      }
    }
  }

  private loseLife() {
    this.lives--;
    this.player.stopDrawing();

    if (this.lives <= 0) {
      this.gameState = GameState.GAME_OVER;
    } else {
      // Reset player position
      const startPos = { x: this.config.fieldWidth / 2, y: 10 };
      this.player.reset(startPos);
    }

    this.updateUI();
  }

  private updateUI() {
    document.getElementById('score')!.textContent = this.score.toString();
    document.getElementById('lives')!.textContent = this.lives.toString();
    document.getElementById('area')!.textContent =
      `${Math.floor(this.field.getClaimedPercentage())}% / ${this.config.targetAreaPercentage}%`;

    // Check win condition
    if (this.field.getClaimedPercentage() >= this.config.targetAreaPercentage) {
      this.gameState = GameState.STAGE_CLEAR;
    }
  }

  private update(delta: number) {
    if (this.gameState === GameState.PLAYING) {
      this.handleInput(delta);

      const fieldBounds = {
        x: 10,
        y: 10,
        width: this.config.fieldWidth - 20,
        height: this.config.fieldHeight - 20
      };

      this.qix.update(delta, fieldBounds);
      this.sparks.forEach(spark => spark.update(delta));

      this.checkCollisions();
    }
  }

  private render() {
    // Clear canvas
    this.ctx.fillStyle = '#111';
    this.ctx.fillRect(0, 0, this.config.fieldWidth, this.config.fieldHeight);

    // Render game objects
    this.field.render(this.ctx);
    this.player.render(this.ctx);
    this.qix.render(this.ctx);
    this.sparks.forEach(spark => spark.render(this.ctx));

    // Render game state overlay
    if (this.gameState === GameState.GAME_OVER) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.config.fieldWidth, this.config.fieldHeight);
      this.ctx.fillStyle = '#ff0000';
      this.ctx.font = '48px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('GAME OVER', this.config.fieldWidth / 2, this.config.fieldHeight / 2);
    } else if (this.gameState === GameState.STAGE_CLEAR) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.config.fieldWidth, this.config.fieldHeight);
      this.ctx.fillStyle = '#00ff00';
      this.ctx.font = '48px monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('STAGE CLEAR!', this.config.fieldWidth / 2, this.config.fieldHeight / 2);
    }
  }

  private gameLoop = (currentTime: number) => {
    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = currentTime;

    this.update(delta);
    this.render();

    requestAnimationFrame(this.gameLoop);
  }
}

// Start the game when the window loads
window.addEventListener('load', () => {
  new Game();
});