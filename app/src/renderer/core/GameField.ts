import { Vector2, Polygon } from '../types';

export class GameField {
  private borders: Vector2[];
  private currentArea: Vector2[];
  private claimedAreas: Vector2[][] = [];
  private totalArea: number;
  private claimedAreaPercentage: number = 0;

  constructor(width: number, height: number, margin: number = 10) {
    // Initialize field borders
    this.borders = [
      { x: margin, y: margin },
      { x: width - margin, y: margin },
      { x: width - margin, y: height - margin },
      { x: margin, y: height - margin },
      { x: margin, y: margin } // Close the polygon
    ];
    this.currentArea = [...this.borders];
    this.totalArea = this.calculatePolygonArea(this.borders);
  }

  processPlayerPath(path: Vector2[], qixPosition: Vector2): number {
    if (path.length < 2) return 0;

    // Find where path connects to current area borders
    const startIdx = this.findClosestBorderIndex(path[0]);
    const endIdx = this.findClosestBorderIndex(path[path.length - 1]);

    // Split area into two polygons
    const poly1: Vector2[] = [];
    const poly2: Vector2[] = [];

    // Build first polygon
    poly1.push(...path);
    if (startIdx <= endIdx) {
      for (let i = endIdx; i <= startIdx + this.currentArea.length - 1; i++) {
        poly1.push({ ...this.currentArea[i % this.currentArea.length] });
      }
    } else {
      for (let i = endIdx; i <= startIdx; i++) {
        poly1.push({ ...this.currentArea[i] });
      }
    }

    // Build second polygon
    poly2.push(...path.slice().reverse());
    if (startIdx <= endIdx) {
      for (let i = startIdx; i <= endIdx; i++) {
        poly2.push({ ...this.currentArea[i] });
      }
    } else {
      for (let i = startIdx; i < this.currentArea.length; i++) {
        poly2.push({ ...this.currentArea[i] });
      }
      for (let i = 0; i <= endIdx; i++) {
        poly2.push({ ...this.currentArea[i] });
      }
    }

    // Determine which polygon contains Qix
    const qixInPoly1 = this.isPointInPolygon(qixPosition, poly1);
    const claimedPoly = qixInPoly1 ? poly2 : poly1;
    const newArea = qixInPoly1 ? poly1 : poly2;

    // Update areas
    this.claimedAreas.push(claimedPoly);
    this.currentArea = newArea;

    // Calculate claimed percentage
    const claimedSize = this.calculatePolygonArea(claimedPoly);
    this.claimedAreaPercentage += (claimedSize / this.totalArea) * 100;

    return claimedSize;
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
    for (let i = 0; i < this.currentArea.length - 1; i++) {
      const dist = this.distanceToSegment(point, this.currentArea[i], this.currentArea[i + 1]);
      if (dist < tolerance) return true;
    }
    return false;
  }

  getClaimedPercentage(): number {
    return this.claimedAreaPercentage;
  }

  getCurrentAreaBorders(): Vector2[] {
    return [...this.currentArea];
  }

  render(ctx: CanvasRenderingContext2D) {
    // Draw claimed areas
    for (const area of this.claimedAreas) {
      ctx.fillStyle = 'rgba(0, 255, 128, 0.3)';
      ctx.beginPath();
      ctx.moveTo(area[0].x, area[0].y);
      for (let i = 1; i < area.length; i++) {
        ctx.lineTo(area[i].x, area[i].y);
      }
      ctx.closePath();
      ctx.fill();
    }

    // Draw current area border
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(this.currentArea[0].x, this.currentArea[0].y);
    for (let i = 1; i < this.currentArea.length; i++) {
      ctx.lineTo(this.currentArea[i].x, this.currentArea[i].y);
    }
    ctx.stroke();
  }
}