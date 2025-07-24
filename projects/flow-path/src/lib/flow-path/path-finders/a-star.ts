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
  h?: number;
  /**
   * The actual costs that was needed to come here from the start node.
   */
  g?: number;
  /**
   * The combined costs of g and h.
   */
  f?: number;
  /**
   * The node from which we came here.
   */
  parent?: GridNode;
  /**
   * An indicator if this node has already been checked.
   */
  closed?: boolean;
  /**
   * An indicator if this node has already been evaluated and waits to be checked.
   */
  open?: boolean;
}

export class AStar implements PathFinder {
  grid: GridNode[][] = [];

  setWeight(x: number, y: number, weight: number): void {
    const node = this.grid[x][y];
    if (!node) {
      return;
    }

    node.weight = weight;
  }

  setDimensions(width: number, height: number): void {
    console.log('Setting dimensions');
    this.grid = Array.from({ length: Math.ceil(width) }, (_, x) =>
      Array.from({ length: Math.ceil(height) }, (_, y) => ({
        weight: 1,
        x,
        y,
      })),
    );
  }

  findPath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ): { x: number; y: number }[] | null {
    this.clearGrid();

    const startNode = this.grid[x1][y1];
    const endNode = this.grid[x2][y2];

    startNode.g = 0;
    startNode.h = heuristic(startNode, endNode);
    startNode.f = startNode.h;
    startNode.open = true;
    const openList = new SortedList<GridNode>((a, b) => a.f! - b.f!);
    openList.push(startNode);

    let maxOpenListSize = 0;
    while (openList.length > 0) {
      maxOpenListSize = Math.max(maxOpenListSize, openList.length);
      const current = openList.shift()!;
      current.closed = true;
      current.open = false;

      if (current === endNode) {
        console.log('maxOpenListSize', maxOpenListSize);
        return reconstructPath(current);
      }

      for (const [dx, dy] of [
        [0, -1],
        [1, 0],
        [0, 1],
        [-1, 0],
      ]) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        const nextNode = this.grid[nx]?.[ny];

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

        if (nextNode.f !== undefined && nextNode.f < f) {
          continue;
        }

        const skipPush = nextNode.open;

        nextNode.open = true;
        nextNode.parent = current;
        nextNode.g = g;
        nextNode.h = h;
        nextNode.f = f;

        if (skipPush) {
          openList.update(nextNode);
        } else {
          openList.push(nextNode);
        }
      }
    }

    return null;
  }

  private clearGrid(): void {
    this.grid
      .flatMap((x) => x)
      .forEach((node) => {
        delete node.g;
        delete node.h;
        delete node.f;
        delete node.parent;
        delete node.open;
        delete node.closed;
      });
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

  return 0.1;
}

function heuristic(from: GridNode, to: GridNode): number {
  // For now: Manhattan without anything extra weightend.
  return Math.abs(from.x - to.x) + Math.abs(from.y - to.y);
}

function reconstructPath(node: GridNode): { x: number; y: number }[] {
  const nodes: { x: number; y: number }[] = [];

  let currentNode: GridNode | undefined = node;
  while (currentNode) {
    nodes.push({ x: currentNode.x, y: currentNode.y });
    currentNode = currentNode.parent;
  }

  return nodes;
}
