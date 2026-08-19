import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Renderer2,
  viewChild,
} from '@angular/core';
import { BehaviorSubject, filter, take } from 'rxjs';
import { PathFinderFactory } from '../flow-path/path-finders/path-finder';
import { FlowPathHostApi, PathDrawCallback } from './flow-path-host-api';
import { FlowPathHostEngine } from './flow-path-host-engine';

@Component({
  selector: 'wio-flow-path-host',
  imports: [],
  templateUrl: './flow-path-host.html',
  styleUrl: './flow-path-host.css',
})
export class FlowPathHost implements FlowPathHostApi {
  private readonly engine = new BehaviorSubject<FlowPathHostEngine | undefined>(undefined);
  private readonly pathFinderFactory = inject(PathFinderFactory);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    this.setupEngine();
    inject(DestroyRef).onDestroy(() => {
      this.engine.value?.dispose();
      this.engine.complete();
    });
  }

  private setupEngine(): void {
    const effectRef = effect(() => {
      const canvas = this.canvas();
      if (canvas?.nativeElement) {
        const engine = new FlowPathHostEngine({
          pathFinderFactory: this.pathFinderFactory,
          canvas: canvas.nativeElement,
        });
        this.engine.next(engine);
        effectRef.destroy();
      }
    });
  }

  private whenEngineReady(callback: (engine: FlowPathHostEngine) => void) {
    this.engine
      .pipe(
        filter((engine): engine is FlowPathHostEngine => engine !== undefined),
        take(1),
      )
      .subscribe(callback);
  }

  registerNode(nodeId: string, nodeHost: Element): void {
    this.whenEngineReady((engine) => engine.registerNode(nodeId, nodeHost));
  }

  clearNode(nodeId: string): void {
    this.whenEngineReady((engine) => engine.clearNode(nodeId));
  }
  registerObstacle(
    obstacleId: string,
    obstacleHost: Element,
    weight: number,
    brimWidth: number,
    brimWeight: number,
  ): void {
    this.whenEngineReady((engine) =>
      engine.registerObstacle(obstacleId, obstacleHost, weight, brimWidth, brimWeight),
    );
  }
  clearObstacle(obstacleId: string): void {
    this.whenEngineReady((engine) => engine.clearObstacle(obstacleId));
  }

  registerPath(pathId: string, nodeIds: string[], callback: PathDrawCallback): void {
    this.whenEngineReady((engine) => engine.registerPath(pathId, nodeIds, callback));
  }

  clearPath(pathId: string) {
    this.whenEngineReady((engine) => engine.clearPath(pathId));
  }

  queueDraw(): void {
    this.whenEngineReady((engine) => engine.queueForceRedraw());
  }
}
