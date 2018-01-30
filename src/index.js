// utils
import {createGetKeyIndex, createGetTransformedKey, isSameValueZero, orderByLru} from './utils';

const slice = [].slice;

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
export default function memoize(fn, options = {}) {
  // if it is a memoized method, don't re-memoize it
  if (fn.isMemoized) {
    return fn;
  }

  const {isEqual = isSameValueZero, maxSize = 1, transformKey} = options;

  const getKeyIndex = createGetKeyIndex(isEqual);
  const getTransformedKey = transformKey ? createGetTransformedKey(transformKey) : null;
  const cache = {
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
  function memoized() {
    const args = getTransformedKey ? getTransformedKey(slice.call(arguments)) : arguments;
    const keyIndex = getKeyIndex(cache.keys, args);

    if (~keyIndex) {
      orderByLru(cache.keys, keyIndex);
      orderByLru(cache.values, keyIndex);
    } else {
      if (cache.keys.length >= maxSize) {
        cache.keys.pop();
        cache.values.pop();
      }

      cache.keys.unshift(getTransformedKey ? args : slice.call(args));
      cache.values.unshift(fn.apply(this, arguments));
    }

    return cache.values[0];
  }

  Object.defineProperties(memoized, {
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
        return Object.assign({}, options);
      }
    }
  });

  return memoized;
}
