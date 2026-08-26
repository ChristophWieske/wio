use console_error_panic_hook;
use std::cmp::Reverse;
use std::collections::BinaryHeap;
use wasm_bindgen::prelude::*;

#[derive(Debug, Eq, PartialEq, Ord, PartialOrd, Clone, Copy)]
struct GridNode {
    x: u16,
    y: u16,
    weight: u32,
}

#[derive(Debug, Eq, PartialEq, Clone, Copy)]
struct Candidate {
    node_index: usize,
    parent_index: Option<usize>,
    index: usize,
}

#[derive(Debug, Clone, Copy)]
#[wasm_bindgen]
pub struct Node {
    pub x: u16,
    pub y: u16,
}

const DIRECTION_VECTORS: [(i8, i8); 4] = [(0, -1), (1, 0), (0, 1), (-1, 0)];

#[wasm_bindgen]
#[derive(Debug)]
pub struct AStar {
    width: u16,
    height: u16,
    nodes: Vec<GridNode>,
}

#[wasm_bindgen(start)]
pub fn main() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
impl AStar {
    pub fn set_grid(&mut self, width: u16, height: u16, obstacles: &[u32]) {
        self.width = width;
        self.height = height;
        let length = width as usize * height as usize;
        let mut nodes = Vec::with_capacity(length);
        for y in 0..height {
            for x in 0..width {
                nodes.push(GridNode {
                    x: x,
                    y: y,
                    weight: 1,
                });
            }
        }

        let obstacles_length = obstacles.len();
        if obstacles_length > 0 {
            for i in 0..(obstacles.len() / 5) {
                let start_index = i * 5;
                let x = obstacles[start_index] as u16;
                let obstacle_width = obstacles[start_index + 2] as u16;
                if x + obstacle_width > width {
                    continue;
                }

                let y = obstacles[start_index + 1] as u16;
                let obstacle_height = obstacles[start_index + 3] as u16;
                if y + obstacle_height > height {
                    continue;
                }

                let weight = obstacles[start_index + 4];

                for dy in 0..obstacle_height {
                    for dx in 0..obstacle_width {
                        let node_index = get_node_index(x + dx, y + dy, width);
                        nodes[node_index].weight = weight;
                    }
                }
            }
        }

        self.nodes = nodes;
    }

    pub fn find_path(&mut self, x1: u16, y1: u16, x2: u16, y2: u16) -> Option<Vec<Node>> {
        if self.width == 0
            || self.height == 0
            || x1 >= self.width
            || y1 >= self.height
            || x2 >= self.width
            || y2 >= self.height
        {
            return None;
        }

        let start_node_index = get_node_index(x1, y1, self.width);
        let end_node_index = get_node_index(x2, y2, self.width);
        let effective_start_node_index = match self.resolve_valid_node_index(start_node_index) {
            Some(index) => index,
            None => return None,
        };
        let effective_end_node_index = match self.resolve_valid_node_index(end_node_index) {
            Some(index) => index,
            None => return None,
        };

        let core_path = match self.find_path_between(effective_start_node_index, effective_end_node_index)
        {
            Some(path) => path,
            None => return None,
        };

        let mut path = Vec::with_capacity(core_path.len() + 2);
        if start_node_index != effective_start_node_index {
            let start_node = self.nodes[start_node_index];
            path.push(Node {
                x: start_node.x,
                y: start_node.y,
            });
        }

        for node in core_path {
            path.push(node);
        }

        if end_node_index != effective_end_node_index {
            let end_node = self.nodes[end_node_index];
            path.push(Node {
                x: end_node.x,
                y: end_node.y,
            });
        }

        return Some(path);
    }

    fn find_path_between(&self, start_node_index: usize, end_node_index: usize) -> Option<Vec<Node>> {
        let start_node = &self.nodes[start_node_index];
        let end_node = &self.nodes[end_node_index];
        let mut g_score = vec![u32::MAX; self.width as usize * self.height as usize];
        g_score[start_node_index] = 0;
        let mut candidates = vec![];

        let h = heuristic(&start_node, &end_node);
        let mut open_list = BinaryHeap::with_capacity((h as usize) * 2);
        let candidate = Candidate {
            node_index: start_node_index,
            parent_index: None,
            index: 0,
        };
        candidates.push(candidate);
        open_list.push(Reverse((h, 0, 0)));

        while !open_list.is_empty() {
            let (_, _, current_candidate_index) = unsafe { open_list.pop().unwrap_unchecked().0 };

            let current = candidates[current_candidate_index];

            if current.node_index == end_node_index {
                    return Some(reconstruct_path(&current, &candidates, &self.nodes, self.width));
            }

            let current_node = &self.nodes[current.node_index];

            for direction in DIRECTION_VECTORS {
                let nx = current_node.x as i32 + direction.0 as i32;
                let ny = current_node.y as i32 + direction.1 as i32;

                if nx < 0 || ny < 0 {
                    continue;
                }

                let nx = nx as u16;
                let ny = ny as u16;

                if nx >= self.width || ny >= self.height {
                    continue;
                }

                let next_node_index = get_node_index(nx, ny, self.width);
                let next_node = &self.nodes[next_node_index];

                if next_node.weight == 0 {
                    continue;
                }

                let g = g_score[current.node_index] + next_node.weight;
                if g >= g_score[next_node_index] {
                    continue;
                }
                g_score[next_node_index] = g;

                let h = heuristic(&next_node, &end_node);
                let next_candidate_index = candidates.len();
                let next_candidate = Candidate {
                    node_index: next_node_index,
                    parent_index: Some(current.index),
                    index: next_candidate_index,
                };
                open_list.push(Reverse((g + h, -(g as i32), next_candidate_index)));
                candidates.push(next_candidate);
            }
        }
        return None;
    }

    fn resolve_valid_node_index(&self, node_index: usize) -> Option<usize> {
        if self.nodes[node_index].weight > 0 {
            return Some(node_index);
        }

        self.find_nearest_valid_straight_node_index(node_index)
    }

    fn find_nearest_valid_straight_node_index(&self, node_index: usize) -> Option<usize> {
        let node = self.nodes[node_index];
        let max_distance = self.width.max(self.height) as i32;

        for distance in 1..=max_distance {
            let mut any_direction_in_bounds = false;

            for direction in DIRECTION_VECTORS {
                let x = node.x as i32 + direction.0 as i32 * distance;
                let y = node.y as i32 + direction.1 as i32 * distance;

                if x < 0 || y < 0 || x >= self.width as i32 || y >= self.height as i32 {
                    continue;
                }
                any_direction_in_bounds = true;

                let candidate_index = get_node_index(x as u16, y as u16, self.width);
                if self.nodes[candidate_index].weight > 0 {
                    return Some(candidate_index);
                }
            }

            if !any_direction_in_bounds {
                return None;
            }
        }

        None
    }
}

fn get_node_index(x: u16, y: u16, width: u16) -> usize {
    y as usize * width as usize + x as usize
}

fn reconstruct_path(
    candidate: &Candidate,
    candidates: &Vec<Candidate>,
    nodes: &Vec<GridNode>,
    width: u16,
) -> Vec<Node> {
    let mut full_path = Vec::with_capacity(32);

    let mut current_candidate = candidate;
    loop {
        let current_node = nodes[current_candidate.node_index];
        full_path.push(Node {
            x: current_node.x,
            y: current_node.y,
        });
        match current_candidate.parent_index {
            Some(parent_index) => current_candidate = &candidates[parent_index],
            None => break,
        }
    }
    full_path.reverse();

    let turn_points = flatten_path(&full_path);
    smooth_path(&turn_points, nodes, width)
}

fn heuristic(from: &GridNode, to: &GridNode) -> u32 {
    if from == to {
        return 0;
    }

    (from.x as u32).abs_diff(to.x as u32) + (from.y as u32).abs_diff(to.y as u32)
}

fn flatten_path(path: &[Node]) -> Vec<Node> {
    if path.len() <= 2 {
        return path.to_vec();
    }

    let mut flattened = Vec::with_capacity(path.len());
    flattened.push(Node {
        x: path[0].x,
        y: path[0].y,
    });

    let mut previous_direction = get_node_direction(&path[0], &path[1]);

    for i in 1..(path.len() - 1) {
        let direction = get_node_direction(&path[i], &path[i + 1]);
        if direction != previous_direction {
            flattened.push(Node {
                x: path[i].x,
                y: path[i].y,
            });
            previous_direction = direction;
        }
    }

    let last = &path[path.len() - 1];
    flattened.push(Node {
        x: last.x,
        y: last.y,
    });
    flattened
}

/// Eliminates staircase turns (dir1 → dir2 → dir1) by moving the intermediate
/// turn-point until no more staircases can be removed without crossing blocked nodes
/// or increasing path cost.
fn smooth_path(turn_points: &[Node], nodes: &[GridNode], width: u16) -> Vec<Node> {
    if turn_points.len() < 4 {
        return turn_points.to_vec();
    }

    let mut current = turn_points.to_vec();
    loop {
        let (next, changed) = smooth_pass(&current, nodes, width);
        // A smooth pass can produce collinear points at segment junctions; flatten before
        // the next pass so staircase detection always works on a clean turn-point path.
        current = flatten_path(&next);
        if !changed {
            break;
        }
    }
    current
}

/// One scan over `turn_points` looking for staircase patterns (A→B→C→D where
/// direction(A→B) == direction(C→D)). For each staircase, tries to replace the
/// three-segment zigzag with a two-segment L-path via either corner of the bounding
/// rectangle. Returns the updated path and whether any change was made.
fn smooth_pass(turn_points: &[Node], nodes: &[GridNode], width: u16) -> (Vec<Node>, bool) {
    let mut result = Vec::with_capacity(turn_points.len());
    let mut changed = false;
    let mut i = 0;

    while i < turn_points.len() {
        if i + 3 < turn_points.len() {
            // Need 4 consecutive points to detect a staircase.
            let a = turn_points[i];
            let b = turn_points[i + 1];
            let c = turn_points[i + 2];
            let d = turn_points[i + 3];

            let start_direction = get_node_direction(&a, &b);
            if start_direction == get_node_direction(&c, &d) {
                // Staircase pattern found.
                let budget = straight_line_info(a.x, a.y, b.x, b.y, nodes, width)
                    .unwrap_or(u32::MAX)
                    .saturating_add(
                        straight_line_info(b.x, b.y, c.x, c.y, nodes, width).unwrap_or(u32::MAX),
                    )
                    .saturating_add(
                        straight_line_info(c.x, c.y, d.x, d.y, nodes, width).unwrap_or(u32::MAX),
                    );

                // The one candidate corner of the bounding rectangle of A and D.
                let via_corner = if start_direction.0 != 0 {
                    Node { x: d.x, y: a.y }
                } else {
                    Node { x: a.x, y: d.y }
                };

                if let Some(c1) =
                    straight_line_info(a.x, a.y, via_corner.x, via_corner.y, nodes, width)
                {
                    if let Some(c2) =
                        straight_line_info(via_corner.x, via_corner.y, d.x, d.y, nodes, width)
                    {
                        if c1.saturating_add(c2) <= budget {
                            result.push(a);
                            result.push(via_corner);
                            // Skip A, B, C — D will be pushed on the next iteration.
                            i += 3;
                            changed = true;
                            continue;
                        }
                    }
                }
            }
        }

        result.push(turn_points[i]);
        i += 1;
    }

    (result, changed)
}

/// Returns the cost of walking a straight horizontal or vertical line from `(x1,y1)` to
/// `(x2,y2)`, excluding the start node. Returns `None` if any node along the path is blocked.
fn straight_line_info(x1: u16, y1: u16, x2: u16, y2: u16, nodes: &[GridNode], width: u16) -> Option<u32> {
    let mut cost = 0u32;
    if x1 == x2 {
        for y in y1.min(y2)..=y1.max(y2) {
            if y == y1 {
                continue;
            }
            let w = nodes[get_node_index(x1, y, width)].weight;
            if w == 0 {
                return None;
            }
            cost += w;
        }
    } else {
        for x in x1.min(x2)..=x1.max(x2) {
            if x == x1 {
                continue;
            }
            let w = nodes[get_node_index(x, y1, width)].weight;
            if w == 0 {
                return None;
            }
            cost += w;
        }
    }
    Some(cost)
}

fn get_node_direction(from: &Node, to: &Node) -> (i8, i8) {
    (
        (to.x as i32 - from.x as i32).signum() as i8,
        (to.y as i32 - from.y as i32).signum() as i8,
    )
}

#[wasm_bindgen]
pub fn create_astar_instance() -> AStar {
    AStar {
        nodes: vec![],
        width: 0,
        height: 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn heurisitc_test_1() {
        let start_node = GridNode {
            weight: 1,
            x: 0,
            y: 0,
        };
        let target_node = GridNode {
            weight: 1,
            x: 1,
            y: 1,
        };
        let result = heuristic(&start_node, &target_node);
        assert_eq!(result, 2);
    }

    #[test]
    fn heurisitc_test_2() {
        let start_node = GridNode {
            weight: 1,
            x: 0,
            y: 0,
        };
        let target_node = GridNode {
            weight: 1,
            x: 1,
            y: 3,
        };
        let result = heuristic(&start_node, &target_node);
        assert_eq!(result, 4);
    }

    #[test]
    fn heurisitc_test_3() {
        let start_node = GridNode {
            weight: 1,
            x: 0,
            y: 0,
        };
        let target_node = GridNode {
            weight: 1,
            x: 1,
            y: 0,
        };
        let result = heuristic(&start_node, &target_node);
        assert_eq!(result, 1);
    }

    #[test]
    fn heurisitc_test_4() {
        let start_node = GridNode {
            weight: 1,
            x: 0,
            y: 0,
        };
        let target_node = GridNode {
            weight: 1,
            x: 0,
            y: 0,
        };
        let result = heuristic(&start_node, &target_node);
        assert_eq!(result, 0);
    }

    #[test]
    fn heurisitc_test_5() {
        let from_node = GridNode {
            weight: 1,
            x: 0,
            y: 1,
        };
        let target_node = GridNode {
            weight: 1,
            x: 1,
            y: 1,
        };
        let result = heuristic(&from_node, &target_node);
        assert_eq!(result, 1);
    }

    #[test]
    fn heurisitc_test_6() {
        let start_node = GridNode {
            weight: 1,
            x: 1,
            y: 0,
        };
        let target_node = GridNode {
            weight: 1,
            x: 1,
            y: 1,
        };
        let result = heuristic(&start_node, &target_node);
        assert_eq!(result, 1);
    }

    #[test]
    fn heurisitc_test_7() {
        let from_node = GridNode {
            weight: 1,
            x: 0,
            y: 2,
        };
        let target_node = GridNode {
            weight: 1,
            x: 1,
            y: 1,
        };
        let result = heuristic(&from_node, &target_node);
        assert_eq!(result, 2);
    }

    #[test]
    fn get_node_index_test_1() {
        let test_set = [(0, 0, 1024, 0), (1, 0, 1024, 1), (0, 1, 1024, 1024)];

        for (x, y, width, expected) in test_set {
            let index = get_node_index(x, y, width);
            assert_eq!(
                index, expected,
                "Incorrect index for x:{} y:{} width:{}. Got {} but {} was expected",
                x, y, width, index, expected
            );
        }
    }

    #[test]
    fn node_indecies_match() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };
        let width = 4;
        let height = 4;
        let expected_length = 16;
        astar.set_grid(width, height, &[]);
        assert_eq!(astar.nodes.len(), expected_length, "Lenght doesn`t add up.");
        for x in 0..(width - 1) {
            for y in 0..(height - 1) {
                let index = get_node_index(x, y, width);
                assert_eq!(
                    (astar.nodes[index].x, astar.nodes[index].y),
                    (x, y),
                    "Wrong for x:{} y:{}, Actual was x:{}, y:{} (index: {}). All nodes: {:?}",
                    x,
                    y,
                    astar.nodes[index].x,
                    astar.nodes[index].y,
                    index,
                    astar.nodes
                );
            }
        }
    }

    #[test]
    fn obstacles_correctly_set_1() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };
        let width = 4;
        astar.set_grid(4, 4, &[1, 2, 1, 1, 3]);
        let obstacle_index = get_node_index(1, 2, width);

        assert_eq!(
            astar.nodes[obstacle_index].weight, 3,
            "Weight not correctly set. {:?}",
            astar.nodes
        );
    }

    #[test]
    fn obstacles_correctly_set_2() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };
        let width = 4;
        astar.set_grid(4, 4, &[3, 3, 1, 1, 0]);
        let obstacle_index = get_node_index(3, 3, width);

        assert_eq!(
            astar.nodes[obstacle_index].weight, 0,
            "Weight not correctly set. {:?}",
            astar.nodes
        );
    }

    #[test]
    fn obstacles_correctly_set_3() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };

        let obstacle_1_x: u16 = 3;
        let obstacle_1_y: u16 = 3;
        let obstacle_1_width: u16 = 8;
        let obstacle_1_height: u16 = 2;
        let obstacle_2_x: u16 = 2;
        let obstacle_2_y: u16 = 2;
        let obstacle_2_width: u16 = 10;
        let obstacle_2_height: u16 = 4;

        astar.set_grid(
            16,
            16,
            &[
                obstacle_1_x as u32,
                obstacle_1_y as u32,
                obstacle_1_width as u32,
                obstacle_1_height as u32,
                0,
                obstacle_2_x as u32,
                obstacle_2_y as u32,
                obstacle_2_width as u32,
                obstacle_2_height as u32,
                0,
            ],
        );
        for dx in 0..obstacle_1_width {
            for dy in 0..obstacle_1_height {
                let obstacle_index = get_node_index(obstacle_1_x + dx, obstacle_1_y + dy, 16);

                assert_eq!(
                    astar.nodes[obstacle_index].weight, 0,
                    "Weight not correctly set. {:?}",
                    astar.nodes
                );
            }
        }

        for dx in 0..obstacle_2_width {
            for dy in 0..obstacle_2_height {
                let obstacle_index = get_node_index(obstacle_2_x + dx, obstacle_2_y + dy, 16);

                assert_eq!(
                    astar.nodes[obstacle_index].weight, 0,
                    "Weight not correctly set. {:?}",
                    astar.nodes
                );
            }
        }
    }

    #[test]
    fn blocked_start_node_gets_connector_path() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };

        astar.set_grid(4, 4, &[0, 0, 1, 1, 0]);

        let path = astar.find_path(0, 0, 3, 3).unwrap();
        assert!(!path.is_empty(), "Expected a path, got {:?}", path);
        assert_eq!((path.first().unwrap().x, path.first().unwrap().y), (0, 0));
        assert_eq!((path.last().unwrap().x, path.last().unwrap().y), (3, 3));
        assert!(
            path.iter()
                .any(|node| [(1_u16, 0_u16), (0_u16, 1_u16)].contains(&(node.x, node.y))),
            "Expected a straight connector from blocked start. Path: {:?}",
            path
        );
    }

    #[test]
    fn blocked_end_node_gets_connector_path() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };

        astar.set_grid(4, 4, &[3, 3, 1, 1, 0]);

        let path = astar.find_path(0, 0, 3, 3).unwrap();
        assert!(!path.is_empty(), "Expected a path, got {:?}", path);
        assert_eq!((path.first().unwrap().x, path.first().unwrap().y), (0, 0));
        assert_eq!((path.last().unwrap().x, path.last().unwrap().y), (3, 3));
        assert!(
            path.iter()
                .any(|node| [(2_u16, 3_u16), (3_u16, 2_u16)].contains(&(node.x, node.y))),
            "Expected a straight connector to blocked end. Path: {:?}",
            path
        );
    }

    #[test]
    fn blocked_start_and_end_nodes_get_connector_path() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };

        astar.set_grid(4, 4, &[0, 0, 1, 1, 0, 3, 3, 1, 1, 0]);

        let path = astar.find_path(0, 0, 3, 3).unwrap();
        assert!(!path.is_empty(), "Expected a path, got {:?}", path);
        assert_eq!((path.first().unwrap().x, path.first().unwrap().y), (0, 0));
        assert_eq!((path.last().unwrap().x, path.last().unwrap().y), (3, 3));
    }

    #[test]
    fn blocked_node_without_straight_valid_proxy_returns_none() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };

        astar.set_grid(
            3,
            3,
            &[
                1, 1, 1, 1, 0, // center
                1, 0, 1, 1, 0, // up
                2, 1, 1, 1, 0, // right
                1, 2, 1, 1, 0, // down
                0, 1, 1, 1, 0, // left
            ],
        );

        let path = astar.find_path(1, 1, 2, 2);
        assert!(path.is_none(), "Expected no path when no straight valid proxy exists");
    }

    #[test]
    fn find_path_1() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };
        astar.set_grid(1024, 1024, &[]);
        let path = astar.find_path(0, 0, 3, 3);
        assert_eq!(path.is_some(), true);
        let path = path.unwrap();

        assert_eq!(path.len(), 3, "{:?}", path);
        assert_eq!((path[0].x, path[0].y), (0, 0));
        assert_eq!((path[2].x, path[2].y), (3, 3));
        assert!([(0 as u16, 3 as u16), (3 as u16, 0 as u16)].contains(&(path[1].x, path[1].y)));
    }

    #[test]
    fn find_path_2() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };
        astar.set_grid(900, 1635, &[]);
        let path = astar.find_path(36, 132, 512, 142);
        assert_eq!(path.is_some(), true);
        let path = path.unwrap();

        assert_eq!(path.len(), 3, "{:?}", path);
        assert_eq!((path[0].x, path[0].y), (36, 132));
        assert_eq!((path[2].x, path[2].y), (512, 142));
        assert!(
            [(36 as u16, 142 as u16), (512 as u16, 132 as u16)].contains(&(path[1].x, path[1].y))
        );
    }
}
