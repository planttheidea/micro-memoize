import {
  AsyncCacheUpdater,
  Cache,
  Dictionary,
  Key,
  KeyIndexGetter,
  Keys,
  Memoized,
  Options,
} from './types';

const DEFAULT_OPTIONS_KEYS: { [key: string]: boolean } = {
  isEqual: true,
  isMatchingKey: true,
  isPromise: true,
  maxSize: true,
  onCacheAdd: true,
  onCacheChange: true,
  onCacheHit: true,
  transformKey: true,
};

/**
 * @function createGetKeyIndex
 *
 * @description
 * create a method that will get the matching key index if found
 *
 * @param options the memoization options passed
 * @returns the method to get the key index
 */
export function createGetKeyIndex({
  isEqual,
  isMatchingKey,
  maxSize,
}: Options) {
  if (typeof isMatchingKey === 'function') {
    return function getKeyIndex(allKeys: Keys, keyToMatch: Key) {
      if (isMatchingKey(allKeys[0], keyToMatch)) {
        return 0;
      }

      if (maxSize > 1) {
        const keysLength = allKeys.length;

        for (let index = 1; index < keysLength; index++) {
          if (isMatchingKey(allKeys[index], keyToMatch)) {
            return index;
          }
        }
      }

      return -1;
    };
  }

  if (maxSize > 1) {
    return function getKeyIndex(allKeys: Keys, keyToMatch: Key) {
      const keysLength = allKeys.length;
      const keyLength = keyToMatch.length;

      let existingKey;

      for (let index = 0; index < keysLength; index++) {
        existingKey = allKeys[index];

        if (existingKey.length === keyLength) {
          let argIndex = 0;

          for (; argIndex < keyLength; argIndex++) {
            if (!isEqual(existingKey[argIndex], keyToMatch[argIndex])) {
              break;
            }
          }

          if (argIndex === keyLength) {
            return index;
          }
        }
      }

      return -1;
    };
  }

  return function getKeyIndex(allKeys: Keys, keyToMatch: Key) {
    const existingKey = allKeys[0];
    const keyLength = existingKey.length;

    if (keyToMatch.length !== keyLength) {
      return -1;
    }

    for (let index = 0; index < keyLength; index++) {
      if (!isEqual(existingKey[index], keyToMatch[index])) {
        return -1;
      }
    }

    return 0;
  };
}

/**
 * @function getCustomOptions
 *
 * @description
 * get the custom options on the object passed
 *
 * @param options the memoization options passed
 * @returns the custom options passed
 */
export function getCustomOptions(options: Options) {
  const customOptions: { [key: string]: any } = {};

  for (const key in options) {
    if (!DEFAULT_OPTIONS_KEYS[key]) {
      // @ts-ignore
      customOptions[key] = options[key];
    }
  }

  return customOptions;
}

export function isFunction(fn: any): fn is Function {
  return typeof fn === 'function';
}

/**
 * @function isMemoized
 *
 * @description
 * is the function passed already memoized
 *
 * @param fn the function to test
 * @returns is the function already memoized
 */
export function isMemoized(fn: any): fn is Memoized<Function> {
  return isFunction(fn) && (fn as Memoized<Function>).isMemoized;
}

/**
 * @function isSameValueZero
 *
 * @description
 * are the objects equal based on SameValueZero equality
 *
 * @param object1 the first object to compare
 * @param object2 the second object to compare
 * @returns are the two objects equal
 */
export function isSameValueZero(object1: any, object2: any) {
  return object1 === object2 || (object1 !== object1 && object2 !== object2);
}

/**
 * @function mergeOptions
 *
 * @description
 * merge the options into the target
 *
 * @param extraOptions the extra options passed
 * @param providedOptions the defaulted options provided
 * @returns the merged options
 */
export function mergeOptions(
  extraOptions: Dictionary<any>,
  providedOptions: Options,
) {
  const target: Dictionary<any> = {};

  for (const key in extraOptions) {
    target[key] = extraOptions[key];
  }

  for (const key in providedOptions) {
    target[key] = providedOptions[key as keyof Options];
  }

  return target as Options;
}

/**
 * @function orderByLru
 *
 * @description
 * order the array based on a Least-Recently-Used basis
 *
 * @param keys the keys to order
 * @param newKey the new key to move to the front
 * @param values the values to order
 * @param newValue the new value to move to the front
 * @param startingIndex the index of the item to move to the front
 */
export function orderByLru(
  cache: Cache,
  newKey: Key,
  newValue: any,
  startingIndex: number,
  maxSize: number,
) {
  let index = startingIndex;

  while (index--) {
    cache.keys[index + 1] = cache.keys[index];
    cache.values[index + 1] = cache.values[index];
  }

  cache.keys[0] = newKey;
  cache.values[0] = newValue;

  if (startingIndex >= maxSize) {
    cache.keys.length = maxSize;
    cache.values.length = maxSize;
  }
}

export function createUpdateAsyncCache(options: Options): AsyncCacheUpdater {
  const getKeyIndex: KeyIndexGetter = createGetKeyIndex(options);

  const { onCacheChange, onCacheHit } = options;

  const shouldUpdateOnChange = typeof onCacheChange === 'function';
  const shouldUpdateOnHit = typeof onCacheHit === 'function';

  /**
   * @function updateAsyncCache
   *
   * @description
   * update the promise method to auto-remove from cache if rejected, and
   * if resolved then fire cache hit / changed
   *
   * @param cache the memoized function's cache
   * @param memoized the memoized function
   */
  return (cache: Cache, memoized: Memoized<Function>): void => {
    const key: any = cache.keys[0];

    cache.values[0] = cache.values[0]
      .then((value: any) => {
        shouldUpdateOnHit && onCacheHit(cache, options, memoized);
        shouldUpdateOnChange && onCacheChange(cache, options, memoized);

        return value;
      })
      .catch((error: Error) => {
        const keyIndex = getKeyIndex(cache.keys, key);

        if (keyIndex !== -1) {
          cache.keys.splice(keyIndex, 1);
          cache.values.splice(keyIndex, 1);
        }

        throw error;
      });
  };
}
