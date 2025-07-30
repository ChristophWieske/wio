import { SortedList } from '../sorted-list';
import { PathFinder } from './path-finder';

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
const COSTS_FOR_TURN = 10;

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

  findPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): { x: number; y: number }[] | null {
    this.runId++;

    const startNode = this.grid[x1][y1];
    const endNode = this.grid[x2][y2];

    startNode.g = 0;
    startNode.h = heuristic(startNode, endNode);
    startNode.f = startNode.h;
    startNode.runId = this.runId;
    const openList = new SortedList<GridNode>((a) => a.f);
    openList.push(startNode);

    while (openList.length > 0) {
      const current = openList.pop()!;

      if (current === endNode) {
        return reconstructPath(current);
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

        const g =
          current.g! +
          nextNode.weight +
          costForDirectionChange(nextNode, current);
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

function costForDirectionChange(
  node: GridNode,
  potentialParent: GridNode,
): number {
  const grandfather = potentialParent.parent;
  if (!grandfather) {
    return 0;
  }

  if (grandfather.x === node.x) {
    return 0;
  }

  if (grandfather.y === node.y) {
    return 0;
  }

  return COSTS_FOR_TURN;
}

function heuristic(from: GridNode, to: GridNode): number {
  // If the nodes are not on the same x or y coordinate it will take the path at least one turn to get to the target.
  // As turns are weighted in this opinionated astar algorithm we add that to the heuristics as well.
  const turnCosts = from.x !== to.x && from.y !== to.y ? COSTS_FOR_TURN : 0;
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y) + turnCosts;
}

function reconstructPath(node: GridNode): { x: number; y: number }[] {
  const nodes: { x: number; y: number }[] = [{ x: node.x, y: node.y }];

  let currentNode: GridNode | undefined = node;
  let latestTurn: GridNode = node;
  while (currentNode) {
    const parent: GridNode | undefined = currentNode?.parent;
    if (!parent) {
      nodes.push({ x: currentNode.x, y: currentNode.y });
    } else if (parent.x !== latestTurn.x && parent.y !== latestTurn.y) {
      nodes.push({ x: parent.x, y: parent.y });
      latestTurn = parent;
    }

    currentNode = parent;
  }

  return nodes;
}
