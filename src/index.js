// @flow

// types
import type {Cache, Options} from './types';

// utils
import {createGetKeyIndex, createGetTransformedKey, isSameValueZero, orderByLru, setPromiseCatch} from './utils';

const slice: Function = [].slice;
const onCacheChangeNoOp = (cacheIgnored: any): void => {}; // eslint-disable-line no-unused-vars

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

  const {isEqual = isSameValueZero, isPromise = false, maxSize = 1, onCacheChange = onCacheChangeNoOp, transformKey} =
    options || {};

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
    const args: Array<any> | Object = getTransformedKey ? getTransformedKey(slice.call(arguments)) : arguments;
    const keyIndex: number = getKeyIndex(cache.keys, args);

    if (~keyIndex) {
      orderByLru(cache.keys, keyIndex);
      orderByLru(cache.values, keyIndex);

      if (keyIndex) {
        onCacheChange(cache);
      }
    } else {
      if (cache.keys.length >= maxSize) {
        cache.keys.pop();
        cache.values.pop();
      }

      cache.keys.unshift(getTransformedKey ? args : slice.call(args));
      cache.values.unshift(fn.apply(this, arguments));

      if (isPromise) {
        setPromiseCatch(cache, cache.keys[0], getKeyIndex);
      }

      onCacheChange(cache);
    }

    return cache.values[0];
  }

  Object.defineProperties(
    memoized,
    ({
      cache: {
        get() {
          return cache;
        }
      },
      cacheSnapshot: {
        get() {
          return {
            keys: [...cache.keys],
            values: [...cache.values]
          };
        }
      },
      isMemoized: {
        get() {
          return true;
        }
      },
      options: {
        get() {
          return {
            isEqual,
            isPromise,
            maxSize,
            onCacheChange,
            transformKey
          };
        }
      }
    }: Object)
  );

  return memoized;
}
