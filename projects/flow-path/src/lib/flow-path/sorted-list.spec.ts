import { SortedList } from './sorted-list';

interface TestObject {
  value: number;
}

describe('SortedList', () => {
  it('Should always stay sorted', () => {
    const sortedList = new SortedList<TestObject>((a) => a.value);
    sortedList.push({ value: 3 });
    sortedList.push({ value: 1 });
    sortedList.push({ value: 7 });
    sortedList.push({ value: 5 });

    expect(sortedList.pop()?.value).toBe(1);
    expect(sortedList.pop()?.value).toBe(3);
    expect(sortedList.pop()?.value).toBe(5);
    expect(sortedList.pop()?.value).toBe(7);
    expect(sortedList.pop()).toBeUndefined();
  });
});
