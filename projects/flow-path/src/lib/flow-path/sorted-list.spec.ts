import { SortedList } from './sorted-list';

interface TestObject {
  value: number;
}

describe('SortedList', () => {
  it('Should always stay sorted', () => {
    const sortedList = new SortedList<TestObject>((a, b) => a.value - b.value);
    sortedList.push({ value: 3 });
    sortedList.push({ value: 1 });
    sortedList.push({ value: 7 });
    sortedList.push({ value: 5 });

    expect(sortedList.shift()?.value).toBe(1);
    expect(sortedList.shift()?.value).toBe(3);
    expect(sortedList.shift()?.value).toBe(5);
    expect(sortedList.shift()?.value).toBe(7);
    expect(sortedList.shift()).toBeUndefined();
  });
});
