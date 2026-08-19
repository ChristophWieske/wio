import { OnDestroy } from '@angular/core';
import { BoxObserver } from 'box-observer';
import { PathFinder, PathFinderFactory, Position } from '../flow-path/path-finders/path-finder';

/** Padding around node positions added to the grid bounds (canvas space pixels). */
const GRID_PADDING = 1;
/**
 * Grid bounds are quantized to this step size.
 * Nodes moving within one step of the current boundary won't trigger a grid rebuild.
 */
const GRID_STEP = 100;

interface EngineOptions {
  pathFinderFactory: PathFinderFactory;
  canvas: HTMLCanvasElement;
}

interface ObstacleDef {
  host: Element;
  weight: number;
  brimWidth: number;
  brimWeight: number;

  box: DOMRect | undefined;
}

interface NodeDef {
  host: Element;
  box: DOMRect | undefined;
  center: Position | undefined;
}

interface PathDef {
  nodeIds: string[];
  segmentIds: string[];
  waypoints: Position[] | undefined;
}

interface GridBounds {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

enum Queue {
  RecalculateGridBounds = 1 << 0,
  UpdatePathFinderGrid = 1 << 1,
  RecalculatePaths = 1 << 2,
  RedrawCanvas = 1 << 3,
}

// todo: Add queues for path recalculation and canvas redraw to avoid multiple recalculations/redraws in the same microtask.

export class FlowPathHostEngine implements OnDestroy {
  /** When there are new or changed paths to be drawn to the canvas,
   * isDirty is set to true.
   * Note that draw() will not do anything unless isDirty is true, so this prevents unnecessary canvas redraws.
   */
  private isDirty = false;

  /**
   * A bitmask representing the queued operations that need to be performed.
   * Each bit corresponds to a specific operation, as defined in the Queue enum.
   * When an operation is queued, its corresponding bit is set to 1.
   * When the operation is performed, its corresponding bit is cleared (set to 0).
   * This allows for efficient tracking of multiple queued operations and ensures that they are executed in the correct order.
   */
  private queue = 0;

  private readonly registeredPaths = new Map<string, PathDef>();
  private readonly registeredNodes = new Map<string, NodeDef>();
  private readonly registeredObstacles = new Map<string, ObstacleDef>();

  /**
   * Stores path segments in this map is always a path between exactly two nodes.
   * The key is determined by {smaller_node_id}-{larger_node_id}
   * to ensure that the path is always stored in the same order regardless of which node is the start or end.
   */
  private readonly pathSegments = new Map<string, Position[]>();

  /**
   * A list of paths that need to be recalculated due to changes in node positions or obstacle configurations.
   */
  private dirtyPaths = new Set<PathDef>();

  /**
   * BoxObserver instance used to observe the bounding boxes of registered nodes and obstacles.
   * When a node or obstacle is added, it is observed by this BoxObserver.
   * When a node or obstacle is removed, it is unobserved by this BoxObserver.
   */
  private readonly boxObserver = this.prepareObserver();

  /**
   * Bounding box of the pathfinding grid in canvas space.
   * Encompasses all obstacle rects plus all node positions (with padding),
   * quantized to GRID_STEP to avoid rebuilding the grid on every small move.
   */
  private gridBounds: GridBounds | undefined;

  /**
   * The pathfinder instance used to calculate paths between nodes.
   */
  private pathFinder: PathFinder | undefined;

  constructor(private readonly options: EngineOptions) {
    void this.setupPathFinder();
  }

  ngOnDestroy(): void {
    this.boxObserver.disconnect();
  }

  private async setupPathFinder(): Promise<void> {
    this.pathFinder = await this.options.pathFinderFactory.createPathFinder();
    this.queueUpdatePathFinderGrid();
  }

  private queueCalculateGridBounds(): void {
    if (this.queue & Queue.RecalculateGridBounds) {
      return;
    }
    this.queue |= Queue.RecalculateGridBounds;

    queueMicrotask(() => this.calculateGridBounds());
  }

  private calculateGridBounds(): void {
    this.queue &= ~Queue.RecalculateGridBounds;

    const positions = [...this.registeredNodes.values()].map((node) => node.center);
    const obstacles = [...this.registeredObstacles.values()].map((obstacle) => obstacle.box);

    let minX = 0;
    let minY = 0;
    let maxX = 0;
    let maxY = 0;

    for (const position of positions) {
      if (!position) continue;
      minX = Math.min(minX, position.x - GRID_PADDING);
      minY = Math.min(minY, position.y - GRID_PADDING);
      maxX = Math.max(maxX, position.x + GRID_PADDING);
      maxY = Math.max(maxY, position.y + GRID_PADDING);
    }

    for (const obstacle of obstacles) {
      if (!obstacle) continue;
      minX = Math.min(minX, obstacle.x);
      minY = Math.min(minY, obstacle.y);
      maxX = Math.max(maxX, obstacle.x + obstacle.width);
      maxY = Math.max(maxY, obstacle.y + obstacle.height);
    }

    minX = Math.floor(minX / GRID_STEP) * GRID_STEP;
    minY = Math.floor(minY / GRID_STEP) * GRID_STEP;
    maxX = Math.ceil(maxX / GRID_STEP) * GRID_STEP;
    maxY = Math.ceil(maxY / GRID_STEP) * GRID_STEP;

    const currentBounds = { minX, minY, width: maxX - minX, height: maxY - minY };
    if (
      this.gridBounds &&
      currentBounds.minX === this.gridBounds.minX &&
      currentBounds.minY === this.gridBounds.minY &&
      currentBounds.width === this.gridBounds.width &&
      currentBounds.height === this.gridBounds.height
    ) {
      return;
    }

    this.gridBounds = currentBounds;
    this.queueUpdatePathFinderGrid();
  }

  registerPath(pathId: string, nodeIds: string[]): void {
    if (nodeIds.length < 2) {
      // Todo: Consider writing a warning.
      return;
    }

    const segmentIds = nodeIds
      .slice(1)
      .map((nodeId, index) => getPathSegmentKey(nodeIds[index], nodeId));
    const pathDef: PathDef = { nodeIds, segmentIds, waypoints: undefined };
    this.registeredPaths.set(pathId, pathDef);
    this.calculatePath(pathDef);

    if (pathDef.waypoints !== undefined) {
      this.isDirty = true;
      this.queueDraw();
    }
  }

  clearPath(pathId: string) {
    const path = this.registeredPaths.get(pathId);
    if (path?.waypoints !== undefined) {
      this.isDirty = true;
    }

    this.registeredPaths.delete(pathId);
    this.queueDraw();
  }

  registerNode(nodeId: string, host: Element): void {
    this.registeredNodes.set(nodeId, { host, box: undefined, center: undefined });
    this.boxObserver.observe(host);
    // Note: By adding the node host to the box observer, we will get an initial update that gives us its position and size.
    // After that all affected paths (so all paths that target this node) are recalculated and all paths redrawn as they would have for any other node update.
  }

  clearNode(nodeId: string) {
    const node = this.registeredNodes.get(nodeId);
    if (node) {
      this.registeredNodes.delete(nodeId);
      this.boxObserver.unobserve(node.host);
      this.queueCalculatePathsForNodes([nodeId]);
      this.queueDraw();
    }
  }

  registerObstacle(
    obstacleId: string,
    host: Element,
    weight: number,
    brimWidth: number,
    brimWeight: number,
  ): void {
    this.registeredObstacles.set(obstacleId, {
      host,
      weight,
      brimWidth,
      brimWeight,
      box: undefined,
    });
    this.boxObserver.observe(host);
    // Note: By adding the obstacle host to the box observer, we will get an initial update that gives us its position and size.
    // After that all paths are recalculated and redrawn as they would have for any other obstacle update.
  }

  clearObstacle(obstacleId: string) {
    const obstacle = this.registeredObstacles.get(obstacleId);
    if (obstacle) {
      this.registeredObstacles.delete(obstacleId);
      this.boxObserver.unobserve(obstacle.host);
      this.calculateAllPaths();
      this.queueDraw();
    }
  }

  /**
   * Removes all cached path segments and recalculates all paths.
   */
  private calculateAllPaths(): void {
    // Clear cache.
    this.pathSegments.clear();

    // Mark all paths dirty for recalculation.
    [...this.registeredPaths.values()].forEach((path) => this.dirtyPaths.add(path));

    this.queueCalculateDirtyPaths();
  }

  /**
   * Removes cached path segments for the given nodes and recalculates all paths that include any of those nodes.
   * @param nodeIds Changed node IDs for which to recalculate paths.
   */
  private queueCalculatePathsForNodes(nodeIds: string[]): void {
    // Remove related cached segments.
    [...this.pathSegments.keys()].forEach((segmentId) => {
      const isAffectedSegment = nodeIds.some(
        (nodeId) =>
          segmentId.startsWith(nodeId + PATH_SEGMENT_DELIMITER) ||
          segmentId.endsWith(PATH_SEGMENT_DELIMITER + nodeId),
      );

      if (isAffectedSegment) {
        this.pathSegments.delete(segmentId);
      }
    });

    // Mark affected paths dirty for recalculation.
    [...this.registeredPaths.values()]
      .filter((path) => path.nodeIds.some((nodeId) => nodeIds.includes(nodeId)))
      .forEach((path) => this.dirtyPaths.add(path));

    this.queueCalculateDirtyPaths();
  }

  private queueCalculateDirtyPaths(): void {
    if (this.queue & Queue.RecalculatePaths) {
      return;
    }
    this.queue |= Queue.RecalculatePaths;
    queueMicrotask(() => this.calculateDirtyPaths());
  }

  private calculateDirtyPaths(): void {
    this.queue &= ~Queue.RecalculatePaths;

    if (!this.assessOrder(Queue.RecalculatePaths)) {
      this.queueCalculateDirtyPaths();
      return;
    }

    if (this.dirtyPaths.size > 0) {
      this.isDirty = true;
      for (const path of this.dirtyPaths) {
        this.calculatePath(path);
      }
      this.dirtyPaths.clear();
      this.queueDraw();
    }
  }

  private calculatePath(path: PathDef): void {
    const combinedPath: Position[] = [];
    for (let i = 1; i < path.nodeIds.length; i++) {
      const nodeId1 = path.nodeIds[i - 1];
      const nodeId2 = path.nodeIds[i];
      const segmentId = getPathSegmentKey(nodeId1, nodeId2);

      let segment = this.pathSegments.get(segmentId);
      if (segment) {
        combinedPath.push(...segment);
        continue;
      }

      const node1 = this.registeredNodes.get(nodeId1);
      const node2 = this.registeredNodes.get(nodeId2);
      if (!node1?.center || !node2?.center) {
        // If either node is missing or has no box, we cannot calculate a path.
        path.waypoints = undefined;
        return;
      }

      const segmentPath = this.computePath(node1.center, node2.center);
      if (!segmentPath) {
        // If there is no path between the two nodes, we cannot calculate a complete path.
        path.waypoints = undefined;
        return;
      }

      this.pathSegments.set(segmentId, segmentPath);
      combinedPath.push(...segmentPath);
    }

    path.waypoints = combinedPath;
  }

  private computePath(from: Position, to: Position): Position[] | undefined {
    const pathfinder = this.pathFinder;
    const offsetX = this.gridBounds?.minX ?? 0;
    const offsetY = this.gridBounds?.minY ?? 0;

    if (!pathfinder) {
      return undefined;
    }

    return pathfinder
      .findPath(
        Math.round(from.x - offsetX),
        Math.round(from.y - offsetY),
        Math.round(to.x - offsetX),
        Math.round(to.y - offsetY),
      )
      ?.map((p) => ({ x: p.x + offsetX, y: p.y + offsetY }));
  }

  private queueUpdatePathFinderGrid(): void {
    if (this.queue & Queue.UpdatePathFinderGrid) {
      return;
    }
    this.queue |= Queue.UpdatePathFinderGrid;
    queueMicrotask(() => this.updatePathFinderGrid());
  }

  private updatePathFinderGrid(): void {
    this.queue &= ~Queue.UpdatePathFinderGrid;

    if (!this.assessOrder(Queue.UpdatePathFinderGrid)) {
      this.queueUpdatePathFinderGrid();
      return;
    }

    const gridBounds = this.gridBounds;
    const pathfinder = this.pathFinder;
    if (!pathfinder || !gridBounds) {
      return;
    }

    const offsetX = gridBounds.minX;
    const offsetY = gridBounds.minY;

    const obstacleList = [...this.registeredObstacles.values()].flatMap((entry) => {
      if (!entry.box) {
        return [];
      }

      if (entry.brimWidth === 0) {
        return [
          {
            ...entry.box,
            x: entry.box.x - offsetX,
            y: entry.box.y - offsetY,
            weight: entry.weight,
          },
        ];
      }

      return [
        {
          ...entry.box,
          x: entry.box.x - offsetX,
          y: entry.box.y - offsetY,
          weight: entry.weight,
        },
        {
          width: entry.box.width + 2 * entry.brimWidth,
          height: entry.box.height + 2 * entry.brimWidth,
          weight: entry.brimWeight,
          x: entry.box.x - entry.brimWidth - offsetX,
          y: entry.box.y - entry.brimWidth - offsetY,
        },
      ];
    });

    pathfinder.setGrid(gridBounds.width, gridBounds.height, obstacleList);
    this.calculateAllPaths();
  }

  private queueDraw(): void {
    if (this.queue & Queue.RedrawCanvas) {
      return;
    }
    this.queue |= Queue.RedrawCanvas;
    queueMicrotask(() => this.draw());
  }

  private draw(): void {
    this.queue &= ~Queue.RedrawCanvas;
    if (!this.assessOrder(Queue.RedrawCanvas)) {
      this.queueDraw();
      return;
    }

    if (!this.isDirty) {
      return;
    }
    this.isDirty = false;

    const canvas = this.options.canvas;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    if (!rect) {
      return;
    }

    const width = Math.max(1, Math.ceil(rect?.width));
    const height = Math.max(1, Math.ceil(rect?.height));
    const ratio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * ratio);
    canvas.height = Math.floor(height * ratio);

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.strokeStyle = '#4f46e5';
    context.lineWidth = 3;

    for (const path of this.registeredPaths.values()) {
      const waypoints = path.waypoints;
      if (!waypoints || waypoints.length < 2) {
        continue;
      }

      context.beginPath();
      context.moveTo(waypoints[0].x, waypoints[0].y);
      for (let i = 1; i < waypoints.length; i++) {
        context.lineTo(waypoints[i].x, waypoints[i].y);
      }
      context.stroke();
    }
  }

  private prepareObserver(): BoxObserver {
    return new BoxObserver(
      (entries) => {
        // #1: Update node and obstacle positions based on the observed entries.
        // Note: while updating keep track on what needs to be done next (recalculate some paths or all paths).
        let needsToRecalculateNodes = new Set<string>();
        let needsToRecalculateAll = false;

        for (const entry of entries) {
          const registeredEntry: [string, NodeDef] | [string, ObstacleDef] | undefined = [
            ...this.registeredNodes.entries(),
            ...this.registeredObstacles.entries(),
          ].find(([_, { host }]) => host === entry.target);

          if (!registeredEntry) {
            continue;
          }

          this.queueCalculateGridBounds();
          registeredEntry[1].box = entry.box ?? undefined;

          if (needsToRecalculateAll) {
            continue;
          }

          if ('weight' in registeredEntry[1]) {
            // It's an obstacle.
            needsToRecalculateAll = true;
          } else {
            // It's a node.
            registeredEntry[1].center = entry.box
              ? {
                  x: entry.box.x + entry.box.width / 2,
                  y: entry.box.y + entry.box.height / 2,
                }
              : undefined;
            needsToRecalculateNodes.add(registeredEntry[0]);
          }
        }

        // #2: Recalculate paths as needed.
        if (needsToRecalculateAll) {
          this.calculateAllPaths();
        } else {
          this.queueCalculatePathsForNodes([...needsToRecalculateNodes]);
        }

        // #3: Redraw the canvas if any paths have changed.
        // Note: This will only draw if something has changed, means `isDirty === true`.
        this.queueDraw();
      },
      { root: this.options.canvas },
    );
  }

  /**
   * Checks whether there are any queued operations that have a lower order than the given queue operation.
   * If there are, the current operation should be deferred until the lower order operations have completed.
   * @param queue Current operation queue to check against.
   * @returns True if there are no lower order operations queued, false otherwise.
   */
  private assessOrder(queue: Queue): boolean {
    return (this.queue & (queue - 1)) === 0;
  }
}

const PATH_SEGMENT_DELIMITER = '___';
function getPathSegmentKey(nodeId1: string, nodeId2: string): string {
  return `${nodeId1}${PATH_SEGMENT_DELIMITER}${nodeId2}`;
}
