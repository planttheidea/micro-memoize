export const createAreKeysEqual = (isEqual) => {
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
  return (keys1, keys2) => {
    if (keys1.length !== keys2.length) {
      return false;
    }

    for (let index = 0; index < keys1.length; index++) {
      if (!isEqual(keys1[index], keys2[index])) {
        return false;
      }
    }

    return true;
  };
};

export const createGetKeyIndex = (isEqual) => {
  const areKeysEqual = createAreKeysEqual(isEqual);

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
  return (allKeys, keysToMatch) => {
    for (let index = 0; index < allKeys.length; index++) {
      if (areKeysEqual(allKeys[index], keysToMatch)) {
        return index;
      }
    }

    return -1;
  };
};

export const createGetTransformedKey = (transformKey) => {
  /**
   * @function getTransformedKey
   *
   * @description
   * get the transformed key based on the args passed
   *
   * @param {Array<*>} args the args to transform into a key
   * @returns {Array<*>} the transformed key
   */
  return (args) => {
    const key = transformKey(args);

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
 *
 * @returns {boolean} are the two objects equal
 */
export const isSameValueZero = (object1, object2) => {
  return object1 === object2 || (object1 !== object1 && object2 !== object2);
};

/**
 * @function orderByLru
 *
 * @description
 * order the array based on a Least-Recently-Used basis
 *
 * @param {Array<any>} array the array to order
 * @param {number} itemIndex the index of the item to move to the front
 */
export const orderByLru = (array, itemIndex) => {
  if (itemIndex) {
    const value = array[itemIndex];

    let index = itemIndex;

    while (index--) {
      array[index + 1] = array[index];
    }

    array[0] = value;
  }
};
