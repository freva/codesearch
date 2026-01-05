import { type DependencyList, useEffect } from 'react';
import { useCallback, useRef } from 'react';
import { isEqual } from 'lodash';

export function useCustomCompareMemoize<T>(deps: T, depsEqual = isEqual): T {
  const ref = useRef<T | undefined>(undefined);
  if (!ref.current || !depsEqual(ref.current, deps)) ref.current = deps;
  return ref.current;
}

export function useCustomCompareCallback<T>(
  callback: (...args: DependencyList) => T,
  deps: DependencyList,
  depsEqual?: (a: DependencyList, b: DependencyList) => boolean,
): (...args: DependencyList) => T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(callback, useCustomCompareMemoize(deps, depsEqual));
}

export function useCustomCompareEffect(
  effect: () => void,
  deps: DependencyList,
  depsEqual?: (a: DependencyList, b: DependencyList) => boolean,
): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, useCustomCompareMemoize(deps, depsEqual));
}
