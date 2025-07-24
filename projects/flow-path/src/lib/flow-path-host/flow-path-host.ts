import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  contentChildren,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  output,
  signal,
} from '@angular/core';
import { FlowPath } from '../../public-api';
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
  imports: [NgTemplateOutlet],
  templateUrl: './flow-path-host.html',
  styleUrl: './flow-path-host.css',
})
export class FlowPathHost {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly _positions = signal<Record<string, Position>>({});
  private readonly _obstacles = signal<Record<string, Obstacle>>({});
  private readonly _rect = signal<DOMRect | null>(null, { equal: rectEqual });

  readonly pathFinder = inject(PathFinderFactory).createPathFinder();
  readonly positions = this._positions.asReadonly();
  readonly rect = this._rect.asReadonly();
  readonly obstacles = this._obstacles.asReadonly();
  readonly paths = contentChildren(FlowPath, { descendants: true });
  readonly weightsChanged = output();

  constructor() {
    this.maintainRect();
    this.maintainPathFinderDimensions();
    this.maintainPathFinderWeights();
  }

  private maintainRect() {
    const observer = new ResizeObserver((entries) => {
      this._rect.set(this.host.getBoundingClientRect());
    });
    observer.observe(this.host);

    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  private maintainPathFinderDimensions(): void {
    effect(() =>
      this.pathFinder.setDimensions(
        this._rect()?.width ?? 0,
        this._rect()?.height ?? 0,
      ),
    );
  }

  private maintainPathFinderWeights(): void {
    effect(() => {
      const rect = this._rect();
      if (!rect) {
        return;
      }

      const height = Math.ceil(rect.height);
      const width = Math.ceil(rect.width);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const obstacles = Object.values(this._obstacles()).filter((obs) =>
            isWithin({ x, y }, obs),
          );
          if (obstacles.length === 0) {
            this.pathFinder.setWeight(x, y, 1);
            continue;
          }

          if (obstacles.some((x) => x.weight === 0)) {
            this.pathFinder.setWeight(x, y, 0);
            continue;
          }

          const combinedWeight = obstacles.reduce(
            (acc, cur) => acc + cur.weight,
            0,
          );
          this.pathFinder.setWeight(x, y, combinedWeight);
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

  setObstacle(id: string, obstacle: Obstacle | undefined): void {
    this._obstacles.update((obstacles) => {
      const copy = { ...obstacles };

      if (obstacle) {
        copy[id] = obstacle;
      } else {
        delete copy[id];
      }

      return copy;
    });
  }
}
