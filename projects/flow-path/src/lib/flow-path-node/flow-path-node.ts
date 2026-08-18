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
} from '@angular/core';
import { BoxObserver } from 'box-observer';
import { injectFlowPathHost } from '../flow-path-host/inject-flow-path-host';
import { rectEqual } from '../rect-equal';

@Component({
  selector: 'wio-flow-path-node',
  imports: [],
  template: '',
  styleUrl: './flow-path-node.css',
})
export class FlowPathNode implements AfterViewInit {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly flowPathHost = injectFlowPathHost();
  private readonly destroyRef = inject(DestroyRef);

  readonly nodeRect = signal<DOMRect | null>(null, { equal: rectEqual });
  readonly normalizedRect = computed(
    () => {
      return this.nodeRect();
    },
    {
      equal: rectEqual,
    },
  );

  readonly id = input.required<string>();

  constructor() {
    this.reportPosition();
  }

  ngAfterViewInit(): void {
    this.observeBox();
  }

  private observeBox(): void {
    const boxObserver = new BoxObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== this.host) {
            continue;
          }

          this.nodeRect.set(entry.box);
        }
      },
      { root: this.flowPathHost.canvas() },
    );
    boxObserver.observe(this.host);

    this.destroyRef.onDestroy(() => boxObserver.disconnect());
  }

  private reportPosition(): void {
    let latestId: string | undefined;
    effect((onCleanup) => {
      onCleanup(() => this.flowPathHost.setPosition(this.id(), undefined));

      if (this.id() !== latestId && latestId !== undefined) {
        this.flowPathHost.setPosition(latestId, undefined);
      }
      latestId = this.id();

      const rect = this.normalizedRect();
      if (!rect) {
        this.flowPathHost.setPosition(this.id(), undefined);
        return;
      }

      this.flowPathHost.setPosition(this.id(), {
        x: Math.round(rect.x + rect.width / 2),
        y: Math.round(rect.y + rect.height / 2),
      });
    });
  }
}
