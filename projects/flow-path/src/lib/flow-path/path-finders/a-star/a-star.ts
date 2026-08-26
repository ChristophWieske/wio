import { SortedList } from './sorted-list';
import { PathObstacle } from '../a-star-wasm/a-star-wasm';
import { PathFinder } from '../path-finder';

interface GridNode {
  x: number;
  y: number;
  weight: number;

  // Attention:
  // All the following information are specific for a certain path finding operation.
  // They are filled during the operation and cleared afterward.

  /**
   * The estimated costs to come from this node to the target node.
   */
  h: number;
  /**
   * The actual costs that was needed to come here from the start node.
   */
  g: number;
  /**
   * The combined costs of g and h.
   */
  f: number;
  /**
   * The node from which we came here.
   */
  parent?: GridNode;
  /**
   * The run id this node was evaluated last.
   */
  runId: number;
}

const DIRECTION_VECTORS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];

export class AStar implements PathFinder {
  runId = 0;
  grid: GridNode[][] = [];

  setWeight(x: number, y: number, weight: number): void {
    const node = this.grid[x][y];
    if (!node) {
      return;
    }

    node.weight = weight;
  }

  setDimensions(width: number, height: number): void {
    this.grid = Array.from({ length: Math.ceil(width) }, (_, x) =>
      Array.from({ length: Math.ceil(height) }, (_, y) => ({
        weight: 1,
        x,
        y,
        g: 0,
        h: 0,
        f: 0,
        runId: 0,
      })),
    );
  }

  setGrid(width: number, height: number, obstacles: PathObstacle[]) {
    this.setDimensions(width, height);
    for (const obstacle of obstacles) {
      for (let x = obstacle.x; x < obstacle.x + obstacle.width; x++) {
        for (let y = obstacle.y; y < obstacle.y + obstacle.height; y++) {
          this.setWeight(x, y, obstacle.weight);
        }
      }
    }
  }

  findPath(x1: number, y1: number, x2: number, y2: number): { x: number; y: number }[] | null {
    this.runId++;

    const startNode = this.grid[x1]?.[y1];
    const endNode = this.grid[x2]?.[y2];

    if (!startNode || !endNode || startNode.weight === 0 || endNode.weight === 0) {
      return null;
    }

    startNode.g = 0;
    startNode.h = heuristic(startNode, endNode);
    startNode.f = startNode.h;
    startNode.runId = this.runId;
    const openList = new SortedList<GridNode>((a) => a.f);
    openList.push(startNode);

    while (openList.length > 0) {
      const current = openList.pop()!;

      if (current === endNode) {
        return reconstructPath(current, this.grid);
      }

      for (const [dx, dy] of DIRECTION_VECTORS) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (nx < 0 || this.grid.length <= nx) {
          continue;
        }
        const nextNode = this.grid[nx][ny];

        if (!nextNode) {
          continue;
        }

        if (nextNode.weight === 0) {
          continue;
        }

        const g = current.g! + nextNode.weight;
        const h = heuristic(nextNode, endNode);
        const f = g + h;

        if (nextNode.runId !== this.runId) {
          nextNode.parent = current;
          nextNode.g = g;
          nextNode.h = h;
          nextNode.f = f;
          nextNode.runId = this.runId;
          openList.push(nextNode);
          continue;
        }

        if (nextNode.f < f) {
          continue;
        }

        if (nextNode.f > f) {
          nextNode.parent = current;
          nextNode.g = g;
          nextNode.h = h;
          nextNode.f = f;
          openList.update(nextNode);
          continue;
        }

        openList.push({
          x: nx,
          y: ny,
          weight: nextNode.weight,
          parent: current,
          f,
          g,
          h,
          runId: this.runId,
        });
      }
    }

    return null;
  }
}

function heuristic(from: GridNode, to: GridNode): number {
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

function reconstructPath(node: GridNode, grid: GridNode[][]): { x: number; y: number }[] {
  const fullPath: { x: number; y: number }[] = [];
  let currentNode: GridNode | undefined = node;
  while (currentNode) {
    fullPath.push({ x: currentNode.x, y: currentNode.y });
    currentNode = currentNode.parent;
  }
  fullPath.reverse();

  return smoothPath(flattenPath(fullPath), grid);
}

function flattenPath(path: { x: number; y: number }[]): { x: number; y: number }[] {
  if (path.length <= 2) {
    return path;
  }

  const flattened = [path[0]];
  let previousDirection = getDirection(path[0], path[1]);
  for (let i = 1; i < path.length - 1; i++) {
    const direction = getDirection(path[i], path[i + 1]);
    if (direction.x !== previousDirection.x || direction.y !== previousDirection.y) {
      flattened.push(path[i]);
      previousDirection = direction;
    }
  }
  flattened.push(path[path.length - 1]);

  return flattened;
}

/**
 * Eliminates staircase turns (dir1 → dir2 → dir1) by moving the intermediate
 * turn-point until no more staircases can be removed without crossing blocked nodes
 * or increasing path cost.
 */
function smoothPath(
  turnPoints: { x: number; y: number }[],
  grid: GridNode[][],
): { x: number; y: number }[] {
  if (turnPoints.length < 4) return turnPoints;

  let current = turnPoints;
  let changed = true;
  while (changed) {
    let next: { x: number; y: number }[];
    [next, changed] = smoothPass(current, grid);
    // A smooth pass can produce collinear points at segment junctions; flatten before
    // the next pass so staircase detection always works on a clean turn-point path.
    current = flattenPath(next);
  }
  return current;
}

/**
 * One scan over `turnPoints` looking for staircase patterns (A→B→C→D where
 * direction(A→B) == direction(C→D)). For each staircase, tries to replace the
 * three-segment zigzag with a two-segment L-path via either corner of the bounding
 * rectangle of A and D.
 */
function smoothPass(
  turnPoints: { x: number; y: number }[],
  grid: GridNode[][],
): [{ x: number; y: number }[], boolean] {
  const result: { x: number; y: number }[] = [];
  let changed = false;
  let i = 0;

  while (i < turnPoints.length) {
    if (i + 3 < turnPoints.length) {
      const a = turnPoints[i];
      const b = turnPoints[i + 1];
      const c = turnPoints[i + 2];
      const d = turnPoints[i + 3];

      const dirAB = getDirection(a, b);
      const dirCD = getDirection(c, d);

      if (dirAB.x === dirCD.x && dirAB.y === dirCD.y) {
        // Staircase pattern found.
        const costAB = straightLineCost(a.x, a.y, b.x, b.y, grid) ?? Infinity;
        const costBC = straightLineCost(b.x, b.y, c.x, c.y, grid) ?? Infinity;
        const costCD = straightLineCost(c.x, c.y, d.x, d.y, grid) ?? Infinity;
        const budget = costAB + costBC + costCD;

        // The two candidate corners of the bounding rectangle of A and D.
        const corners = [
          { x: a.x, y: d.y },
          { x: d.x, y: a.y },
        ];

        let resolved = false;
        for (const via of corners) {
          const c1 = straightLineCost(a.x, a.y, via.x, via.y, grid);
          const c2 = straightLineCost(via.x, via.y, d.x, d.y, grid);
          if (c1 !== null && c2 !== null && c1 + c2 <= budget) {
            result.push(a);
            result.push(via);
            // Skip A, B, C — D will be pushed on the next iteration.
            i += 3;
            changed = true;
            resolved = true;
            break;
          }
        }
        if (resolved) continue;
      }
    }

    result.push(turnPoints[i]);
    i++;
  }

  return [result, changed];
}

/**
 * Returns the cost of traversing a straight horizontal or vertical line from `(x1,y1)` to
 * `(x2,y2)`, excluding the start node. Returns null if any node along the path is blocked.
 */
function straightLineCost(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  grid: GridNode[][],
): number | null {
  let cost = 0;
  if (x1 === x2) {
    const yMin = Math.min(y1, y2);
    const yMax = Math.max(y1, y2);
    for (let y = yMin; y <= yMax; y++) {
      if (y === y1) continue;
      const node = grid[x1]?.[y];
      if (!node || node.weight === 0) return null;
      cost += node.weight;
    }
  } else {
    const xMin = Math.min(x1, x2);
    const xMax = Math.max(x1, x2);
    for (let x = xMin; x <= xMax; x++) {
      if (x === x1) continue;
      const node = grid[x]?.[y1];
      if (!node || node.weight === 0) return null;
      cost += node.weight;
    }
  }
  return cost;
}

function getDirection(from: { x: number; y: number }, to: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.sign(to.x - from.x),
    y: Math.sign(to.y - from.y),
  };
}
