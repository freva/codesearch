import type { DependencyList } from 'react';
import { useCallback, useRef } from 'react';
import { isEqual } from 'lodash';

type Comparator = (a: DependencyList, b: DependencyList) => boolean;

export function useCustomCompareMemoize<T>(deps: T, depsEqual = isEqual): T {
  const ref = useRef<T | undefined>();
  if (!ref.current || !depsEqual(ref.current, deps)) ref.current = deps;
  return ref.current;
}

export function useCustomCompareCallback<T extends Function>(
  callback: T,
  deps: DependencyList,
  depsEqual?: Comparator,
): T {
  return useCallback(callback, useCustomCompareMemoize(deps, depsEqual));
}
