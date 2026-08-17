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
    this.flowPathHost.clearPath(this.id);
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
    this.path.set(this.flowPathHost.findPath(this.id, this.nodes()));
  }

  private prepareNodes(): Signal<(Position | undefined)[]> {
    return computed(() => this.positions().map((id) => this.flowPathHost.position(id)), {
      equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    });
  }
}
