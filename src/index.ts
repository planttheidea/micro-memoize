// cache
import { Cache } from './Cache';

// types
import { MicroMemoize } from './types';

// utils
import {
  getCustomOptions, isMemoized, isSameValueZero, mergeOptions, slice,
} from './utils';

function createMemoizedFunction<Fn extends Function>(
  fn: Fn | MicroMemoize.Memoized<Fn>,
  options: MicroMemoize.StandardOptions = {},
): MicroMemoize.Memoized<Fn> {
  if (isMemoized(fn)) {
    return createMemoizedFunction(fn.fn, mergeOptions(fn.options, options));
  }

  if (typeof fn !== 'function') {
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
  }: MicroMemoize.StandardOptions = options;

  const normalizedOptions = mergeOptions(
    {
      isEqual,
      isMatchingKey,
      isPromise,
      maxSize,
      onCacheAdd,
      onCacheChange,
      onCacheHit,
      transformKey,
    },
    getCustomOptions(options),
  );

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
    let key = shouldCloneArguments ? slice(arguments, 0) : arguments;

    if (canTransformKey) {
      key = transformKey(key);
    }

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

  memoized.cache = cache;
  memoized.fn = fn;
  memoized.isMemoized = true as const;
  memoized.options = normalizedOptions;

  return memoized;
}

export default createMemoizedFunction;
