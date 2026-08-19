import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Service } from '@angular/core';
import { PathFinderFactory } from '../flow-path/path-finders/path-finder';
import { FlowPathHostApi, PathDrawCallback } from './flow-path-host-api';
import { FlowPathHostEngine } from './flow-path-host-engine';

@Service()
export class GlobalFlowPathHost implements FlowPathHostApi {
  private readonly document = inject(DOCUMENT);
  private readonly engine: FlowPathHostEngine;

  readonly canvas = this.createCanvas();

  constructor() {
    const pathFinderFactory = inject(PathFinderFactory);
    this.engine = new FlowPathHostEngine({
      pathFinderFactory,
      canvas: this.canvas,
    });
    inject(DestroyRef).onDestroy(() => {
      this.engine.dispose();
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

  registerPath(pathId: string, nodeIds: string[], callback: PathDrawCallback): void {
    this.engine.registerPath(pathId, nodeIds, callback);
  }

  clearPath(pathId: string) {
    this.engine.clearPath(pathId);
  }

  private createCanvas(): HTMLCanvasElement {
    const canvas = this.document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.display = 'block';
    canvas.style.pointerEvents = 'none';
    canvas.style.userSelect = 'none';
    canvas.style.touchAction = 'none';
    canvas.style.background = 'transparent';
    canvas.style.zIndex = '1';
    this.document.body.appendChild(canvas);

    inject(DestroyRef).onDestroy(() => {
      canvas.remove();
    });

    return canvas;
  }

  queueDraw(): void {
    this.engine.queueForceRedraw();
  }
}
