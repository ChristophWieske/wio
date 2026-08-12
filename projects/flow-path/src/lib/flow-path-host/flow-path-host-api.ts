import { Position, PathFinder } from '../flow-path/path-finders/path-finder';

export interface Obstacle extends Position {
  width: number;
  height: number;
  weight: number;
}

export interface FlowPathHostApi {
  rect(): DOMRect | null;
  position(id: string): Position | undefined;
  getPathFinder(): PathFinder | undefined;
  onWeightsChanged(listener: () => void): () => void;
  setPosition(id: string, node: Position | undefined): void;
  setObstacle(id: string, obstacles: Obstacle[] | undefined): void;
  setPath(id: string, path: Position[] | undefined): void;
}
