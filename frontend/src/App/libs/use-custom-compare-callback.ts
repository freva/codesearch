import { type DependencyList, useCallback, useEffect, useState } from 'react';
import { isEqual } from 'lodash-es';

export function useCustomCompareMemoize(
  deps: DependencyList,
  depsEqual: (a: DependencyList, b: DependencyList) => boolean = isEqual,
): DependencyList {
  const [currentValue, setCurrentValue] = useState(deps);
  if (!depsEqual(deps, currentValue)) setCurrentValue(deps);
  return currentValue;
}

export function useCustomCompareCallback<T>(
  callback: (...args: DependencyList) => T,
  deps: DependencyList,
  depsEqual?: (a: DependencyList, b: DependencyList) => boolean,
): (...args: DependencyList) => T {
  return useCallback(callback, useCustomCompareMemoize(deps, depsEqual));
}

export function useCustomCompareEffect(
  effect: () => void,
  deps: DependencyList,
  depsEqual?: (a: DependencyList, b: DependencyList) => boolean,
): void {
  useEffect(effect, useCustomCompareMemoize(deps, depsEqual));
}
