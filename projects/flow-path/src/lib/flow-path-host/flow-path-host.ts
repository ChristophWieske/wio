import { Component, DestroyRef, ElementRef, inject, viewChild } from '@angular/core';
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
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');
  private readonly engine: FlowPathHostEngine;

  constructor() {
    const pathFinderFactory = inject(PathFinderFactory);
    this.engine = new FlowPathHostEngine({
      pathFinderFactory,
      canvas: () => this.canvas()?.nativeElement ?? null,
      fallbackSize: () => ({
        width: this.host.clientWidth,
        height: this.host.clientHeight,
      }),
    });

    this.maintainRect();
  }

  rect(): DOMRect | null {
    return this.engine.rect();
  }

  position(id: string): Position | undefined {
    return this.engine.position(id);
  }

  getPathFinder() {
    return this.engine.getPathFinder();
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

  setPath(id: string, path: Position[] | undefined): void {
    this.engine.setPath(id, path);
  }

  private maintainRect() {
    const update = () => this.engine.setRect(this.host.getBoundingClientRect());
    update();

    const observer = new ResizeObserver(update);
    observer.observe(this.host);

    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
}
