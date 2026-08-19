import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  Injector,
} from '@angular/core';
import { injectFlowPathHost } from '../flow-path-host/inject-flow-path-host';
import { rectEqual } from '../rect-equal';

@Component({
  selector: 'wio-flow-path-node',
  imports: [],
  template: '',
  styleUrl: './flow-path-node.css',
})
export class FlowPathNode {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly flowPathHost = injectFlowPathHost();

  readonly id = input.required<string>();

  constructor() {
    this.registerNode();
  }

  private registerNode(): void {
    let latestId: string | undefined;
    effect((onCleanup) => {
      onCleanup(() => this.flowPathHost.clearNode(this.id()));

      if (latestId !== undefined) {
        this.flowPathHost.clearNode(this.id());
      }

      this.flowPathHost.registerNode(this.id(), this.host);
    });
  }
}
