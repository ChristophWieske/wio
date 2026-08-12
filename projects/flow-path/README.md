# FlowPath

FlowPath draws connections between `wio-flow-path-node` elements on a canvas overlay.

## Host modes

### Implicit (global host)

If you use `wio-flow-path` and `wio-flow-path-node` without `wio-flow-path-host`, FlowPath creates a single fixed fullscreen canvas automatically.

Use this mode for convenience and low setup.

### Explicit (bounded host)

Wrap nodes and paths in `wio-flow-path-host` to constrain drawing and pathfinding to that host element's bounds.

Use this mode for better performance on dense or complex layouts.

## Example

```html
<wio-flow-path-host>
  <wio-flow-path-node id="start" />
  <wio-flow-path-node id="end" />
  <wio-flow-path [positions]="['start', 'end']" />
</wio-flow-path-host>
```

## Build

```bash
ng build flow-path
```
