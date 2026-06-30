import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  output, resource,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
  private readonly _positions = signal<Record<string, Position>>({});
  private readonly _obstacles = signal<Record<string, Obstacle[]>>({});
  private readonly _paths = signal<Record<string, string>>({});
  private readonly _rect = signal<DOMRect | null>(null, { equal: rectEqual });
  private readonly pathFinderFactory = inject(PathFinderFactory);

  readonly pathFinder = resource({ loader: () => this.pathFinderFactory.createPathFinder() });
  readonly positions = this._positions.asReadonly();
  readonly rect = this._rect.asReadonly();
  readonly paths = computed(() =>
    Object.entries(this._paths()).map(([id, data]) => ({ id, data })),
  );
  readonly weightsChanged = output();

  constructor() {
    this.maintainRect();
    this.maintainPathFinderDimensions();
    this.maintainPathFinderWeights();
  }

  private maintainRect() {
    const observer = new ResizeObserver(() => {
      this._rect.set(this.host.getBoundingClientRect());
    });
    observer.observe(this.host);

    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  private maintainPathFinderDimensions(): void {
    effect(() =>{
        this.pathFinder
          .value()
          ?.setDimensions(
            Math.ceil(this._rect()?.width ?? 0),
            Math.ceil(this._rect()?.height ?? 0),
          );
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

  setPath(id: string, path: string | undefined): void {
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
