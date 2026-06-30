import {
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  signal,
  Signal,
} from '@angular/core';
import { FlowPathHost } from '../../public-api';
import { Position } from './path-finders/path-finder';

@Component({
  selector: 'svg:path [wio-flow-path]',
  imports: [],
  templateUrl: './flow-path.html',
  styleUrl: './flow-path.css',
  host: {
    '[attr.d]': 'path()',
  },
})
export class FlowPath implements OnDestroy {
  static counter = 0;
  private readonly id = `path-${++FlowPath.counter}`;
  private readonly flowPathHost = inject(FlowPathHost);
  private queued = false;

  readonly positions = input.required<string[]>();
  readonly nodes = this.prepareNodes();
  readonly path = signal('');

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

    this.flowPathHost.weightsChanged.subscribe(() => this.queueCalculatePath());
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
    const combinedPath: { x: number; y: number }[] = [];

    const started = performance.now();
    for (let i = 1; i < nodes.length; i++) {
      const from = nodes[i - 1];
      const to = nodes[i];

      if (!from || !to) {
        this.flowPathHost.setPath(this.id, undefined);
        return;
      }

      const findStart = performance.now();
      const path = this.flowPathHost.pathFinder.value()?.findPath(from.x, from.y, to.x, to.y);
      const findEnd = performance.now();
      console.log('Needed ', findEnd - findStart, "for ", path);

      if (path) {
        combinedPath.push(...path);
      }
    }

    const end = performance.now();
    const nextPath =
      'M ' +
      combinedPath.map((position) => `${position.x} ${position.y}`).join(' L ');
    //this.flowPathHost.setPath(this.id, nextPath);
    this.path.set(nextPath);
  }

  private prepareNodes(): Signal<Position[]> {
    return computed(
      () => {
        const a = this.positions().map((x) => this.flowPathHost.positions()[x]);
        return a;
      },
      { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
    );
  }
}
