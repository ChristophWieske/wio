import {
  AfterViewInit,
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import PositionObserver from '@thednp/position-observer';
import { Obstacle as ObstacleModel } from './flow-path-host/flow-path-host-api';
import { injectFlowPathHost } from './flow-path-host/inject-flow-path-host';
import { rectEqual } from './rect-equal';

@Directive({
  selector: '[wioObstacle]',
})
export class Obstacle implements AfterViewInit {
  static counter = 0;
  private readonly id = `obstacle-${++Obstacle.counter}`;
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly flowPathHost = injectFlowPathHost();
  private readonly destroyRef = inject(DestroyRef);

  readonly weight = input(0);
  readonly brimWeight = input(0);
  readonly brimWidth = input(0);
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

  constructor() {
    this.reportObstacle();
  }

  ngAfterViewInit(): void {
    this.observeRect();
  }

  private observeRect(): void {
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

  private reportObstacle(): void {
    let latestId: string | undefined;
    effect((onCleanup) => {
      onCleanup(() => this.flowPathHost.setObstacle(this.id, undefined));

      if (this.id !== latestId && latestId !== undefined) {
        this.flowPathHost.setObstacle(latestId, undefined);
      }
      latestId = this.id;

      const rect = this.normalizedRect();
      if (!rect) {
        this.flowPathHost.setObstacle(this.id, undefined);
        return;
      }

      const obstacles: ObstacleModel[] = [];
      const weight = this.weight();
      if (assesWeight(weight)) {
        obstacles.push({ ...rect, weight });
      }

      const brimWeight = this.brimWeight();
      const brimWidth = this.brimWidth();
      if (assesWeight(brimWeight) && brimWidth > 0) {
        obstacles.push({
          x: rect.x - brimWidth,
          y: rect.y - brimWidth,
          width: rect.width + 2 * brimWidth,
          height: rect.height + 2 * brimWidth,
          weight: brimWeight,
        });
      }

      this.flowPathHost.setObstacle(this.id, obstacles);
    });
  }
}

function assesWeight(weight: number) {
  if (weight < 0) {
    console.warn(`Invalid weight provided. Weight can´t be negative. Value was ${weight}.`);
    return false;
  }

  if (weight > 0 && weight < 1) {
    console.warn(`Invalid weight provided. Weight can´t be between 0 and 1. Value was ${weight}.`);
    return false;
  }

  return true;
}
