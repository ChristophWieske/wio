/**
 * This class is a list of elements that will always be sorted.
 */
export class SortedList<T> {
  private readonly items: T[] = [];

  constructor(private readonly valueSelector: (a: T) => number) {}

  push(item: T): void {
    const index = this.findIndex(item);
    this.items.splice(index, 0, item);
  }

  update(item: T): void {
    const index = this.findIndex(item);
    const oldIndex = this.items.indexOf(item);

    if (index === oldIndex || oldIndex === -1) {
      return;
    }

    this.items.splice(oldIndex, 1);
    this.items.splice(index, 0, item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  get length() {
    return this.items.length;
  }

  private findIndex(item: T): number {
    let low = 0;
    let high = this.items.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      const comparison =
        this.valueSelector(this.items[mid]) - this.valueSelector(item);
      if (comparison > 0) low = mid + 1;
      else high = mid;
    }

    return low;
  }
}
