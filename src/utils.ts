export function createGetKeyIndex({
  isEqual,
  isMatchingKey,
  maxSize,
}: MicroMemoize.Options) {
  return function getKeyIndex(
    allKeys: MicroMemoize.Keys,
    keyToMatch: MicroMemoize.Key,
  ) {
    if (isMatchingKey) {
      if (isMatchingKey(allKeys[0], keyToMatch)) {
        return 0;
      }

      if (maxSize > 1) {
        const keysLength = allKeys.length;

        let index = 1;

        while (index < keysLength) {
          if (isMatchingKey(allKeys[index], keyToMatch)) {
            return index;
          }

          index++;
        }
      }

      return -1;
    }

    if (maxSize > 1) {
      const keysLength = allKeys.length;
      const keyLength = keyToMatch.length;

      let index = 0;
      let existingKey;
      let argIndex;

      while (index < keysLength) {
        existingKey = allKeys[index];

        if (existingKey.length === keyLength) {
          argIndex = 0;

          while (argIndex < keyLength) {
            if (!isEqual(existingKey[argIndex], keyToMatch[argIndex])) {
              break;
            }

            argIndex++;
          }

          if (argIndex === keyLength) {
            return index;
          }
        }

        index++;
      }

      return -1;
    }

    const existingKey = allKeys[0];
    const keyLength = existingKey.length;

    if (keyToMatch.length !== keyLength) {
      return -1;
    }

    let index = 0;

    while (index < keyLength) {
      if (!isEqual(existingKey[index], keyToMatch[index])) {
        return -1;
      }

      index++;
    }

    return 0;
  };
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
  extraOptions: PlainObject,
  providedOptions: PlainObject,
) {
  const target: PlainObject = {};

  for (const key in extraOptions) {
    target[key] = extraOptions[key];
  }

  for (const key in providedOptions) {
    target[key] = providedOptions[key];
  }

  return target;
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
  cache: MicroMemoize.Cache,
  newKey: MicroMemoize.Key,
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

export function createUpdateAsyncCache(
  options: MicroMemoize.Options,
): MicroMemoize.AsyncCacheUpdater {
  const getKeyIndex: MicroMemoize.KeyIndexGetter = createGetKeyIndex(options);

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
  return (cache: MicroMemoize.Cache, memoized: MicroMemoize.Memoized): void => {
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
