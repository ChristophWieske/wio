import { Component, computed, ElementRef, inject, viewChild } from '@angular/core';
import { PathFinderFactory } from '../flow-path/path-finders/path-finder';
import { FlowPathHostApi } from './flow-path-host-api';
import { FlowPathHostEngine } from './flow-path-host-engine';

@Component({
  selector: 'wio-flow-path-host',
  imports: [],
  templateUrl: './flow-path-host.html',
  styleUrl: './flow-path-host.css',
})
export class FlowPathHost implements FlowPathHostApi {
  private readonly engine: FlowPathHostEngine;
  private readonly _canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  readonly canvas = computed(() => this._canvas()?.nativeElement);

  constructor() {
    const pathFinderFactory = inject(PathFinderFactory);
    this.engine = new FlowPathHostEngine({
      pathFinderFactory,
      canvas: this._canvas()?.nativeElement!,
    });
  }

  registerNode(nodeId: string, nodeHost: Element): void {
    this.engine.registerNode(nodeId, nodeHost);
  }
  clearNode(nodeId: string): void {
    this.engine.clearNode(nodeId);
  }
  registerObstacle(
    obstacleId: string,
    obstacleHost: Element,
    weight: number,
    brimWidth: number,
    brimWeight: number,
  ): void {
    this.engine.registerObstacle(obstacleId, obstacleHost, weight, brimWidth, brimWeight);
  }
  clearObstacle(obstacleId: string): void {
    this.engine.clearObstacle(obstacleId);
  }

  registerPath(pathId: string, nodeIds: string[]): void {
    this.engine.registerPath(pathId, nodeIds);
  }

  clearPath(pathId: string) {
    this.engine.clearPath(pathId);
  }
}
