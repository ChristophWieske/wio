import { effect, resource, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { PathFinderFactory, Position } from '../flow-path/path-finders/path-finder';
import { isWithin } from '../is-within-rect';
import { rectEqual } from '../rect-equal';
import { FlowPathHostApi, Obstacle } from './flow-path-host-api';

interface EngineOptions {
  pathFinderFactory: PathFinderFactory;
  canvas: () => HTMLCanvasElement | null;
  fallbackSize: () => { width: number; height: number };
}

export class FlowPathHostEngine implements FlowPathHostApi {
  private readonly _positions = signal<Record<string, Position>>({});
  private readonly _obstacles = signal<Record<string, Obstacle[]>>({});
  private readonly _paths = signal<Record<string, Position[]>>({});
  private readonly _rect = signal<DOMRect | null>(null, { equal: rectEqual });
  private readonly gridChanged = new Subject<void>();

  readonly pathFinder;

  constructor(private readonly options: EngineOptions) {
    this.pathFinder = resource({
      loader: () => this.options.pathFinderFactory.createPathFinder(),
    });

    this.maintainPathFinderGrid();
    effect(() => {
      this.renderCanvas();
    });
  }

  setRect(rect: DOMRect | null): void {
    this._rect.set(rect);
  }

  rect(): DOMRect | null {
    return this._rect();
  }

  position(id: string): Position | undefined {
    return this._positions()[id];
  }

  getPathFinder() {
    return this.pathFinder.value();
  }

  onGridChanged(listener: () => void): () => void {
    const subscription = this.gridChanged.subscribe(listener);
    return () => subscription.unsubscribe();
  }

  setPosition(id: string, node: Position | undefined): void {
    this._positions.update((positions) => {
      const copy = { ...positions };

      if (node) {
        copy[id] = node;
      } else {
        delete copy[id];
      }

      return copy;
    });
  }

  setObstacle(id: string, obstacles: Obstacle[] | undefined): void {
    this._obstacles.update((obs) => {
      const copy = { ...obs };

      if (obstacles && obstacles.length > 0) {
        copy[id] = obstacles;
      } else {
        delete copy[id];
      }

      return copy;
    });
  }

  setPath(id: string, path: Position[] | undefined): void {
    this._paths.update((paths) => {
      const copy = { ...paths };

      if (path) {
        copy[id] = path;
      } else {
        delete copy[id];
      }

      return copy;
    });
  }

  private maintainPathFinderGrid(): void {
    effect(() => {
      const rect = this._rect();
      const pathfinder = this.pathFinder.value();
      if (!rect || !pathfinder) {
        return;
      }
      const obstacleList = Object.values(this._obstacles()).flatMap((entry) => entry);

      pathfinder.setGrid(Math.ceil(rect?.width ?? 0), Math.ceil(rect?.height ?? 0), obstacleList);
      this.gridChanged.next();
    });
  }

  private renderCanvas(): void {
    const canvas = this.options.canvas();
    if (!canvas) {
      return;
    }

    const rect = this._rect();
    const fallbackSize = this.options.fallbackSize();
    const width = Math.max(1, Math.ceil(rect?.width ?? fallbackSize.width));
    const height = Math.max(1, Math.ceil(rect?.height ?? fallbackSize.height));
    const ratio = window.devicePixelRatio || 1;

    if (
      canvas.width !== Math.floor(width * ratio) ||
      canvas.height !== Math.floor(height * ratio)
    ) {
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = '#4f46e5';
    context.lineWidth = 3;

    for (const path of Object.values(this._paths())) {
      if (!path || path.length < 2) {
        continue;
      }

      context.beginPath();
      context.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        context.lineTo(path[i].x, path[i].y);
      }
      context.stroke();
    }
  }
}
