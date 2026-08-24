# @wieske-io/box-observer

A lightweight DOM box observer for UI libraries and canvas overlays.

`BoxObserver` tracks the bounding boxes of DOM elements and emits updates whenever an element's position or size changes. It is designed for cases where you need precise, low-overhead geometry updates without building a full layout engine.

## Why use it?

- Observe multiple elements with a single callback
- Keeps track of previous and current DOMRect values
- Detects changes in position and dimensions
- Works well for overlays, visual tools, pathfinding, and custom rendering systems
- Lightweight and focused on geometry updates

## Features

- Observes any DOM element
- Supports a root container via `BoxObserverOptions.root`
  - Emits normalized `DOMRect` data relative to the configured root, which allows relative position tracking
  - Only raises an update when the target's relative position to the root has changed, avoiding unnecessary notifications for unaffected movement
- Uses `requestAnimationFrame` to continuously reconcile element bounds
- Keeps a previous box snapshot for easy diffing

## Installation

```bash
npm install @wieske-io/box-observer
```

## Quick start

```ts
import { BoxObserver, BoxObserverEntry } from '@wieske-io/box-observer';

const observer = new BoxObserver((entries: BoxObserverEntry[]) => {
  for (const entry of entries) {
    console.log(entry.target, entry.box);
  }
});

const target = document.getElementById('node');
if (target) {
  observer.observe(target);
}
```

## API

```ts
interface BoxObserverOptions {
  root?: Element | null;
}

interface BoxObserverEntry {
  target: Element;
  previousBox: DOMRect | null | undefined;
  box: DOMRect | null;
}

class BoxObserver {
  constructor(
    callback: (entries: BoxObserverEntry[]) => void,
    options?: BoxObserverOptions,
  );

  observe(target: Element): void;
  unobserve(target: Element): void;
  disconnect(): void;
}
```

## Use cases

- Tracking node positions in interactive diagrams
- Updating canvas overlays based on DOM layout changes
- Triggering recalculation for pathfinding or collision systems
- Building custom editor or visualization components

## License

MIT
