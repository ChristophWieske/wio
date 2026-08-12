import { PathFinder, Position } from '../path-finder';
import { create_astar_instance } from './pkg/a_star_rust';

export class AStarWasm implements PathFinder {
  private readonly wasmInstance = create_astar_instance();

  setWeight(x: number, y: number, weight: number): void {
    this.wasmInstance.set_weight(x, y, weight);
  }

  setDimensions(width: number, height: number): void {
    this.wasmInstance.set_dimensions(width, height);
  }

  findPath(x1: number, y1: number, x2: number, y2: number): Position[] | null {
    return (
      this.wasmInstance.find_path(x1, y1, x2, y2)?.map((position: Position) => ({
        x: position.x,
        y: position.y,
      })) || null
    );
  }
}
