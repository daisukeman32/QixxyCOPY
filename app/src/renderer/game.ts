import { Player } from './entities/Player';
import { Qix } from './entities/Qix';
import { Spark } from './entities/Spark';
import { GameField } from './core/GameField';
import { GameState, Direction, GameConfig, Vector2, PlayerState } from './types';

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

    // Setup responsive scaling
    this.setupResponsiveScaling();

    this.field = new GameField(this.config.fieldWidth, this.config.fieldHeight);

    // プレイヤーを確実に境界線上に配置（上側の中央）
    const startPos = { x: this.config.fieldWidth / 2, y: 1.5 }; // 境界線の太さを考慮
    this.player = new Player(startPos, this.config.playerSpeed, this.config.playerSlowSpeed);

    // 初期位置を境界線にスナップ
    const borderPoint = this.field.getNearestBorderPoint(this.player.position);
    this.player.position = { ...borderPoint };
    console.log('Player initial position:', this.player.position);
    console.log('Is on border:', this.field.isPointOnBorder(this.player.position));

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

  private setupResponsiveScaling() {
    const gameContainer = document.getElementById('game-container') as HTMLElement;

    const updateScale = () => {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      const gameRatio = 1280 / 720; // Original game aspect ratio
      const windowRatio = windowWidth / windowHeight;

      let scale: number;
      if (windowRatio > gameRatio) {
        // Window is wider than game - scale by height
        scale = windowHeight / 720;
      } else {
        // Window is taller than game - scale by width
        scale = windowWidth / 1280;
      }

      // Limit scale to reasonable bounds
      scale = Math.min(scale, 1); // Don't scale larger than original
      scale = Math.max(scale, 0.3); // Don't scale smaller than 30%

      gameContainer.style.transform = `scale(${scale})`;

      // Center the scaled game
      gameContainer.style.position = 'absolute';
      gameContainer.style.left = '50%';
      gameContainer.style.top = '50%';
      gameContainer.style.marginLeft = '-640px'; // Half of original width
      gameContainer.style.marginTop = '-360px'; // Half of original height
    };

    // Initial scale
    updateScale();

    // Update scale on window resize
    window.addEventListener('resize', updateScale);
  }

  private constrainPlayerToField() {
    const lineWidth = 3;
    const halfLine = lineWidth / 2;

    // X軸の制限（境界線の内側）
    if (this.player.position.x < halfLine) {
      this.player.position.x = halfLine;
    } else if (this.player.position.x > this.config.fieldWidth - halfLine) {
      this.player.position.x = this.config.fieldWidth - halfLine;
    }

    // Y軸の制限（境界線の内側）
    if (this.player.position.y < halfLine) {
      this.player.position.y = halfLine;
    } else if (this.player.position.y > this.config.fieldHeight - halfLine) {
      this.player.position.y = this.config.fieldHeight - halfLine;
    }
  }

  private forcePlayerOnAnyBlueLine() {
    const nearestPoint = this.field.getNearestBorderPoint(this.player.position);
    this.player.position = { ...nearestPoint };
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

    // Check for diagonal movement first
    const up = this.keys.has('ArrowUp');
    const down = this.keys.has('ArrowDown');
    const left = this.keys.has('ArrowLeft');
    const right = this.keys.has('ArrowRight');

    if (up && left) {
      direction = Direction.UP_LEFT;
      moved = true;
    } else if (up && right) {
      direction = Direction.UP_RIGHT;
      moved = true;
    } else if (down && left) {
      direction = Direction.DOWN_LEFT;
      moved = true;
    } else if (down && right) {
      direction = Direction.DOWN_RIGHT;
      moved = true;
    } else if (up) {
      direction = Direction.UP;
      moved = true;
    } else if (down) {
      direction = Direction.DOWN;
      moved = true;
    } else if (left) {
      direction = Direction.LEFT;
      moved = true;
    } else if (right) {
      direction = Direction.RIGHT;
      moved = true;
    }

    if (moved && direction) {
      const oldPos = { ...this.player.position };

      // 線を描いている時は自由移動（ただしフィールド内限定）
      if (this.player.isDrawing()) {
        const moveResult = this.player.move(direction, delta);

        // Check if move caused death (reverse direction while drawing)
        if (!moveResult) {
          this.loseLife();
          return;
        }

        // フィールド外に出ないよう制限
        this.constrainPlayerToField();
      } else {
        // プレイヤーを移動
        const moveResult = this.player.move(direction, delta);

        if (!moveResult) {
          this.loseLife();
          return;
        }

        // 線を引いていない時は常に境界線上に固定
        this.forcePlayerOnAnyBlueLine();

        // 常にプレイヤー状態を境界線上に保つ（線描画を可能にするため）
        this.player.state = PlayerState.ON_BORDER;
      }
    }

    // Handle drawing logic (シンプル化 - SpaceでもShiftでも同じ動作)
    if (this.keys.has(' ') || this.keys.has('Shift')) {
      if (!this.player.isDrawing()) {
        // 強制的に線を引く（デバッグ用）
        console.log('=== FORCING DRAW ===');
        console.log('Before - Player state:', this.player.state);
        console.log('Before - Is drawing:', this.player.isDrawing());

        // 状態を強制的にON_BORDERにしてからstartDrawing
        this.player.state = PlayerState.ON_BORDER;
        this.player.startDrawing(false);

        console.log('After - Player state:', this.player.state);
        console.log('After - Is drawing:', this.player.isDrawing());
        console.log('Trail:', this.player.trail);
      }
    } else if (this.player.isDrawing()) {
      // Stop drawing and process path when returning to border
      if (this.field.isPointOnBorder(this.player.position)) {
        console.log('=== COMPLETING AREA ===');
        console.log('Player trail before processing:', this.player.trail);
        console.log('Player current position:', this.player.position);
        console.log('Qix position:', this.qix.position);

        // 境界線上の正確な位置で終了
        const borderPoint = this.field.getNearestBorderPoint(this.player.position);
        this.player.position = { ...borderPoint };

        // Ensure we have a valid trail with start and end on border
        const trail = [...this.player.trail];

        // Make sure start point is on border
        if (trail.length > 0) {
          const startBorderPoint = this.field.getNearestBorderPoint(trail[0]);
          trail[0] = startBorderPoint;
        }

        // Add final border point
        trail.push({ ...borderPoint });

        console.log('Final trail for processing:', trail);
        console.log('Trail length:', trail.length);

        // Validate trail has minimum points
        if (trail.length >= 2) {
          const scoreGained = this.field.processPlayerPath(trail, this.qix.position);
          console.log('Score gained:', scoreGained);

          if (scoreGained > 0) {
            this.score += Math.floor(scoreGained * 0.1);
            console.log('New score:', this.score);
            this.updateUI();
          } else {
            console.warn('Failed to process player path, no area gained');
          }
        } else {
          console.warn('Trail too short for territory acquisition:', trail.length);
        }

        this.player.stopDrawing();
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

    // Show/hide overlays based on game state
    const gameOverOverlay = document.getElementById('game-over-overlay') as HTMLElement;
    const stageClearOverlay = document.getElementById('stage-clear-overlay') as HTMLElement;

    if (this.gameState === GameState.GAME_OVER) {
      gameOverOverlay.style.display = 'flex';
      stageClearOverlay.style.display = 'none';
    } else if (this.gameState === GameState.STAGE_CLEAR) {
      gameOverOverlay.style.display = 'none';
      stageClearOverlay.style.display = 'flex';
    } else {
      gameOverOverlay.style.display = 'none';
      stageClearOverlay.style.display = 'none';
    }
  }

  private gameLoop = (currentTime: number) => {
    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = currentTime;

    this.update(delta);
    this.render();

    requestAnimationFrame(this.gameLoop);
  }

  restart() {
    // Reset game state
    this.gameState = GameState.PLAYING;
    this.score = 0;
    this.lives = 3;

    // Reset field
    this.field = new GameField(this.config.fieldWidth, this.config.fieldHeight);

    // Reset player
    const startPos = { x: this.config.fieldWidth / 2, y: 1.5 };
    this.player.reset(startPos);
    const borderPoint = this.field.getNearestBorderPoint(this.player.position);
    this.player.position = { ...borderPoint };

    // Reset qix
    const qixStart = {
      x: this.config.fieldWidth / 2,
      y: this.config.fieldHeight / 2
    };
    this.qix.position = { ...qixStart };
    this.qix.targetPosition = { ...qixStart };

    // Reset sparks
    this.sparks.forEach(spark => {
      spark.setPath(this.field.getCurrentAreaBorders());
    });

    // Update UI
    this.updateUI();
  }
}

// Make game instance globally accessible for restart button
declare global {
  interface Window {
    game: Game;
  }
}

// Start the game when the window loads
window.addEventListener('load', () => {
  window.game = new Game();
});