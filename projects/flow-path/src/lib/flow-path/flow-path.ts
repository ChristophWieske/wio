import {
  Component,
  DestroyRef,
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
export class FlowPath {
  static counter = 0;
  private readonly id = `path-${++FlowPath.counter}`;
  private readonly flowPathHost = injectFlowPathHost();
  private readonly destroyRef = inject(DestroyRef);

  readonly positions = input.required<string[]>();

  constructor() {
    this.registerPath();
  }

  private registerPath(): void {
    effect((onCleanup) => {
      onCleanup(() => this.flowPathHost.clearPath(this.id));

      const positions = this.positions();
      if (positions.length < 2) {
        this.flowPathHost.clearPath(this.id);
        return;
      }

      this.flowPathHost.registerPath(this.id, positions);
    });
  }
}
