/**
 * This class is a list of elements that will always be sorted.
 */
export class SortedList<T> {
  private readonly items: T[] = [];

  constructor(private readonly sortCallback: (a: T, b: T) => number) {}

  push(item: T): void {
    let low = 0;
    let high = this.items.length;

    while (low < high) {
      const mid = (low + high) >>> 1;
      const comparision = this.sortCallback(item, this.items[mid]);
      if (comparision > 0) low = mid + 1;
      else high = mid;
    }

    this.items.splice(low, 0, item);
  }

  update(item: T): void {
    const oldItem = this.items.indexOf(item);
    this.items.splice(oldItem, 1);
    this.push(item);
  }

  shift(): T | undefined {
    return this.items.shift();
  }

  get length() {
    return this.items.length;
  }
}
