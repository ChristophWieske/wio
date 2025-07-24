import {
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { FlowPathHost } from '../public-api';
import { Obstacle as ObstacleModel } from './flow-path-host/flow-path-host';
import { rectEqual } from './rect-equal';

@Directive({
  selector: '[wioObstacle]',
})
export class Obstacle {
  static counter = 0;
  private readonly id = `obstacle-${++Obstacle.counter}`;
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly flowPathHost = inject(FlowPathHost);

  readonly weight = input(0);
  readonly brimWeight = input(0);
  readonly brimWidth = input(0);

  constructor() {
    this.reportObstacle();
  }

  private reportObstacle(): void {
    const obstacleRect = signal<DOMRect | null>(null);
    const observer = new ResizeObserver(() =>
      obstacleRect.set(this.host.getBoundingClientRect()),
    );
    observer.observe(this.host);

    const normalizedRect = computed(
      () => {
        const obsRect = obstacleRect();
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
      { equal: rectEqual },
    );

    effect(() => {
      const rect = normalizedRect();
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

    inject(DestroyRef).onDestroy(() => {
      observer.disconnect();
      this.flowPathHost.setObstacle(this.id, undefined);
    });
  }
}

function assesWeight(weight: number) {
  if (weight < 0) {
    console.warn(
      `Invalid weight provided. Weight can´t be negative. Value was ${weight}.`,
    );
    return false;
  }

  if (weight > 0 && weight < 1) {
    console.warn(
      `Invalid weight provided. Weight can´t be between 0 and 1. Value was ${weight}.`,
    );
    return false;
  }

  return true;
}
