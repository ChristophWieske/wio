import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { FlowPathHost } from '../flow-path-host/flow-path-host';
import { rectEqual } from '../rect-equal';

@Component({
  selector: 'wio-flow-path-node',
  imports: [],
  template: '',
  styleUrl: './flow-path-node.css',
})
export class FlowPathNode {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly flowPathHost = inject(FlowPathHost);
  readonly id = input.required<string>();

  constructor() {
    this.reportPosition();
  }

  private reportPosition(): void {
    const nodeRect = signal<DOMRect | null>(null);
    const observer = new ResizeObserver(() =>
      nodeRect.set(this.host.getBoundingClientRect()),
    );
    observer.observe(this.host);

    const normalizedRect = computed(
      () => {
        const obsRect = nodeRect();
        const hostRect = this.flowPathHost.rect();

        if (!obsRect || !hostRect) {
          return null;
        }

        return {
          ...obsRect,
          x: obsRect.x - hostRect.x,
          y: obsRect.y - hostRect.y,
          width: obsRect.width,
          height: obsRect.height,
        };
      },
      {
        equal: rectEqual,
      },
    );

    let latestId: string | undefined;
    effect(() => {
      if (this.id() !== latestId && latestId !== undefined) {
        this.flowPathHost.setPosition(latestId, undefined);
      }
      latestId = this.id();

      const rect = normalizedRect();
      if (!rect) {
        this.flowPathHost.setPosition(this.id(), undefined);
        return;
      }

      this.flowPathHost.setPosition(this.id(), {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      });
    });

    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      this.flowPathHost.setPosition(this.id(), undefined);
    });
  }
}
