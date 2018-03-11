// @flow

// types
import type {Cache, Options} from './types';

// utils
import {
  cloneArray,
  createGetKeyIndex,
  createGetTransformedKey,
  isSameValueZero,
  onCacheOperation,
  orderByLru,
  setPromiseHandler
} from './utils';

/**
 * @function memoize
 *
 * @description
 * get the memoized version of the method passed
 *
 * @param {function} fn the method to memoize
 * @param {Object} [options={}] the options to build the memoizer with
 * @param {boolean} [options.isEqual=isSameValueZero] the method to compare equality of keys with
 * @param {number} [options.maxSize=1] the number of items to store in cache
 * @returns {function} the memoized method
 */
export default function memoize(fn: Function, options: Options) {
  // if it is a memoized method, don't re-memoize it
  if (fn.isMemoized) {
    return fn;
  }

  const {
    isEqual = isSameValueZero,
    isPromise = false,
    maxSize = 1,
    onCacheAdd = onCacheOperation,
    onCacheChange = onCacheOperation,
    onCacheHit = onCacheOperation,
    transformKey,
    ...extraOptions
  } =
    options || {};

  const normalizedOptions = Object.assign({}, extraOptions, {
    isEqual,
    isPromise,
    maxSize,
    onCacheAdd,
    onCacheChange,
    onCacheHit,
    transformKey
  });

  const getKeyIndex: Function = createGetKeyIndex(isEqual);
  const getTransformedKey: ?Function = transformKey ? createGetTransformedKey(transformKey) : null;
  const cache: Cache = {
    keys: [],
    values: []
  };

  /**
   * @function memoized
   *
   * @description
   * the memoized version of the method passed
   *
   * @param {...Array<any>} key the arguments passed, which create a unique cache key
   * @returns {any} the value of the method called with the arguments
   */
  function memoized(): any {
    const args: Array<any> | Object = getTransformedKey ? getTransformedKey(cloneArray(arguments)) : arguments;
    const keyIndex: number = getKeyIndex(cache.keys, args);

    if (~keyIndex) {
      onCacheHit(cache, normalizedOptions);

      if (keyIndex) {
        orderByLru(cache.keys, cache.keys[keyIndex], keyIndex);
        orderByLru(cache.values, cache.values[keyIndex], keyIndex);

        onCacheChange(cache, normalizedOptions);
      }
    } else {
      if (cache.keys.length >= maxSize) {
        cache.keys.pop();
        cache.values.pop();
      }

      orderByLru(cache.keys, getTransformedKey ? args : cloneArray(args), cache.keys.length);
      orderByLru(cache.values, fn.apply(this, arguments), cache.values.length);

      if (isPromise) {
        setPromiseHandler(cache, normalizedOptions, getKeyIndex);
      }

      onCacheAdd(cache, normalizedOptions);
      onCacheChange(cache, normalizedOptions);
    }

    return cache.values[0];
  }

  Object.defineProperties(
    memoized,
    ({
      cache: {
        configurable: true,
        get() {
          return cache;
        }
      },
      cacheSnapshot: {
        configurable: true,
        get() {
          return {
            keys: cloneArray(cache.keys),
            values: cloneArray(cache.values)
          };
        }
      },
      isMemoized: {
        configurable: true,
        get() {
          return true;
        }
      },
      options: {
        configurable: true,
        get() {
          return normalizedOptions;
        }
      }
    }: Object)
  );

  return memoized;
}
