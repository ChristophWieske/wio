import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import { injectFlowPathHost } from './flow-path-host/inject-flow-path-host';

@Directive({
  selector: '[wioObstacle]',
})
export class Obstacle {
  static counter = 0;
  private readonly id = `obstacle-${++Obstacle.counter}`;
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly flowPathHost = injectFlowPathHost();

  readonly weight = input(0);
  readonly brimWeight = input(0);
  readonly brimWidth = input(0);

  constructor() {
    this.registerObstacle();
  }

  private registerObstacle(): void {
    effect((onCleanup) => {
      onCleanup(() => this.flowPathHost.clearObstacle(this.id));

      this.flowPathHost.registerObstacle(
        this.id,
        this.host,
        this.weight(),
        this.brimWidth(),
        this.brimWeight(),
      );
    });
  }
}
