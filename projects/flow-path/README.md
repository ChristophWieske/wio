# @wieske-io/flow-path

A lightweight Angular library for drawing routed paths between DOM nodes.

`FlowPath` helps you visualize connections, workflows, dependency graphs, process diagrams, and interactive node layouts without manually managing SVG or canvas drawing logic. It works with a host container and a set of trackable nodes, then calculates and draws paths around obstacles and through the available space.

## Demo

Live demo: https://flow-path.wieske.io

## Key features

- Draws connection paths between nodes on a canvas overlay
- Supports bounded host layouts via `FlowPathHost`
- Supports fullscreen/global host mode with `GlobalFlowPathHost`
- Supports node-based routing with obstacles and collision-aware pathfinding
- Built around a DOM geometry observer for accurate updates as nodes move or resize
- Designed for custom editor and visualization experiences in Angular applications

## Installation

```bash
npm install @wieske-io/flow-path
```

## Basic usage

```html
<wio-flow-path-host>
  <wio-flow-path-node id="start" />
  <wio-flow-path-node id="end" />
  <wio-flow-path [positions]="['start', 'end']" />
</wio-flow-path-host>
```

## Host modes

### Implicit (global host)

Use the global host when you want a simple fullscreen overlay with minimal setup.

```html
<wio-flow-path-node id="start" />
<wio-flow-path-node id="end" />
<wio-flow-path [positions]="['start', 'end']" />
```

### Explicit (bounded host) - recommended

Use a bounded host when the path overlay should be constrained to a specific parent container. This mode is recommended because it typically performs better and keeps the canvas from visually overlaying surrounding elements in the way that the implicit fullscreen mode can.

```html
<wio-flow-path-host>
  <wio-flow-path-node id="start" />
  <wio-flow-path-node id="end" />
  <wio-flow-path [positions]="['start', 'end']" />
</wio-flow-path-host>
```

The explicit mode is usually the better default for production use because it limits the drawing area to the relevant container, reduces unnecessary redraw work, and avoids the canvas floating over unrelated content outside the visual host area.

## Components

The package exports the following public API:

- `FlowPathHost`
- `FlowPath`
- `FlowPathNode`
- `Obstacle`

## Notes

This library is intended for interactive visualization and layout-driven experiences. For best results, keep the node host and path overlay in sync with the underlying UI state so the pathfinder can respond to layout changes efficiently.

## License

MIT
