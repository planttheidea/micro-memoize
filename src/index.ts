import { Cache } from './Cache';
import type {
  AnyFn,
  CacheModifiedHandler,
  Key,
  KeyTransformer,
  Memoized,
  Options,
} from '../index.d';
import {
  cloneArray,
  getCustomOptions,
  isMemoized,
  isSameValueZero,
  mergeOptions,
} from './utils';

function createMemoizedFunction<Fn extends AnyFn>(
  fn: Fn | Memoized<Fn>,
  options: Options<Fn> = {},
): Memoized<Fn> {
  if (isMemoized(fn)) {
    return createMemoizedFunction<Fn>(
      fn.fn as Fn,
      mergeOptions(fn.options, options),
    );
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
  } = options;

  const normalizedOptions = mergeOptions<Fn>(
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

  const memoized = function (this: any) {
    let key = shouldCloneArguments
      ? cloneArray(arguments)
      : (arguments as unknown as Key);

    if (canTransformKey) {
      key = (transformKey as KeyTransformer)(key);
    }

    const keyIndex = keys.length ? cache.getKeyIndex(key) : -1;

    if (keyIndex !== -1) {
      if (shouldUpdateOnHit) {
        (onCacheHit as CacheModifiedHandler<Fn>)(
          cache,
          normalizedOptions,
          memoized,
        );
      }

      if (keyIndex) {
        cache.orderByLru(keys[keyIndex]!, values[keyIndex], keyIndex);

        if (shouldUpdateOnChange) {
          (onCacheChange as CacheModifiedHandler<Fn>)(
            cache,
            normalizedOptions,
            memoized,
          );
        }
      }
    } else {
      const newValue = fn.apply(this, arguments as unknown as any[]);
      const newKey = shouldCloneArguments
        ? (key as any[])
        : cloneArray(arguments);

      cache.orderByLru(newKey, newValue, keys.length);

      if (isPromise) {
        cache.updateAsyncCache(memoized);
      }

      if (shouldUpdateOnAdd) {
        (onCacheAdd as CacheModifiedHandler<Fn>)(
          cache,
          normalizedOptions,
          memoized,
        );
      }

      if (shouldUpdateOnChange) {
        (onCacheChange as CacheModifiedHandler<Fn>)(
          cache,
          normalizedOptions,
          memoized,
        );
      }
    }

    return values[0];
  } as Memoized<Fn>;

  memoized.cache = cache;
  memoized.fn = fn;
  memoized.isMemoized = true as const;
  memoized.options = normalizedOptions;

  return memoized;
}

export default createMemoizedFunction;
