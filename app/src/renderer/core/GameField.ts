import { Vector2, Polygon } from '../types';

export class GameField {
  private borders: Vector2[];
  private currentArea: Vector2[];
  private claimedAreas: Vector2[][] = [];
  private totalArea: number;
  private totalClaimedArea: number = 0;
  private backgroundImage: HTMLImageElement | null = null;
  private width: number;
  private height: number;
  private outerBorder: Vector2[]; // 外周線を常に保持

  constructor(width: number, height: number, margin: number = 0) {
    this.width = width;
    this.height = height;

    // Initialize with borders that match the visual border position
    const lineWidth = 3;
    const halfLine = lineWidth / 2;

    this.borders = [
      { x: halfLine, y: halfLine },
      { x: width - halfLine, y: halfLine },
      { x: width - halfLine, y: height - halfLine },
      { x: halfLine, y: height - halfLine },
      { x: halfLine, y: halfLine }
    ];

    // 外周線を常に保持（変更されない）
    this.outerBorder = [...this.borders];

    this.currentArea = [...this.borders];
    this.totalArea = this.calculatePolygonArea(this.borders);
    console.log(`Total field area: ${this.totalArea}`);
  }


  processPlayerPath(path: Vector2[], qixPosition: Vector2): number {
    if (path.length < 2) {
      console.warn('Path too short:', path.length);
      return 0;
    }

    console.log('=== Processing player path ===');
    console.log('Path:', path);
    console.log('Qix position:', qixPosition);

    // Simply create a closed polygon by combining the path with the current border
    // Path should start and end on the border
    const startPoint = path[0];
    const endPoint = path[path.length - 1];

    // Find the portion of the current border between start and end points
    const startInfo = this.findBorderSegmentInfo(startPoint);
    const endInfo = this.findBorderSegmentInfo(endPoint);

    console.log('Start border info:', startInfo);
    console.log('End border info:', endInfo);

    // Create a simple closed polygon: path + border segment
    const closedPolygon: Vector2[] = [...path];

    // Add border points from end to start (clockwise)
    const borderPath = this.getBorderPathSimple(endInfo.segmentIndex, startInfo.segmentIndex);
    closedPolygon.push(...borderPath);

    // Ensure polygon is properly closed
    if (closedPolygon.length > 0 &&
        (closedPolygon[0].x !== closedPolygon[closedPolygon.length - 1].x ||
         closedPolygon[0].y !== closedPolygon[closedPolygon.length - 1].y)) {
      closedPolygon.push({ ...closedPolygon[0] });
    }

    console.log('Closed polygon vertices:', closedPolygon.length);

    // Calculate the area of this polygon
    const polygonArea = Math.abs(this.calculatePolygonArea(closedPolygon));

    console.log('Polygon area:', polygonArea);

    // Validate area
    if (polygonArea <= 0 || !isFinite(polygonArea)) {
      console.error('Invalid polygon area:', polygonArea);
      console.error('Polygon vertices:', closedPolygon);
      return 0;
    }

    // Validate we have enough vertices
    if (closedPolygon.length < 3) {
      console.error('Invalid polygon - not enough vertices:', closedPolygon.length);
      return 0;
    }

    // Ensure polygon area is reasonable (not larger than total field)
    if (polygonArea > this.totalArea) {
      console.warn('Polygon area larger than total area, clamping:', polygonArea, 'vs', this.totalArea);
      polygonArea = Math.min(polygonArea, this.totalArea * 0.8);
    }

    // Check if Qix is inside this polygon
    const qixInside = this.isPointInPolygon(qixPosition, closedPolygon);
    console.log('Qix inside polygon:', qixInside);

    // Check if Qix is on any border line (which counts as player-drawn line)
    const qixOnBorder = this.isPointOnBorder(qixPosition, 5);
    console.log('Qix on border:', qixOnBorder);

    // Claim the area if:
    // 1. Qix is NOT inside the polygon, OR
    // 2. Qix is on the border (border lines count as player-drawn lines)
    if (!qixInside || qixOnBorder) {
      // Add to claimed areas
      this.claimedAreas.push([...closedPolygon]);
      this.totalClaimedArea += polygonArea;

      console.log(`Area claimed: ${polygonArea.toFixed(2)}`);
      console.log(`Total percentage: ${this.getClaimedPercentage().toFixed(2)}%`);

      return polygonArea;
    } else {
      console.log('Cannot claim area - Qix is inside the polygon and not on border');
      return 0;
    }
  }

  private findClosestBorderIndex(point: Vector2): number {
    let minDist = Infinity;
    let closestIdx = 0;

    for (let i = 0; i < this.currentArea.length - 1; i++) {
      const dist = this.distanceToSegment(point, this.currentArea[i], this.currentArea[i + 1]);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    return closestIdx;
  }

  private projectPointOnBorder(point: Vector2): Vector2 {
    let minDist = Infinity;
    let closestPoint = { ...point };

    for (let i = 0; i < this.currentArea.length - 1; i++) {
      const a = this.currentArea[i];
      const b = this.currentArea[i + 1];
      const projected = this.projectPointOnSegment(point, a, b);
      const dist = Math.sqrt((point.x - projected.x) ** 2 + (point.y - projected.y) ** 2);

      if (dist < minDist) {
        minDist = dist;
        closestPoint = projected;
      }
    }
    return closestPoint;
  }

  private projectPointOnSegment(p: Vector2, a: Vector2, b: Vector2): Vector2 {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return {
      x: a.x + t * dx,
      y: a.y + t * dy
    };
  }

  private findBorderSegmentInfo(point: Vector2): { segmentIndex: number; position: Vector2; t: number } {
    let minDist = Infinity;
    let bestSegment = 0;
    let bestT = 0;
    let bestPosition = { ...point };

    for (let i = 0; i < this.currentArea.length - 1; i++) {
      const a = this.currentArea[i];
      const b = this.currentArea[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
      const projected = {
        x: a.x + t * dx,
        y: a.y + t * dy
      };
      const dist = Math.sqrt((point.x - projected.x) ** 2 + (point.y - projected.y) ** 2);

      if (dist < minDist) {
        minDist = dist;
        bestSegment = i;
        bestT = t;
        bestPosition = projected;
      }
    }

    return {
      segmentIndex: bestSegment,
      position: bestPosition,
      t: bestT
    };
  }

  private getBorderPathSimple(fromIdx: number, toIdx: number): Vector2[] {
    const path: Vector2[] = [];

    console.log(`Getting border path from ${fromIdx} to ${toIdx}, total vertices: ${this.currentArea.length}`);

    // Ensure indices are valid
    const maxIdx = this.currentArea.length - 1; // -1 because the last point is same as first
    fromIdx = Math.max(0, Math.min(fromIdx, maxIdx - 1));
    toIdx = Math.max(0, Math.min(toIdx, maxIdx - 1));

    if (fromIdx === toIdx) {
      console.log('Start and end indices are the same, returning empty path');
      return path;
    }

    // Move clockwise around the border from fromIdx to toIdx
    let current = (fromIdx + 1) % maxIdx;
    let iterations = 0;
    const maxIterations = maxIdx;

    while (current !== toIdx && iterations < maxIterations) {
      if (current < this.currentArea.length) {
        path.push({ ...this.currentArea[current] });
      }
      current = (current + 1) % maxIdx;
      iterations++;
    }

    console.log(`Border path: ${path.length} points from idx ${fromIdx} to ${toIdx}`);
    return path;
  }

  private getBorderPath(fromInfo: { segmentIndex: number; position: Vector2; t: number },
                        toInfo: { segmentIndex: number; position: Vector2; t: number },
                        clockwise: boolean): Vector2[] {
    const path: Vector2[] = [];
    const maxIterations = this.currentArea.length; // Prevent infinite loops
    let iterations = 0;

    // Simple implementation: traverse border vertices between the segments
    let startIdx = (fromInfo.segmentIndex + 1) % (this.currentArea.length - 1);
    let endIdx = toInfo.segmentIndex;

    // Ensure indices are valid
    if (startIdx < 0) startIdx = 0;
    if (endIdx < 0) endIdx = 0;
    if (startIdx >= this.currentArea.length - 1) startIdx = this.currentArea.length - 2;
    if (endIdx >= this.currentArea.length - 1) endIdx = this.currentArea.length - 2;

    if (clockwise) {
      // Go clockwise around the border
      let current = startIdx;
      while (current !== endIdx && iterations < maxIterations) {
        if (current >= this.currentArea.length - 1) {
          current = 0;
        }
        if (current !== endIdx) {
          path.push({ ...this.currentArea[current] });
        }
        current++;
        iterations++;
      }
    } else {
      // Go counter-clockwise around the border
      let current = startIdx > 0 ? startIdx - 1 : this.currentArea.length - 2;

      while (current !== endIdx && iterations < maxIterations) {
        path.push({ ...this.currentArea[current] });
        current--;
        if (current < 0) current = this.currentArea.length - 2;
        iterations++;
      }
    }

    console.log(`Border path generation: ${iterations} iterations, ${path.length} points`);
    return path;
  }

  private distanceToSegment(p: Vector2, a: Vector2, b: Vector2): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    const nearestPoint = {
      x: a.x + t * dx,
      y: a.y + t * dy
    };
    return Math.sqrt((p.x - nearestPoint.x) ** 2 + (p.y - nearestPoint.y) ** 2);
  }

  private calculatePolygonArea(vertices: Vector2[]): number {
    let area = 0;
    for (let i = 0; i < vertices.length - 1; i++) {
      area += vertices[i].x * vertices[i + 1].y;
      area -= vertices[i + 1].x * vertices[i].y;
    }
    return Math.abs(area / 2);
  }

  private isPointInPolygon(point: Vector2, polygon: Vector2[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  isPointOnBorder(point: Vector2, tolerance: number = 5): boolean {
    // すべての青線をチェック（移動可能な線）

    // 1. 外周線（元からある青線）
    for (let i = 0; i < this.outerBorder.length - 1; i++) {
      const dist = this.distanceToSegment(point, this.outerBorder[i], this.outerBorder[i + 1]);
      if (dist < tolerance) return true;
    }

    // 2. 確保済みエリアの境界線（黄色から青になった線）= 移動可能
    for (const area of this.claimedAreas) {
      for (let i = 0; i < area.length - 1; i++) {
        const dist = this.distanceToSegment(point, area[i], area[i + 1]);
        if (dist < tolerance) return true;
      }
    }

    // 3. 現在のプレイエリアの境界線
    for (let i = 0; i < this.currentArea.length - 1; i++) {
      const dist = this.distanceToSegment(point, this.currentArea[i], this.currentArea[i + 1]);
      if (dist < tolerance) return true;
    }

    return false;
  }

  isPointOnOuterBorder(point: Vector2, tolerance: number = 5): boolean {
    // 外周境界線上かどうかを判定（保持されている外周線を使用）
    for (let i = 0; i < this.outerBorder.length - 1; i++) {
      const dist = this.distanceToSegment(point, this.outerBorder[i], this.outerBorder[i + 1]);
      if (dist < tolerance) return true;
    }
    return false;
  }

  isPointOnClaimedBorder(point: Vector2, tolerance: number = 5): boolean {
    // 確保済みエリアの境界線上かどうかを判定
    for (const area of this.claimedAreas) {
      for (let i = 0; i < area.length - 1; i++) {
        const dist = this.distanceToSegment(point, area[i], area[i + 1]);
        if (dist < tolerance) return true;
      }
    }
    return false;
  }

  getNearestBorderPoint(point: Vector2): Vector2 {
    let nearestPoint = this.outerBorder[0];
    let nearestDistance = this.getDistance(point, this.outerBorder[0]);

    // PRIORITY 1: Check outer border segments FIRST (these are always moveable)
    for (let i = 0; i < this.outerBorder.length - 1; i++) {
      const segmentPoint = this.getClosestPointOnSegment(point, this.outerBorder[i], this.outerBorder[i + 1]);
      const distance = this.getDistance(point, segmentPoint);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = segmentPoint;
      }
    }

    // PRIORITY 2: Check claimed areas borders (these become moveable blue lines)
    for (const area of this.claimedAreas) {
      for (let i = 0; i < area.length - 1; i++) {
        const segmentPoint = this.getClosestPointOnSegment(point, area[i], area[i + 1]);
        const distance = this.getDistance(point, segmentPoint);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestPoint = segmentPoint;
        }
      }
    }

    // PRIORITY 3: Check current area borders (only if not overlapping with outer/claimed)
    for (let i = 0; i < this.currentArea.length - 1; i++) {
      const segmentPoint = this.getClosestPointOnSegment(
        point,
        this.currentArea[i],
        this.currentArea[i + 1]
      );
      const distance = this.getDistance(point, segmentPoint);

      // Only use current area border if it's not already covered by outer border
      const isOuterBorderSegment = this.isSegmentPartOfOuterBorder(this.currentArea[i], this.currentArea[i + 1]);
      if (!isOuterBorderSegment && distance < nearestDistance) {
        nearestDistance = distance;
        nearestPoint = segmentPoint;
      }
    }

    return nearestPoint;
  }

  private getClosestPointOnSegment(point: Vector2, segStart: Vector2, segEnd: Vector2): Vector2 {
    const dx = segEnd.x - segStart.x;
    const dy = segEnd.y - segStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return segStart;

    const t = Math.max(0, Math.min(1, ((point.x - segStart.x) * dx + (point.y - segStart.y) * dy) / (length * length)));

    return {
      x: segStart.x + t * dx,
      y: segStart.y + t * dy
    };
  }

  private getDistance(p1: Vector2, p2: Vector2): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private isSegmentPartOfOuterBorder(start: Vector2, end: Vector2, tolerance: number = 5): boolean {
    // Check if this segment matches any outer border segment
    for (let i = 0; i < this.outerBorder.length - 1; i++) {
      const outerStart = this.outerBorder[i];
      const outerEnd = this.outerBorder[i + 1];

      // Check if segments are the same (either direction)
      const forward = (this.getDistance(start, outerStart) < tolerance && this.getDistance(end, outerEnd) < tolerance);
      const backward = (this.getDistance(start, outerEnd) < tolerance && this.getDistance(end, outerStart) < tolerance);

      if (forward || backward) {
        return true;
      }
    }
    return false;
  }

  isPointInClaimedAreas(point: Vector2): boolean {
    for (const claimedArea of this.claimedAreas) {
      if (this.isPointInPolygon(point, claimedArea)) {
        return true;
      }
    }
    return false;
  }

  getClaimedPercentage(): number {
    // 正確な陣地獲得率を計算
    const usableArea = this.totalArea - 20; // 境界線分を除いた実際の使用可能エリア
    const percentage = (this.totalClaimedArea / usableArea) * 100;
    console.log(`Percentage calculation: ${this.totalClaimedArea} / ${usableArea} (usable) = ${percentage}%`);
    console.log(`Total claimed areas: ${this.claimedAreas.length}`);
    console.log(`Individual areas:`, this.claimedAreas.map(area => this.calculatePolygonArea(area)));
    return Math.min(percentage, 100);
  }

  getCurrentAreaBorders(): Vector2[] {
    return [...this.currentArea];
  }

  loadBackgroundImage(imagePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.backgroundImage = img;
        resolve();
      };
      img.onerror = () => {
        reject(new Error(`Failed to load background image: ${imagePath}`));
      };
      img.src = imagePath;
    });
  }




  render(ctx: CanvasRenderingContext2D) {
    // Fill entire screen with black first (game area)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);

    // 確保済み領域をピンク色で表示（背景画像は使用しない）
    for (const area of this.claimedAreas) {
      ctx.fillStyle = '#ff69b4';
      ctx.beginPath();
      ctx.moveTo(area[0].x, area[0].y);
      for (let i = 1; i < area.length; i++) {
        ctx.lineTo(area[i].x, area[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Draw current play area border (blue - this is where player can move)
    // 境界線を内側に描画してキャンバスの端にぴったり合わせる
    const lineWidth = 3;
    const halfLine = lineWidth / 2;

    ctx.strokeStyle = '#0080ff';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(halfLine, halfLine);
    ctx.lineTo(this.width - halfLine, halfLine);
    ctx.lineTo(this.width - halfLine, this.height - halfLine);
    ctx.lineTo(halfLine, this.height - halfLine);
    ctx.closePath();
    ctx.stroke();

    // Draw claimed areas borders
    for (const area of this.claimedAreas) {
      ctx.strokeStyle = '#0080ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(area[0].x, area[0].y);
      for (let i = 1; i < area.length; i++) {
        ctx.lineTo(area[i].x, area[i].y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }

  private renderBackgroundInClaimedAreas(ctx: CanvasRenderingContext2D) {
    if (!this.backgroundImage) return;

    // Draw background in each claimed area
    for (const area of this.claimedAreas) {
      ctx.save();

      // Create clipping path for this claimed area
      ctx.beginPath();
      ctx.moveTo(area[0].x, area[0].y);
      for (let i = 1; i < area.length; i++) {
        ctx.lineTo(area[i].x, area[i].y);
      }
      ctx.closePath();
      ctx.clip();

      // Draw background image in this claimed area
      ctx.drawImage(this.backgroundImage, 0, 0, this.width, this.height);

      ctx.restore();
    }
  }

  private renderBackgroundWithMask(ctx: CanvasRenderingContext2D) {
    if (!this.backgroundImage || this.claimedAreas.length === 0) return;

    // 現在のクリッピング領域を保存
    ctx.save();

    // すべての陣地確保エリアを一つのパスにまとめる
    ctx.beginPath();
    for (const area of this.claimedAreas) {
      ctx.moveTo(area[0].x, area[0].y);
      for (let i = 1; i < area.length; i++) {
        ctx.lineTo(area[i].x, area[i].y);
      }
      ctx.closePath();
    }

    // クリッピングマスクを設定
    ctx.clip();

    // 背景画像をゲームフィールドサイズに合わせて描画
    ctx.drawImage(
      this.backgroundImage,
      10, 10, // x, y (margin分オフセット)
      this.width - 20, this.height - 20 // width, height (margin分縮小)
    );

    // クリッピング領域を復元
    ctx.restore();
  }
}