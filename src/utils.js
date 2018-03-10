// @flow

// types
import type {Cache} from './types';

export const createAreKeysEqual = (isEqual: Function): Function => {
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
  return (keys1: Array<any>, keys2: Array<any>): boolean => {
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
};

export const createGetKeyIndex = (isEqual: Function): Function => {
  const areKeysEqual: Function = createAreKeysEqual(isEqual);

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

export const createGetTransformedKey = (transformKey: Function): Function => {
  /**
   * @function getTransformedKey
   *
   * @description
   * get the transformed key based on the args passed
   *
   * @param {Array<*>} args the args to transform into a key
   * @returns {Array<*>} the transformed key
   */
  return (args: Object): Array<any> => {
    const key: any = transformKey(args);

    return Array.isArray(key) ? key : [key];
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
export const isSameValueZero = (object1: any, object2: any): boolean => {
  return object1 === object2 || (object1 !== object1 && object2 !== object2);
};

/* eslint-disable no-unused-vars */
export const onCacheOperation = (cacheIgnored: any, optionsIgnored: any): void => {};
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
 * @function setPromiseCatch
 *
 * @description
 * update the promise method to auto-remove from cache if rejected
 *
 * @param {Cache} cache the cache object
 * @param {Array<any>} key the key to remove upon promise rejection
 * @param {function} getKeyIndex the method to retrieve the key index
 */
export const setPromiseCatch = (cache: Cache, key: Array<any>, getKeyIndex: Function): void => {
  cache.values[0] = cache.values[0].catch((error: Error) => {
    const keyIndex: number = getKeyIndex(cache.keys, key);

    if (~keyIndex) {
      cache.keys.splice(keyIndex, 1);
      cache.values.splice(keyIndex, 1);
    }

    throw error;
  });
};
