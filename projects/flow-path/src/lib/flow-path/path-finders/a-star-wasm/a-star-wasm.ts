import { PathFinder, Position } from '../path-finder';
import initAStarWasm, { create_astar_instance } from './pkg/a_star_rust';
import wasmBytes from './pkg/a_star_rust_bg.wasm';

export interface PathObstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  weight: number;
}

let initializingAStarWasm: Promise<void> | null = null;

export async function initializeAStarWasm(): Promise<void> {
  if (!initializingAStarWasm) {
    initializingAStarWasm = initAStarWasm(wasmBytes).then(() => {
      initializingAStarWasm = null;
    });
  }

  await initializingAStarWasm;
}

export class AStarWasm implements PathFinder {
  private readonly wasmInstance = create_astar_instance();

  setGrid(width: number, height: number, obstacles: PathObstacle[]): void {
    // Create a Uint32Array to hold the obstacle data.
    // Each obstacle has 5 properties: x, y, width, height, weight.
    // So the total length of the array is obstacles.length * 5.
    // This is mainly for performance reasons, as passing a typed array to WebAssembly is more efficient than passing an array of objects.
    const obstacleArray = new Uint32Array(obstacles.length * 5);
    for (let i = 0, j = 0; i < obstacles.length; i++) {
      const o = obstacles[i];
      obstacleArray[j++] = o.x;
      obstacleArray[j++] = o.y;
      obstacleArray[j++] = o.width;
      obstacleArray[j++] = o.height;
      obstacleArray[j++] = o.weight;
    }
    this.wasmInstance.set_grid(width, height, obstacleArray);
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
