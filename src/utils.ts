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
 * @function copyArray
 *
 * @description
 * copy an array-like object to a new array
 *
 * @param arrayLike the array-like object to copy
 * @returns the copied array
 */
export function copyArray(arrayLike: {
  [index: number]: any;
  length: number;
}): any[] {
  const { length } = arrayLike;
  const array = new Array(length);

  for (let index = 0; index < length; index++) {
    array[index] = arrayLike[index];
  }

  return array;
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
export function getCustomOptions(options: MicroMemoize.Options) {
  const customOptions: { [key: string]: any } = {};

  for (const key in options) {
    if (!DEFAULT_OPTIONS_KEYS[key]) {
      // @ts-ignore
      customOptions[key] = options[key];
    }
  }

  return customOptions;
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
