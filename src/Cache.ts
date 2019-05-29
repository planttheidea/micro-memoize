import { MicroMemoize } from './types';

// utils
import { slice } from './utils';

export class Cache {
  readonly canTransformKey: boolean;

  readonly getKeyIndex: MicroMemoize.KeyIndexGetter;

  readonly options: MicroMemoize.Options;

  readonly shouldCloneArguments: boolean;

  readonly shouldUpdateOnAdd: boolean;

  readonly shouldUpdateOnChange: boolean;

  readonly shouldUpdateOnHit: boolean;

  keys: MicroMemoize.Key[];

  values: MicroMemoize.Value[];

  constructor(options: MicroMemoize.Options) {
    this.keys = [];
    this.values = [];
    this.options = options;

    const isMatchingKeyFunction = typeof options.isMatchingKey === 'function';

    if (isMatchingKeyFunction) {
      this.getKeyIndex = this._getKeyIndexFromMatchingKey;
    } else if (options.maxSize > 1) {
      this.getKeyIndex = this._getKeyIndexForMany;
    } else {
      this.getKeyIndex = this._getKeyIndexForSingle;
    }

    this.canTransformKey = typeof options.transformKey === 'function';
    this.shouldCloneArguments = this.canTransformKey || isMatchingKeyFunction;

    this.shouldUpdateOnAdd = typeof options.onCacheAdd === 'function';
    this.shouldUpdateOnChange = typeof options.onCacheChange === 'function';
    this.shouldUpdateOnHit = typeof options.onCacheHit === 'function';
  }

  get size() {
    return this.keys.length;
  }

  get snapshot() {
    return {
      keys: slice(this.keys, 0),
      size: this.size,
      values: slice(this.values, 0),
    };
  }

  /**
   * @function _getKeyIndexFromMatchingKey
   *
   * @description
   * gets the matching key index when a custom key matcher is used
   *
   * @param keyToMatch the key to match
   * @returns the index of the matching key, or -1
   */
  _getKeyIndexFromMatchingKey(keyToMatch: MicroMemoize.Key) {
    const { isMatchingKey, maxSize } = this.options;

    const { keys } = this;

    if (isMatchingKey(keys[0], keyToMatch)) {
      return 0;
    }

    if (maxSize > 1) {
      const keysLength = keys.length;

      for (let index = 1; index < keysLength; index++) {
        if (isMatchingKey(keys[index], keyToMatch)) {
          return index;
        }
      }
    }

    return -1;
  }

  /**
   * @function _getKeyIndexForMany
   *
   * @description
   * gets the matching key index when multiple keys are used
   *
   * @param keyToMatch the key to match
   * @returns the index of the matching key, or -1
   */
  _getKeyIndexForMany(keyToMatch: MicroMemoize.Key) {
    const { isEqual } = this.options;

    const { keys } = this;
    const keysLength = keys.length;

    const keyLength = keyToMatch.length;

    let existingKey;
    let argIndex;

    for (let index = 0; index < keysLength; index++) {
      existingKey = keys[index];

      if (existingKey.length === keyLength) {
        argIndex = 0;

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
  }

  /**
   * @function _getKeyIndexForSingle
   *
   * @description
   * gets the matching key index when a single key is used
   *
   * @param keyToMatch the key to match
   * @returns the index of the matching key, or -1
   */
  _getKeyIndexForSingle(keyToMatch: MicroMemoize.Key) {
    const existingKey = this.keys[0];
    const keyLength = existingKey.length;

    if (keyToMatch.length !== keyLength) {
      return -1;
    }

    const { isEqual } = this.options;

    for (let index = 0; index < keyLength; index++) {
      if (!isEqual(existingKey[index], keyToMatch[index])) {
        return -1;
      }
    }

    return 0;
  }

  /**
   * @function orderByLru
   *
   * @description
   * order the array based on a Least-Recently-Used basis
   *
   * @param key the new key to move to the front
   * @param value the new value to move to the front
   * @param startingIndex the index of the item to move to the front
   */
  orderByLru(key: MicroMemoize.Key, value: MicroMemoize.Value, startingIndex: number) {
    const { keys } = this;
    const { values } = this;

    const currentLength = keys.length;

    let index = startingIndex;

    while (index--) {
      keys[index + 1] = keys[index];
      values[index + 1] = values[index];
    }

    keys[0] = key;
    values[0] = value;

    const { maxSize } = this.options;

    if (currentLength === maxSize && startingIndex === currentLength) {
      keys.pop();
      values.pop();
    } else if (startingIndex >= maxSize) {
      // eslint-disable-next-line no-multi-assign
      keys.length = values.length = maxSize;
    }
  }

  /**
   * @function updateAsyncCache
   *
   * @description
   * update the promise method to auto-remove from cache if rejected, and
   * if resolved then fire cache hit / changed
   *
   * @param memoized the memoized function
   */
  updateAsyncCache(memoized: MicroMemoize.Memoized<Function>) {
    const { onCacheChange, onCacheHit } = this.options;

    const [firstKey] = this.keys;
    const [firstValue] = this.values;

    this.values[0] = firstValue
      .then((value: any) => {
        if (this.shouldUpdateOnHit) {
          onCacheHit(this, this.options, memoized);
        }

        if (this.shouldUpdateOnChange) {
          onCacheChange(this, this.options, memoized);
        }

        return value;
      })
      .catch((error: Error) => {
        const keyIndex = this.getKeyIndex(firstKey);

        if (keyIndex !== -1) {
          this.keys.splice(keyIndex, 1);
          this.values.splice(keyIndex, 1);
        }

        throw error;
      });
  }
}
