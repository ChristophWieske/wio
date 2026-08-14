import {
  Component,
  DestroyRef,
  OnDestroy,
  Signal,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { injectFlowPathHost } from '../flow-path-host/inject-flow-path-host';
import { Position } from './path-finders/path-finder';

@Component({
  selector: 'wio-flow-path',
  imports: [],
  template: '',
})
export class FlowPath implements OnDestroy {
  static counter = 0;
  private readonly id = `path-${++FlowPath.counter}`;
  private readonly flowPathHost = injectFlowPathHost();
  private readonly destroyRef = inject(DestroyRef);
  private queued = false;

  readonly positions = input.required<string[]>();
  readonly nodes = this.prepareNodes();
  readonly path = signal<Position[]>([]);

  constructor() {
    this.calculatePathOnChange();
  }

  ngOnDestroy() {
    this.flowPathHost.setPath(this.id, undefined);
  }

  private calculatePathOnChange(): void {
    effect(() => {
      this.nodes();
      this.queueCalculatePath();
    });

    const unsubscribe = this.flowPathHost.onGridChanged(() => this.queueCalculatePath());
    this.destroyRef.onDestroy(unsubscribe);
  }

  private queueCalculatePath(): void {
    if (this.queued) {
      return;
    }

    this.queued = true;
    queueMicrotask(() => {
      this.queued = false;
      this.calculatePath();
    });
  }

  private calculatePath(): void {
    const nodes = this.nodes();
    const combinedPath: Position[] = [];
    const pathfinder = this.flowPathHost.getPathFinder();
    const hostRect = this.flowPathHost.rect();
    const maxX = Math.max(0, Math.ceil(hostRect?.width ?? 0) - 1);
    const maxY = Math.max(0, Math.ceil(hostRect?.height ?? 0) - 1);

    for (let i = 1; i < nodes.length; i++) {
      const from = nodes[i - 1];
      const to = nodes[i];

      if (!from || !to || !pathfinder || !hostRect) {
        this.flowPathHost.setPath(this.id, undefined);
        this.path.set([]);
        return;
      }

      const fromX = clampToGrid(Math.round(from.x), maxX);
      const fromY = clampToGrid(Math.round(from.y), maxY);
      const toX = clampToGrid(Math.round(to.x), maxX);
      const toY = clampToGrid(Math.round(to.y), maxY);

      const path = pathfinder.findPath(fromX, fromY, toX, toY);
      if (path) {
        combinedPath.push(...path);
      }
    }

    this.path.set(combinedPath);
    this.flowPathHost.setPath(this.id, combinedPath);
  }

  private prepareNodes(): Signal<(Position | undefined)[]> {
    return computed(() => this.positions().map((id) => this.flowPathHost.position(id)), {
      equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    });
  }
}

function clampToGrid(value: number, max: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > max) {
    return max;
  }

  return value;
}
