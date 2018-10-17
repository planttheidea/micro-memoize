// @flow

// types
import type {
  Cache,
  Options,
} from './types';

const hasOwnProperty: Function = Object.prototype.hasOwnProperty;

/**
 * @function assign
 *
 * @description
 * merge the sources into the target, as you would with Object.assign()
 *
 * @param {Object} target object to merge into
 * @param  {...Array<Object>} sources the sources to merge into the target
 * @returns {Object} the merged object
 */
export const assign = (target: Object, ...sources: Array<Object>): Object => {
  let source;

  for (let index = 0; index < sources.length; index++) {
    source = sources[index];

    if (source && typeof source === 'object') {
      for (let key in source) {
        if (hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
  }

  return target;
};

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
  const length: number = arrayLike.length;

  if (!length) {
    return [];
  }

  if (length === 1) {
    return [arrayLike[0]];
  }

  if (length === 2) {
    return [arrayLike[0], arrayLike[1]];
  }

  if (length === 3) {
    return [arrayLike[0], arrayLike[1], arrayLike[2]];
  }

  const array: Array<any> = new Array(length);

  for (let index: number = 0; index < length; index++) {
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

    for (let index: number = 0, length: number = keys1.length; index < length; index++) {
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

export const onCacheOperation = (cacheIgnored: Cache, optionsIgnored: Options, memoizedIgnored: Function): void => {};

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
 * @function createSetPromiseHandler
 *
 * @description
 * update the promise method to auto-remove from cache if rejected, and if resolved then fire cache hit / changed
 *
 * @param {Options} options the options for the memoized function
 * @param {function(Cache, function): function} memoized the memoized function
 */
export const createSetPromiseHandler = (options: Options): Function => {
  const getKeyIndex = createGetKeyIndex(options.isEqual, options.isMatchingKey);

  return (cache: Cache, memoized: Function): void => {
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
        const keyIndex: number = getKeyIndex(cache.keys, key);

        if (~keyIndex) {
          cache.keys.splice(keyIndex, 1);
          cache.values.splice(keyIndex, 1);
        }

        throw error;
      });
  };
};
