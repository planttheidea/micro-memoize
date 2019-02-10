export function createAreKeysEqual(
  isEqual: MicroMemoize.EqualityComparator,
): MicroMemoize.MatchingKeyComparator {
  /**
   * @function areKeysEqual
   *
   * @description
   * are the keys shallowly equal to one another
   *
   * @param key1 the keys array to test against
   * @param key2 the keys array to test
   * @returns are the keys shallowly equal
   */
  return function areKeysEqual(key1: MicroMemoize.Key, key2: MicroMemoize.Key) {
    const length: number = key1.length;

    if (key2.length !== length) {
      return false;
    }

    let index: number = length;

    while (index--) {
      if (!isEqual(key1[index], key2[index])) {
        return false;
      }
    }

    return true;
  };
}

export function createGetKeyIndex(
  options: MicroMemoize.Options,
): MicroMemoize.KeyIndexGetter {
  const areKeysEqual: MicroMemoize.MatchingKeyComparator =
    typeof options.isMatchingKey === 'function'
      ? options.isMatchingKey
      : createAreKeysEqual(options.isEqual);

  /**
   * @function getKeyIndex
   *
   * @description
   * get the index of the matching key
   *
   * @param allKeys the list of all available keys
   * @param keyToMatch the key to try to match
   *
   * @returns {number} the index of the matching key value, or -1
   */
  return function getKeyIndex(
    allKeys: MicroMemoize.Keys,
    keyToMatch: MicroMemoize.Key,
  ) {
    if (areKeysEqual(allKeys[0], keyToMatch)) {
      return 0;
    }

    for (let index: number = 1; index < allKeys.length; index++) {
      if (areKeysEqual(allKeys[index], keyToMatch)) {
        return index;
      }
    }

    return -1;
  };
}

/**
 * @function isSameValueZero
 *
 * @description
 * are the objects equal based on SameValueZero
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
) {
  let index: number = startingIndex;

  while (index--) {
    cache.keys[index + 1] = cache.keys[index];
    cache.values[index + 1] = cache.values[index];
  }

  cache.keys[0] = newKey;
  cache.values[0] = newValue;
}

export function createUpdateAsyncCache(
  options: MicroMemoize.Options,
): MicroMemoize.AsyncCacheUpdater {
  const getKeyIndex: MicroMemoize.KeyIndexGetter = createGetKeyIndex(options);

  const { onCacheChange, onCacheHit } = options;

  const shouldUpdateOnChange: boolean = typeof onCacheChange === 'function';
  const shouldUpdateOnHit: boolean = typeof onCacheHit === 'function';

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
      .then(
        (value: any): any => {
          shouldUpdateOnHit && onCacheHit(cache, options, memoized);
          shouldUpdateOnChange && onCacheChange(cache, options, memoized);

          return value;
        },
      )
      .catch((error: Error) => {
        const keyIndex: number = getKeyIndex(cache.keys, key);

        if (~keyIndex) {
          cache.keys.splice(keyIndex, 1);
          cache.values.splice(keyIndex, 1);
        }

        throw error;
      });
  };
}
