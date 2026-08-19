import { Position } from '../flow-path/path-finders/path-finder';

export interface PathDrawCallbackOptions {
  positions: Position[];
  context: CanvasRenderingContext2D;
}

export type PathDrawCallback = (options: PathDrawCallbackOptions) => boolean;

export interface FlowPathHostApi {
  registerPath(pathId: string, nodeIds: string[], callback: PathDrawCallback): void;
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
  queueDraw(): void;
}
