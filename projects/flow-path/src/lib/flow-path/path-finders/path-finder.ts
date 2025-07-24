import {Injectable} from '@angular/core';
import {AStar} from './a-star';

@Injectable({providedIn: 'root'})
export class PathFinderFactory {
  createPathFinder(): PathFinder {
    return new AStar();
  }
}

export interface Position {
  x: number; y: number;
}

export interface PathFinder {

  /**
   * Defines the weight of a node, which will influence the path finding.
   * @param x The x coordinate of the addressed node. Must be an integer.
   * @param y The y coordinate of the addressed node. Must be an integer.
   * @param weight The weight of a node which determines its cost when part of the currently checked path.
   * When "0", the node is blocked and can´t be used to find a path.
   * Weights between "0" and "1" are not allowed and are rejected.
   * Negative weights are not allowed and are rejected.
   * "1" is the default weight.
   * Above "1" all weights are valid
   */
  setWeight(x: number, y:number, weight: number): void;

  /**
   * Sets the dimensions of the plane that shall contain the path.
   * The path searching will check all paths up to the edge of the plane, but not beyond.
   * @param width The width of the plane. If a decimal is provided it is rounded up, making the plane a little bigger.
   * @param height The height of the plane. If a decimal is provided it is rounded up, making the plane a little bigger.
   */
  setDimensions(width:number, height:number): void;

  /**
   * Tries to find a path within the search plane.
   * When a path is found it will be an optimal path - no path will be less expensive.
   * The result path will contain the start and the end node.
   * @param x1 The x coordinate of the start node. Must be an integer.
   * @param y1 The y coordinate of the start node. Must be an integer.
   * @param x2 The x coordinate of the end node. Must be an integer.
   * @param y2 The y coordinate of the end node. Must be an integer.
   */
  findPath(x1: number, y1: number, x2: number, y2: number): Position[] | null;
}
