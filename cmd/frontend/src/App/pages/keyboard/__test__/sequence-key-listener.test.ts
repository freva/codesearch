import { expect, test, vi } from 'vitest';
import { listener } from '../sequence-key-listener';

test('bind and unbind', () => {
  const func1 = (): void => {};
  const func2 = (): void => {};
  const func3 = (): void => {};

  listener.bind('abc', func1);
  listener.bind('d', func2);
  listener.bind(['a', 'b', 'd'], func3);
  expect(listener.root).toEqual({
    a: { b: { c: { callback: func1 }, d: { callback: func3 } } },
    d: { callback: func2 },
  });

  listener.unbind('abc');
  expect(listener.root).toEqual({
    a: { b: { d: { callback: func3 } } },
    d: { callback: func2 },
  });

  listener.unbind('abd');
  expect(listener.root).toEqual({ d: { callback: func2 } });

  listener.unbind('d');
  expect(listener.root).toEqual({});
});

test('invalid binds and unbinds', () => {
  const func = (): void => {};
  listener.bind('abc', func);
  expect(() => listener.bind('ab', func)).toThrow(
    'Other sequence starting with a,b already bound',
  );

  expect(() => listener.bind('abcd', func)).toThrow(
    'Cannot bind sequence a,b,c,d: a,b already bound',
  );

  expect(() => listener.unbind('ab')).toThrow(
    'Cannot unbind missing sequence a,b',
  );
  listener.unbind('abc');
});

test('sequence callbacks called', () => {
  const origNow = Date.now;

  const fn1 = vi.fn();
  const fn2 = vi.fn();
  listener.bind('abc', fn1);
  listener.bind('d', fn2);
  const triggerKeyAndAssertFnCalls = (
    key: string,
    ctrlKey: boolean,
    fn1count: number,
    fn2count: number,
  ): void => {
    listener.keyDownHandler(new KeyboardEvent('keydown', { key, ctrlKey }));
    expect(fn1).toHaveBeenCalledTimes(fn1count);
    expect(fn2).toHaveBeenCalledTimes(fn2count);
  };

  Date.now = (): number => 123456000;
  triggerKeyAndAssertFnCalls('d', true, 0, 0);
  triggerKeyAndAssertFnCalls('d', false, 0, 1);
  triggerKeyAndAssertFnCalls('d', false, 0, 2);

  triggerKeyAndAssertFnCalls('a', false, 0, 2);
  triggerKeyAndAssertFnCalls('b', false, 0, 2);
  triggerKeyAndAssertFnCalls('c', false, 1, 2); // this completes abc sequence
  triggerKeyAndAssertFnCalls('c', false, 1, 2); // c again should not re-trigger

  triggerKeyAndAssertFnCalls('a', false, 1, 2);
  triggerKeyAndAssertFnCalls('b', true, 1, 2);
  triggerKeyAndAssertFnCalls('c', false, 1, 2); // b was pressed with modifier, doesn't count

  triggerKeyAndAssertFnCalls('a', false, 1, 2);
  triggerKeyAndAssertFnCalls('b', false, 1, 2);
  Date.now = (): number => 123458000;
  triggerKeyAndAssertFnCalls('c', false, 1, 2); // 2 sec between b and c, doesn't count

  listener.unbind('abc');
  listener.unbind('d');
  Date.now = origNow;
});
