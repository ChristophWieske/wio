import { computed, effect, resource, Signal, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { PathFinderFactory, Position } from '../flow-path/path-finders/path-finder';
import { rectEqual } from '../rect-equal';
import { FlowPathHostApi, Obstacle } from './flow-path-host-api';

/** Padding around node positions added to the grid bounds (canvas space pixels). */
const GRID_PADDING = 1;
/**
 * Grid bounds are quantized to this step size.
 * Nodes moving within one step of the current boundary won't trigger a grid rebuild.
 */
const GRID_STEP = 100;

interface EngineOptions {
  pathFinderFactory: PathFinderFactory;
  canvas: Signal<HTMLCanvasElement | undefined>;
  fallbackSize: () => { width: number; height: number };
}

export class FlowPathHostEngine {
  private readonly _positions = signal<Record<string, Position>>({});
  private readonly _obstacles = signal<Record<string, Obstacle[]>>({});
  private readonly _paths = signal<Record<string, Position[]>>({});
  private readonly _rect = signal<DOMRect | null>(null, { equal: rectEqual });
  private readonly gridChanged = new Subject<void>();

  /**
   * Bounding box of the pathfinding grid in canvas space.
   * Encompasses the canvas rect plus all node positions (with padding),
   * quantized to GRID_STEP to avoid rebuilding the grid on every small move.
   */
  private readonly _gridBounds = computed(
    () => {
      const rect = this._rect();
      const positions = this._positions();
      const obstacles = this._obstacles();

      let minX = 0;
      let minY = 0;
      let maxX = rect ? Math.ceil(rect.width) : 0;
      let maxY = rect ? Math.ceil(rect.height) : 0;

      for (const pos of Object.values(positions)) {
        minX = Math.min(minX, pos.x - GRID_PADDING);
        minY = Math.min(minY, pos.y - GRID_PADDING);
        maxX = Math.max(maxX, pos.x + GRID_PADDING);
        maxY = Math.max(maxY, pos.y + GRID_PADDING);
      }

      for (const group of Object.values(obstacles)) {
        for (const obs of group) {
          minX = Math.min(minX, obs.x);
          minY = Math.min(minY, obs.y);
          maxX = Math.max(maxX, obs.x + obs.width);
          maxY = Math.max(maxY, obs.y + obs.height);
        }
      }

      minX = Math.floor(minX / GRID_STEP) * GRID_STEP;
      minY = Math.floor(minY / GRID_STEP) * GRID_STEP;
      maxX = Math.ceil(maxX / GRID_STEP) * GRID_STEP;
      maxY = Math.ceil(maxY / GRID_STEP) * GRID_STEP;

      return { minX, minY, width: maxX - minX, height: maxY - minY };
    },
    {
      equal: (a, b) =>
        a.minX === b.minX && a.minY === b.minY && a.width === b.width && a.height === b.height,
    },
  );

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

  private gridOffset(): Position {
    const bounds = this._gridBounds();
    return { x: bounds.minX, y: bounds.minY };
  }

  position(id: string): Position | undefined {
    return this._positions()[id];
  }

  findPath(id: string, waypoints: (Position | undefined)[]): Position[] {
    const pathfinder = this.pathFinder.value();
    const { x: offsetX, y: offsetY } = this.gridOffset();
    const combinedPath: Position[] = [];

    for (let i = 1; i < waypoints.length; i++) {
      const from = waypoints[i - 1];
      const to = waypoints[i];

      if (!from || !to || !pathfinder) {
        this.storePath(id, undefined);
        return [];
      }

      const path = pathfinder.findPath(
        Math.round(from.x - offsetX),
        Math.round(from.y - offsetY),
        Math.round(to.x - offsetX),
        Math.round(to.y - offsetY),
      );
      if (path) {
        combinedPath.push(...path.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY })));
      }
    }

    this.storePath(id, combinedPath.length > 0 ? combinedPath : undefined);
    return combinedPath;
  }

  clearPath(id: string): void {
    this.storePath(id, undefined);
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

  private storePath(id: string, path: Position[] | undefined): void {
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
      const gridBounds = this._gridBounds();
      const pathfinder = this.pathFinder.value();
      if (!pathfinder) {
        return;
      }

      const offsetX = gridBounds.minX;
      const offsetY = gridBounds.minY;

      // _obstacles() is read directly so obstacle layout changes within existing
      // bounds (no bounds change) still trigger a grid rebuild.
      const obstacleList = Object.values(this._obstacles())
        .flatMap((entry) => entry)
        .map((obs) => ({ ...obs, x: obs.x - offsetX, y: obs.y - offsetY }));

      pathfinder.setGrid(gridBounds.width, gridBounds.height, obstacleList);
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
