import { Component, effect, input } from '@angular/core';
import { PathDrawCallbackOptions } from '../flow-path-host/flow-path-host-api';
import { injectFlowPathHost } from '../flow-path-host/inject-flow-path-host';

@Component({
  selector: 'wio-flow-path',
  imports: [],
  template: '',
})
export class FlowPath {
  static counter = 0;
  private readonly id = `path-${++FlowPath.counter}`;
  private readonly flowPathHost = injectFlowPathHost();

  readonly positions = input.required<string[]>();
  readonly color = input('black');
  readonly width = input(2);
  readonly dash = input<number[] | null>(null);
  readonly cornerRadius = input(2);

  constructor() {
    this.registerPath();
    this.requestRedrawOnStyleChange();
  }

  private registerPath(): void {
    effect((onCleanup) => {
      onCleanup(() => this.flowPathHost.clearPath(this.id));

      const positions = this.positions();
      if (positions.length < 2) {
        this.flowPathHost.clearPath(this.id);
        return;
      }

      this.flowPathHost.registerPath(this.id, positions, (options: PathDrawCallbackOptions) =>
        this.drawPath(options),
      );
    });
  }

  private drawPath(options: PathDrawCallbackOptions): boolean {
    const { context, positions } = options;

    context.strokeStyle = this.color();
    context.lineWidth = this.width();
    if (this.dash()) {
      context.setLineDash(this.dash()!);
    }

    context.beginPath();
    context.moveTo(positions[0].x, positions[0].y);
    for (let i = 1; i < positions.length; i++) {
      context.lineTo(positions[i].x, positions[i].y);
    }
    context.stroke();
    return true;
  }

  private requestRedrawOnStyleChange() {
    effect(() => {
      this.color();
      this.width();
      this.dash();
      this.cornerRadius();
      this.flowPathHost.queueDraw();
    });
  }
}
