import { Obstacle } from './flow-path-host/flow-path-host';
import { Position } from './flow-path/path-finders/path-finder';

export function isWithin(position: Position, obstacle: Obstacle): boolean {
  return (
    position.x >= obstacle.x &&
    position.x <= obstacle.x + obstacle.width &&
    position.y >= obstacle.y &&
    position.y <= obstacle.y + obstacle.height
  );
}
