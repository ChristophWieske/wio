import { BoxObserver } from './box-observer';

describe('BoxObserver', () => {
  it('should create', () => {
    const observer = new BoxObserver(() => {});

    expect(observer).toBeTruthy();
  });
});
