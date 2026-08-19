import { Signal } from '@angular/core';
import { Position } from '../flow-path/path-finders/path-finder';

export interface PathRegistration {
  unregister(): void;
  recalculate(): void;
}

export interface FlowPathHostApi {
  registerPath(pathId: string, nodeIds: string[]): void;
  clearPath(pathId: string): void;
  registerNode(nodeId: string, nodeHost: Element): void;
  clearNode(nodeId: string): void;
  registerObstacle(
    obstacleId: string,
    obstacleHost: Element,
    weight: number,
    brimWidth: number,
    brimWeight: number,
  ): void;
  clearObstacle(obstacleId: string): void;
}
