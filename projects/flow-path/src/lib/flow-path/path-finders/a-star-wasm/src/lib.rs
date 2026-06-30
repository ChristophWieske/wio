use console_error_panic_hook;
use std::cmp::Reverse;
use std::collections::BinaryHeap;
use wasm_bindgen::prelude::*;
use web_sys::console;

macro_rules! log {
    ($($t:tt)*) => {{
        #[cfg(target_arch = "wasm32")]
        {
            web_sys::console::log_1(&format!($($t)*).into());
        }

        #[cfg(not(target_arch = "wasm32"))]
        {
            println!($($t)*);
        }
    }};
}

#[cfg(target_arch = "wasm32")]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

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
    direction: Option<(i8, i8)>,
}

#[derive(Debug)]
#[wasm_bindgen]
pub struct Node {
    pub x: u16,
    pub y: u16,
}

const DIRECTION_VECTORS: [(i8, i8); 4] = [(0, -1), (1, 0), (0, 1), (-1, 0)];

const COST_FOR_TURN: u32 = 1;

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
    pub fn set_dimensions(&mut self, width: u16, height: u16) -> () {
        log!("Setting dimensions {}x{}", width, height);
        self.width = width;
        self.height = height;
        let mut nodes = Vec::with_capacity(width as usize * height as usize);

        for y in 0..height {
            for x in 0..width {
                nodes.push(GridNode {
                    x: x,
                    y: y,
                    weight: 1,
                });
            }
        }

        self.nodes = nodes;
    }

    pub fn set_weight(&mut self, x: u16, y: u16, weight: u32) -> () {
        let index = get_node_index(x, y, self.width);
        self.nodes[index].weight = weight;
    }

    pub fn find_path(&mut self, x1: u16, y1: u16, x2: u16, y2: u16) -> Option<Vec<Node>> {
        if x1 >= self.width || y1 >= self.height || x2 >= self.width || y2 >= self.height {
            return None;
        }

        let start_node_index = get_node_index(x1, y1, self.width);
        let start_node = &self.nodes[start_node_index];

        let end_node_index = get_node_index(x2, y2, self.width);
        let end_node = &self.nodes[end_node_index];

        let mut g_score = vec![u32::MAX; self.width as usize * self.height as usize];
        g_score[start_node_index] = 0;
        let mut candidates = vec![];

        let h = heuristic(&start_node, &end_node, None);
        let mut open_list = BinaryHeap::with_capacity((h as usize) * 2);
        let candidate = Candidate {
            node_index: start_node_index,
            parent_index: None,
            index: 0,
            direction: None,
        };
        candidates.push(candidate);
        open_list.push(Reverse((h, 0, 0)));

        while !open_list.is_empty() {
            let (_, _, current_candidate_index) = unsafe { open_list.pop().unwrap_unchecked().0 };

            let current = candidates[current_candidate_index];

            if current.node_index == end_node_index {
                return Some(reconstruct_path(&current, &candidates, &self.nodes));
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

                let turn_cost = if current.direction == Some(direction) {
                    0
                } else {
                    COST_FOR_TURN
                };
                let g = g_score[current.node_index] + next_node.weight + turn_cost;
                if g >= g_score[next_node_index] {
                    continue;
                }
                g_score[next_node_index] = g;

                let h = heuristic(&next_node, &end_node, Some(direction));
                let next_candidate_index = candidates.len();
                let next_candidate = Candidate {
                    node_index: next_node_index,
                    parent_index: Some(current.index),
                    index: next_candidate_index,
                    direction: Some(direction),
                };
                open_list.push(Reverse((g + h, -(g as i32), next_candidate_index)));
                candidates.push(next_candidate);
            }
        }
        return Some(vec![]);
    }
}

fn get_node_index(x: u16, y: u16, width: u16) -> usize {
    y as usize * width as usize + x as usize
}

fn cost_for_direction_change(
    from: &Candidate,
    to: &GridNode,
    candidates: &Vec<Candidate>,
    nodes: &Vec<GridNode>,
) -> u32 {
    match from.parent_index {
        Some(grandfather_index) => {
            let grandfather = &candidates[grandfather_index];
            let grandfather_node = nodes[grandfather.node_index];
            if grandfather_node.x == to.x || grandfather_node.y == to.y {
                return 0;
            }

            return COST_FOR_TURN;
        }
        None => return 0,
    };
}

fn reconstruct_path(
    candidate: &Candidate,
    candidates: &Vec<Candidate>,
    nodes: &Vec<GridNode>,
) -> Vec<Node> {
    let mut result = Vec::with_capacity(32);

    let mut current_candidate = candidate;
    let mut latest_turn = nodes[candidate.node_index];

    result.push(Node {
        x: latest_turn.x,
        y: latest_turn.y,
    });

    while current_candidate.parent_index.is_some() {
        let parent_index = unsafe { current_candidate.parent_index.unwrap_unchecked() };
        let parent = &candidates[parent_index];
        let parent_node = nodes[parent.node_index];
        if parent_node.x != latest_turn.x && parent_node.y != latest_turn.y {
            let current_node = nodes[current_candidate.node_index];
            result.push(Node {
                x: current_node.x,
                y: current_node.y,
            });
            latest_turn = current_node;
        }
        current_candidate = parent;
    }

    let current_node = nodes[current_candidate.node_index];
    result.push(Node {
        x: current_node.x,
        y: current_node.y,
    });
    result.reverse();
    result
}

/// Returns a simplified 2d direction vector ready to be compared against those in DIRECTION_VECTORS.
/// Attention: The result vector is not normalized as that would be to expensive for diagonals
/// and unneccessary because we don't have diagonal move vectors.
/// Instead coordinates are 1, 0 or -1 only.
fn get_direction(from: &GridNode, to: &GridNode) -> (i8, i8) {
    (
        (to.x as i32 - from.x as i32).signum() as i8,
        (to.y as i32 - from.y as i32).signum() as i8,
    )
}

fn heuristic(from: &GridNode, to: &GridNode, direction: Option<(i8, i8)>) -> u32 {
    if from == to {
        return 0;
    }

    let target_direction = get_direction(from, to);
    let requires_turn = match direction {
        Some(direction) => direction != target_direction,
        None => DIRECTION_VECTORS
            .iter()
            .all(|direction| *direction != target_direction),
    };

    return (from.x as u32).abs_diff(to.x as u32)
        + (from.y as u32).abs_diff(to.y as u32)
        + requires_turn as u32 * COST_FOR_TURN;
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
        let result = heuristic(&start_node, &target_node, None);
        assert_eq!(result, 12);
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
        let result = heuristic(&start_node, &target_node, None);
        assert_eq!(result, 14);
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
        let result = heuristic(&start_node, &target_node, None);
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
        let result = heuristic(&start_node, &target_node, None);
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
        let current_direction = (0, 1);

        let result = heuristic(&from_node, &target_node, Some(current_direction));
        assert_eq!(result, 11);
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
        let current_direction = (1, 0);
        let result = heuristic(&start_node, &target_node, Some(current_direction));
        assert_eq!(result, 11);
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
        let current_direction = (0, 1);
        let result = heuristic(&from_node, &target_node, Some(current_direction));
        assert_eq!(result, 12);
    }

    #[test]
    fn cost_for_direction_change_test_1() {
        let nodes = vec![
            GridNode {
                x: 0,
                y: 0,
                weight: 1,
            },
            GridNode {
                x: 1,
                y: 0,
                weight: 1,
            },
        ];
        let all_candidates = vec![
            Candidate {
                node_index: 0,
                parent_index: None,
                index: 0,
                direction: None,
            },
            Candidate {
                node_index: 1,
                parent_index: Some(0),
                index: 1,
                direction: Some((1, 0)),
            },
        ];

        let target_node = GridNode {
            x: 1,
            y: 1,
            weight: 1,
        };
        let result =
            cost_for_direction_change(&all_candidates[1], &target_node, &all_candidates, &nodes);
        assert_eq!(result, COST_FOR_TURN);
    }

    #[test]
    fn cost_for_direction_change_test_2() {
        let nodes = vec![
            GridNode {
                x: 2,
                y: 0,
                weight: 1,
            },
            GridNode {
                x: 3,
                y: 0,
                weight: 1,
            },
        ];
        let all_candidates = vec![
            Candidate {
                node_index: 0,
                parent_index: None,
                index: 0,
                direction: None,
            },
            Candidate {
                node_index: 1,
                parent_index: Some(0),
                index: 1,
                direction: Some((1, 0)),
            },
        ];

        let target_node = GridNode {
            x: 3,
            y: 1,
            weight: 1,
        };
        let result =
            cost_for_direction_change(&all_candidates[1], &target_node, &all_candidates, &nodes);
        assert_eq!(result, COST_FOR_TURN);
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
        astar.set_dimensions(width, height);
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
    fn find_path_1() {
        let mut astar = AStar {
            nodes: vec![],
            width: 0,
            height: 0,
        };
        astar.set_dimensions(1024, 1024);
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
        astar.set_dimensions(900, 1635);
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
