// cache
import Cache from './Cache';

// utils
import {
  copyArray,
  getCustomOptions,
  isSameValueZero,
  mergeOptions,
} from './utils';

function createMemoizedFunction<T extends Function>(
  fn: T | MicroMemoize.Memoized,
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
  }: MicroMemoize.Options = options;

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

  const canTransformKey = typeof transformKey === 'function';
  const shouldCloneArguments = canTransformKey || !!isMatchingKey;

  function memoized(): any {
    const normalizedArgs = shouldCloneArguments
      ? copyArray(arguments)
      : arguments;
    const key = canTransformKey ? transformKey(normalizedArgs) : normalizedArgs;
    const keyIndex = cache.size ? cache.getKeyIndex(key) : -1;

    if (keyIndex !== -1) {
      onCacheHit && onCacheHit(cache, normalizedOptions, memoized);

      if (keyIndex) {
        cache.orderByLru(
          cache.keys[keyIndex],
          cache.values[keyIndex],
          keyIndex,
        );

        onCacheChange && onCacheChange(cache, normalizedOptions, memoized);
      }
    } else {
      const newValue = fn.apply(this, arguments);
      const newKey = shouldCloneArguments ? key : copyArray(normalizedArgs);

      cache.orderByLru(newKey as MicroMemoize.Key, newValue, cache.size);

      isPromise && cache._updateAsync(memoized);

      onCacheAdd && onCacheAdd(cache, normalizedOptions, memoized);
      onCacheChange && onCacheChange(cache, normalizedOptions, memoized);
    }

    return cache.values[0];
  }

  Object.defineProperties(memoized, {
    cache: {
      configurable: true,
      enumerable: false,
      value: cache,
      writable: true,
    },
    cacheSnapshot: {
      configurable: true,
      get() {
        return {
          keys: copyArray(cache.keys),
          size: cache.size,
          values: copyArray(cache.values),
        };
      },
    },
    isMemoized: {
      configurable: true,
      enumerable: false,
      value: true,
      writable: true,
    },
    options: {
      configurable: true,
      enumerable: false,
      value: normalizedOptions,
      writable: true,
    },
  });

  return memoized;
}

export default createMemoizedFunction;
