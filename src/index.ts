// cache
import { Cache } from './Cache';

// types
import { Memoized, Keys, StandardOptions, Values } from './types';

// utils
import {
  getCustomOptions,
  isFunction,
  isMemoized,
  isSameValueZero,
  mergeOptions,
  slice,
} from './utils';

function createMemoizedFunction<Fn extends Function>(
  fn: Fn,
  options: StandardOptions = {},
): Memoized<Fn> {
  if (isMemoized(fn)) {
    return fn;
  }

  if (!isFunction(fn)) {
    throw new TypeError('You must pass a function to `memoize`.');
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
  }: StandardOptions = options;

  const normalizedOptions = mergeOptions(getCustomOptions(options), {
    isEqual,
    isMatchingKey,
    isPromise,
    maxSize,
    onCacheAdd,
    onCacheChange,
    onCacheHit,
    transformKey,
  });

  const cache = new Cache(normalizedOptions);

  const {
    keys,
    values,
    canTransformKey,
    shouldCloneArguments,
    shouldUpdateOnAdd,
    shouldUpdateOnChange,
    shouldUpdateOnHit,
  } = cache;

  // @ts-ignore
  const memoized: Memoized<Fn> = function memoized() {
    const normalizedArgs = shouldCloneArguments
      ? slice(arguments, 0)
      : arguments;
    const key = canTransformKey ? transformKey(normalizedArgs) : normalizedArgs;
    const keyIndex = keys.length ? cache.getKeyIndex(key) : -1;

    if (keyIndex !== -1) {
      if (shouldUpdateOnHit) {
        onCacheHit(cache, normalizedOptions, memoized);
      }

      if (keyIndex) {
        cache.orderByLru(keys[keyIndex], values[keyIndex], keyIndex);

        if (shouldUpdateOnChange) {
          onCacheChange(cache, normalizedOptions, memoized);
        }
      }
    } else {
      const newValue = fn.apply(this, arguments);
      const newKey = shouldCloneArguments ? key : slice(arguments, 0);

      cache.orderByLru(newKey, newValue, keys.length);

      if (isPromise) {
        cache.updateAsyncCache(memoized);
      }

      if (shouldUpdateOnAdd) {
        onCacheAdd(cache, normalizedOptions, memoized);
      }

      if (shouldUpdateOnChange) {
        onCacheChange(cache, normalizedOptions, memoized);
      }
    }

    return values[0];
  };

  Object.defineProperties(memoized, {
    cache: {
      configurable: true,
      value: cache,
    },
    cacheSnapshot: {
      configurable: true,
      get() {
        return cache.snapshot;
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

export default createMemoizedFunction;
