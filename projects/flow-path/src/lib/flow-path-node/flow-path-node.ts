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
import PositionObserver from '@thednp/position-observer';
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

  readonly nodeRect = signal(this.host.getBoundingClientRect(), { equal: rectEqual });
  readonly normalizedRect = computed(
    () => {
      const obsRect = this.nodeRect();
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

  readonly id = input.required<string>();

  constructor() {
    this.reportPosition();
  }

  ngAfterViewInit(): void {
    this.observePosition();
  }

  private observePosition(): void {
    const resizeObserver = new ResizeObserver(() =>
      this.nodeRect.set(this.host.getBoundingClientRect()),
    );
    resizeObserver.observe(this.host);

    const positionObserver = new PositionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.target !== this.host) {
            continue;
          }

          this.nodeRect.set(entry.boundingClientRect);
        }
      },
      // Todo: Wait for https://github.com/thednp/position-observer/issues/7
      //{ root: this.flowPathHost.canvas() },
    );
    positionObserver.observe(this.host);

    this.destroyRef.onDestroy(() => {
      resizeObserver.disconnect();
      positionObserver.disconnect();
    });
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
