import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, Service } from '@angular/core';
import { PathFinderFactory, Position } from '../flow-path/path-finders/path-finder';
import { FlowPathHostApi, Obstacle } from './flow-path-host-api';
import { FlowPathHostEngine } from './flow-path-host-engine';

@Service()
export class GlobalFlowPathHost implements FlowPathHostApi {
  private readonly document = inject(DOCUMENT);
  private readonly canvas = this.createCanvas();
  private readonly engine: FlowPathHostEngine;

  constructor() {
    const pathFinderFactory = inject(PathFinderFactory);
    this.engine = new FlowPathHostEngine({
      pathFinderFactory,
      canvas: () => this.canvas,
      fallbackSize: () => ({
        width: window.innerWidth,
        height: window.innerHeight,
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

  private maintainRect() {
    const update = () =>
      this.engine.setRect(new DOMRect(0, 0, window.innerWidth, window.innerHeight));

    update();
    window.addEventListener('resize', update);
    inject(DestroyRef).onDestroy(() => {
      window.removeEventListener('resize', update);
    });
  }
}
