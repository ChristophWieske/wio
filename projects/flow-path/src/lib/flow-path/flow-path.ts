import {
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { FlowPathHost } from '../../public-api';
import { Position } from './path-finders/path-finder';

@Component({
  selector: 'wio-flow-path',
  imports: [],
  templateUrl: './flow-path.html',
  styleUrl: './flow-path.css',
})
export class FlowPath {
  private readonly flowPathHost = inject(FlowPathHost);

  readonly positions = input.required<string[]>();
  readonly pathTemplate = viewChild<TemplateRef<unknown>>('pathTemplate');

  readonly path = signal('');

  constructor() {
    this.calculatePathOnChange();
  }

  private calculatePathOnChange(): void {
    const positions = computed(
      () => this.positions().map((x) => this.flowPathHost.positions()[x]),
      { equal: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
    );

    effect(() => this.calculatePath(positions()));

    this.flowPathHost.weightsChanged.subscribe(() =>
      this.calculatePath(positions()),
    );
  }

  private calculatePath(positions: Position[]): void {
    const combinedPath: { x: number; y: number }[] = [];

    const started = performance.now();
    for (let i = 1; i < positions.length; i++) {
      const from = positions[i - 1];
      const to = positions[i];

      if (!from || !to) {
        return;
      }

      const path = this.flowPathHost.pathFinder.findPath(
        Math.round(from.x),
        Math.round(from.y),
        Math.round(to.x),
        Math.round(to.y),
      );

      if (path) {
        combinedPath.push(...path);
      } else {
        console.log('Shit');
      }
    }

    const end = performance.now();
    console.log('Calculated path', end - started);
    const nextPath =
      'M ' +
      combinedPath.map((position) => `${position.x} ${position.y}`).join(' L ');
    this.path.set(nextPath);
  }
}
