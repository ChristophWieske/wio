export interface BoxObserverOptions {
  root?: Element | null;
}

export interface BoxObserverEntry {
  target: Element;
  previousBox: DOMRect | null | undefined;
  box: DOMRect | null;
}

export class BoxObserver {
  private readonly root: Element;
  private readonly targets = new Map<Element, DOMRect | undefined | null>();

  constructor(
    private readonly callback: (entries: BoxObserverEntry[]) => void,
    options?: BoxObserverOptions,
  ) {
    this.root = options?.root ?? document.documentElement;
  }

  observe(target: Element): void {
    this.targets.set(target, undefined);
    this.run();
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
  }

  private run(): void {
    if (this.targets.size === 0) {
      return;
    }

    // #1: Do all the reading first.
    const rootRect = this.root.getBoundingClientRect();
    const updates: BoxObserverEntry[] = [...this.targets]
      .map(([target, box]) => {
        if (!this.root.isConnected || !target.isConnected) {
          return { target, previousBox: box, box: null };
        }

        const targetRect = target.getBoundingClientRect();
        const normalizedRect = new DOMRect(
          targetRect.x - rootRect.x,
          targetRect.y - rootRect.y,
          targetRect.width,
          targetRect.height,
        );

        return { target, previousBox: box, box: normalizedRect };
      })
      // Todo: Consider adding epsilon tolerance (maybe to opt-in).
      .filter(
        (entry) =>
          entry.previousBox === undefined ||
          entry.previousBox === entry.box ||
          (entry.previousBox === null && entry.box !== null) ||
          (entry.box === null && entry.previousBox !== null) ||
          entry.previousBox!.x !== entry.box!.x ||
          entry.previousBox!.y !== entry.box!.y ||
          entry.previousBox!.width !== entry.box!.width ||
          entry.previousBox!.height !== entry.box!.height,
      );

    // #2: Now emit all updates.
    if (updates.length > 0) {
      updates.forEach((entry) => this.targets.set(entry.target, entry.box));
      this.callback(updates);
    }

    // #3: Queue the next run.
    requestAnimationFrame(() => this.run());
  }
}
