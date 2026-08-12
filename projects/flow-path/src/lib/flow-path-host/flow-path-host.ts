import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  output,
  resource,
  signal,
  viewChild,
} from '@angular/core';
import {
  PathFinderFactory,
  Position,
} from '../flow-path/path-finders/path-finder';
import { isWithin } from '../is-within-rect';
import { rectEqual } from '../rect-equal';

export interface Obstacle extends Position {
  width: number;
  height: number;
  weight: number;
}

@Component({
  selector: 'wio-flow-path-host',
  imports: [],
  templateUrl: './flow-path-host.html',
  styleUrl: './flow-path-host.css',
})
export class FlowPathHost {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly _positions = signal<Record<string, Position>>({});
  private readonly _obstacles = signal<Record<string, Obstacle[]>>({});
  private readonly _paths = signal<Record<string, Position[]>>({});
  private readonly _rect = signal<DOMRect | null>(null, { equal: rectEqual });
  private readonly pathFinderFactory = inject(PathFinderFactory);

  readonly pathFinder = resource({ loader: () => this.pathFinderFactory.createPathFinder() });
  readonly positions = this._positions.asReadonly();
  readonly rect = this._rect.asReadonly();
  readonly paths = computed(() =>
    Object.entries(this._paths()).map(([id, path]) => ({ id, path })),
  );
  readonly weightsChanged = output();

  constructor() {
    this.maintainRect();
    this.maintainPathFinderDimensions();
    this.maintainPathFinderWeights();
    effect(() => {
      this.renderCanvas();
    });
  }

  private maintainRect() {
    const observer = new ResizeObserver(() => {
      this._rect.set(this.host.getBoundingClientRect());
    });
    observer.observe(this.host);

    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  private renderCanvas(): void {
    const canvas = this.canvas()?.nativeElement;
    if (!canvas) {
      return;
    }

    const rect = this._rect();
    const width = Math.max(1, Math.ceil(rect?.width ?? this.host.clientWidth ?? 0));
    const height = Math.max(1, Math.ceil(rect?.height ?? this.host.clientHeight ?? 0));
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

    for (const entry of this.paths()) {
      if (!entry.path || entry.path.length < 2) {
        continue;
      }

      context.beginPath();
      context.moveTo(entry.path[0].x, entry.path[0].y);
      for (let i = 1; i < entry.path.length; i++) {
        context.lineTo(entry.path[i].x, entry.path[i].y);
      }
      context.stroke();
    }
  }

  private maintainPathFinderDimensions(): void {
    effect(() => {
      this.pathFinder
        .value()
        ?.setDimensions(Math.ceil(this._rect()?.width ?? 0), Math.ceil(this._rect()?.height ?? 0));
    });
  }

  private maintainPathFinderWeights(): void {
    effect(() => {
      const rect = this._rect();
      const pathfinder = this.pathFinder.value();
      if (!rect || !pathfinder) {
        return;
      }

      const height = Math.ceil(rect.height);
      const width = Math.ceil(rect.width);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const obstacles = Object.values(this._obstacles())
            .flatMap((x) => x)
            .filter((obs) => isWithin({ x, y }, obs));

          if (obstacles.length === 0) {
            pathfinder.setWeight(x, y, 1);
            continue;
          }

          if (obstacles.some((x) => x.weight === 0)) {
            pathfinder.setWeight(x, y, 0);
            continue;
          }

          const combinedWeight = obstacles.reduce((acc, cur) => acc + cur.weight, 0);
          pathfinder.setWeight(x, y, combinedWeight);
        }
      }

      this.weightsChanged.emit();
    });
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
}
