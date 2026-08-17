import { Signal } from '@angular/core';
import { Position } from '../flow-path/path-finders/path-finder';

export interface Obstacle extends Position {
  width: number;
  height: number;
  weight: number;
}

export interface FlowPathHostApi {
  canvas: Signal<HTMLCanvasElement | undefined>;
  rect(): DOMRect | null;
  position(id: string): Position | undefined;
  findPath(id: string, waypoints: (Position | undefined)[]): Position[];
  clearPath(id: string): void;
  onGridChanged(listener: () => void): () => void;
  setPosition(id: string, node: Position | undefined): void;
  setObstacle(id: string, obstacles: Obstacle[] | undefined): void;
}
