// utils
import {
  createGetKeyIndex,
  createUpdateAsyncCache,
  isSameValueZero,
  mergeOptions,
  orderByLru,
} from './utils';

const { slice } = Array.prototype;

function createMemoizedFunction(
  fn: Function | MicroMemoize.Memoized,
  options: MicroMemoize.Options = {},
): MicroMemoize.Memoized {
  // @ts-ignore
  if (fn.isMemoized) {
    return fn;
  }

  const {
    isEqual = isSameValueZero,
    isMatchingKey,
    isPromise = false,
    maxSize = 1,
    onCacheAdd,
    onCacheChange,
    onCacheHit,
    transformKey,
    ...extraOptions
  }: MicroMemoize.Options = options;

  const normalizedOptions = mergeOptions(extraOptions, {
    isEqual,
    isMatchingKey,
    isPromise,
    maxSize,
    onCacheAdd,
    onCacheChange,
    onCacheHit,
    transformKey,
  });

  const getKeyIndex: MicroMemoize.KeyIndexGetter = createGetKeyIndex(
    normalizedOptions,
  );
  const updateAsyncCache: MicroMemoize.AsyncCacheUpdater = createUpdateAsyncCache(
    normalizedOptions,
  );

  const keys: MicroMemoize.Keys = [];
  const values: MicroMemoize.Values = [];

  const cache: MicroMemoize.Cache = {
    keys,
    get size() {
      return cache.keys.length;
    },
    values,
  };

  const canTransformKey = typeof transformKey === 'function';

  const shouldCloneArguments = !!(transformKey || isMatchingKey);

  const shouldUpdateOnAdd = typeof onCacheAdd === 'function';
  const shouldUpdateOnChange = typeof onCacheChange === 'function';
  const shouldUpdateOnHit = typeof onCacheHit === 'function';

  function memoized(): any {
    const normalizedArgs: MicroMemoize.RawKey = shouldCloneArguments
      ? slice.call(arguments, 0)
      : arguments;
    const key: MicroMemoize.RawKey = canTransformKey
      ? transformKey(normalizedArgs)
      : normalizedArgs;
    const keyIndex: number = keys.length ? getKeyIndex(keys, key) : -1;

    if (~keyIndex) {
      shouldUpdateOnHit && onCacheHit(cache, normalizedOptions, memoized);

      if (keyIndex) {
        orderByLru(cache, keys[keyIndex], values[keyIndex], keyIndex, maxSize);

        shouldUpdateOnChange &&
          onCacheChange(cache, normalizedOptions, memoized);
      }
    } else {
      const newValue: any = fn.apply(this, arguments);
      const newKey: MicroMemoize.Key = shouldCloneArguments
        ? key
        : slice.call(normalizedArgs, 0);

      orderByLru(cache, newKey, newValue, keys.length, maxSize);

      isPromise && updateAsyncCache(cache, memoized);

      shouldUpdateOnAdd && onCacheAdd(cache, normalizedOptions, memoized);
      shouldUpdateOnChange && onCacheChange(cache, normalizedOptions, memoized);
    }

    return values[0];
  }

  Object.defineProperties(memoized, {
    cache: {
      configurable: true,
      value: cache,
    },
    cacheSnapshot: {
      configurable: true,
      get() {
        return {
          keys: slice.call(cache.keys, 0),
          size: cache.size,
          values: slice.call(cache.values, 0),
        };
      },
    },
    isMemoized: {
      configurable: true,
      value: true,
    },
    options: {
      configurable: true,
      value: normalizedOptions,
    },
  });

  return memoized;
}

export { orderByLru };

export default createMemoizedFunction;
