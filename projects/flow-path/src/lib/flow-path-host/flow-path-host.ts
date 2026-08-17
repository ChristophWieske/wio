import { Component, computed, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
import PositionObserver from '@thednp/position-observer';
import { PathFinderFactory, Position } from '../flow-path/path-finders/path-finder';
import { FlowPathHostApi, Obstacle } from './flow-path-host-api';
import { FlowPathHostEngine } from './flow-path-host-engine';

@Component({
  selector: 'wio-flow-path-host',
  imports: [],
  templateUrl: './flow-path-host.html',
  styleUrl: './flow-path-host.css',
})
export class FlowPathHost implements FlowPathHostApi {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly engine: FlowPathHostEngine;
  private readonly _canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly destroyRef = inject(DestroyRef);

  readonly canvas = computed(() => this._canvas()?.nativeElement);

  constructor() {
    const pathFinderFactory = inject(PathFinderFactory);
    this.engine = new FlowPathHostEngine({
      pathFinderFactory,
      canvas: this.canvas,
      fallbackSize: () => ({
        width: this.host.clientWidth,
        height: this.host.clientHeight,
      }),
    });
  }

  ngAfterViewInit(): void {
    this.maintainRect();
  }

  rect(): DOMRect | null {
    return this.engine.rect();
  }

  position(id: string): Position | undefined {
    return this.engine.position(id);
  }

  findPath(id: string, waypoints: (Position | undefined)[]): Position[] {
    return this.engine.findPath(id, waypoints);
  }

  clearPath(id: string): void {
    this.engine.clearPath(id);
  }

  onGridChanged(listener: () => void): () => void {
    return this.engine.onGridChanged(listener);
  }

  setPosition(id: string, node: Position | undefined): void {
    this.engine.setPosition(id, node);
  }

  setObstacle(id: string, obstacles: Obstacle[] | undefined): void {
    this.engine.setObstacle(id, obstacles);
  }

  private maintainRect() {
    const update = () => this.engine.setRect(this.host.getBoundingClientRect());
    update();

    const observer = new ResizeObserver(update);
    observer.observe(this.host);

    // That could probably been reworked (removed?) when https://github.com/thednp/position-observer/issues/7 is resolved,
    // but for now we need to observe the position of the host element to update the rect when it moves.
    const positionObserver = new PositionObserver(update);
    positionObserver.observe(this.host);

    this.destroyRef.onDestroy(() => {
      observer.disconnect();
      positionObserver.disconnect();
    });
  }
}
