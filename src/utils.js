// @flow

// types
import type {
  Cache,
  Options,
} from './types';

/**
 * @function cloneArray
 *
 * @description
 * clone the array-like object and return the new array
 *
 * @param {Array<any>|Arguments} arrayLike the array-like object to clone
 * @returns {Array<any>} the clone of the array
 */
export const cloneArray = (arrayLike: Array<any> | Object): Array<any> => {
  const array: Array<any> = new Array(arrayLike.length);

  for (let index: number = 0; index < arrayLike.length; index++) {
    array[index] = arrayLike[index];
  }

  return array;
};

export const createAreKeysEqual = (isEqual: Function): Function =>
  /**
   * @function areKeysEqual
   *
   * @description
   * are the keys shallowly equal to one another
   *
   * @param {Array<any>} keys1 the keys array to test against
   * @param {Array<any>} keys2 the keys array to test
   * @returns {boolean} are the keys shallowly equal
   */
  (keys1: Array<any>, keys2: Array<any>): boolean => {
    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let index: number = 0; index < keys1.length; index++) {
      if (!isEqual(keys1[index], keys2[index])) {
        return false;
      }
    }

    return true;
  };

export const createGetKeyIndex = (isEqual: Function, isMatchingKey: ?Function): Function => {
  const areKeysEqual: Function = typeof isMatchingKey === 'function' ? isMatchingKey : createAreKeysEqual(isEqual);

  /**
   * @function getKeyIndex
   *
   * @description
   * get the index of the matching key
   *
   * @param {Array<Array<any>>} allKeys the list of all available keys
   * @param {Array<any>} keysToMatch the key to try to match
   *
   * @returns {number} the index of the matching key value, or -1
   */
  return (allKeys: Array<Array<any>>, keysToMatch: Array<any>): number => {
    for (let index: number = 0; index < allKeys.length; index++) {
      if (areKeysEqual(allKeys[index], keysToMatch)) {
        return index;
      }
    }

    return -1;
  };
};

/**
 * @function isSameValueZero
 *
 * @description
 * are the objects equal based on SameValueZero
 *
 * @param {any} object1 the first object to compare
 * @param {any} object2 the second object to compare
 * @returns {boolean} are the two objects equal
 */
export const isSameValueZero = (object1: any, object2: any): boolean =>
  object1 === object2 || (object1 !== object1 && object2 !== object2);

/* eslint-disable no-unused-vars */
export const onCacheOperation = (cacheIgnored: Cache, optionsIgnored: Options, memoized: Function): void => {};
/* eslint-enable */

/**
 * @function orderByLru
 *
 * @description
 * order the array based on a Least-Recently-Used basis
 *
 * @param {Array<any>} array the array to order
 * @param {any} value the value to assign at the beginning of the array
 * @param {number} startingIndex the index of the item to move to the front
 */
export const orderByLru = (array: Array<any>, value: any, startingIndex: number) => {
  let index: number = startingIndex;

  while (index--) {
    array[index + 1] = array[index];
  }

  array[0] = value;
};

/**
 * @function setPromiseHandler
 *
 * @description
 * update the promise method to auto-remove from cache if rejected, and if resolved then fire cache hit / changed
 *
 * @param {Cache} cache the cache object
 * @param {Options} options the options for the memoized function
 * @param {function} memoized the memoized function
 */
export const setPromiseHandler = (cache: Cache, options: Options, memoized: Function): void => {
  const key: any = cache.keys[0];

  cache.values[0] = cache.values[0]
    .then(
      (value: any): any => {
        options.onCacheHit(cache, options, memoized);
        options.onCacheChange(cache, options, memoized);

        return value;
      }
    )
    .catch((error: Error) => {
      const keyIndex: number = createGetKeyIndex(options.isEqual)(cache.keys, key);

      if (~keyIndex) {
        cache.keys.splice(keyIndex, 1);
        cache.values.splice(keyIndex, 1);
      }

      throw error;
    });
};
