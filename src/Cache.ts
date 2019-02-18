class Cache implements MicroMemoize.Cache {
  keys: MicroMemoize.Keys;
  values: MicroMemoize.Values;

  getKeyIndex: (key: MicroMemoize.RawKey) => number;
  options: MicroMemoize.Options;

  constructor(options: MicroMemoize.Options) {
    this.keys = [];
    this.values = [];

    this.options = options;

    this.getKeyIndex =
      typeof options.isMatchingKey === 'function'
        ? this._getKeyIndexByMatchingKey
        : options.maxSize > 1
        ? this._getKeyIndexForMultipleCache
        : this._getKeyIndexForSingleCache;
  }

  get size() {
    return this.keys.length;
  }

  _getKeyIndexByMatchingKey(key: MicroMemoize.RawKey) {
    if (this.options.isMatchingKey(this.keys[0], key)) {
      return 0;
    }

    if (this.options.maxSize > 1) {
      const { keys } = this;
      const { isMatchingKey } = this.options;

      const keysLength = keys.length;

      for (let index = 1; index < keysLength; index++) {
        if (isMatchingKey(keys[index], key)) {
          return index;
        }
      }
    }

    return -1;
  }

  _getKeyIndexForMultipleCache(key: MicroMemoize.RawKey) {
    const { keys, size } = this;
    const { isEqual } = this.options;

    const keyLength = key.length;

    let existingKey;

    for (let index = 0; index < size; index++) {
      existingKey = keys[index];

      if (existingKey.length === keyLength) {
        let argIndex = 0;

        for (; argIndex < keyLength; argIndex++) {
          if (!isEqual(existingKey[argIndex], key[argIndex])) {
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

  _getKeyIndexForSingleCache(key: MicroMemoize.RawKey) {
    const existingKey = this.keys[0];
    const keyLength = existingKey.length;

    if (key.length !== keyLength) {
      return -1;
    }

    const { isEqual } = this.options;

    for (let index = 0; index < keyLength; index++) {
      if (!isEqual(existingKey[index], key[index])) {
        return -1;
      }
    }

    return 0;
  }

  /**
   * @instance
   * @function updateAsync
   *
   * @description
   * update the promise method to auto-remove from cache if rejected, and
   * if resolved then fire cache hit / changed
   *
   * @param memoized the memoized function
   */
  _updateAsync(memoized: MicroMemoize.Memoized) {
    const key: any = this.keys[0];

    this.values[0] = this.values[0]
      .then((value: any) => {
        if (typeof this.options.onCacheHit === 'function') {
          this.options.onCacheHit(this, this.options, memoized);
        }

        if (typeof this.options.onCacheChange === 'function') {
          this.options.onCacheChange(this, this.options, memoized);
        }

        return value;
      })
      .catch((error: Error) => {
        const keyIndex = this.getKeyIndex(key);

        if (keyIndex !== -1) {
          this.keys.splice(keyIndex, 1);
          this.values.splice(keyIndex, 1);
        }

        throw error;
      });
  }

  /**
   * @instance
   * @function orderByLru
   *
   * @description
   * order the array based on a Least-Recently-Used basis
   *
   * @param key the new key to move to the front
   * @param value the new value to move to the front
   * @param startingIndex the index of the item to move to the front
   */
  orderByLru(key: MicroMemoize.Key, value: any, startingIndex: number) {
    const { keys, values } = this;
    const { maxSize } = this.options;

    let index = startingIndex;

    while (index--) {
      keys[index + 1] = keys[index];
      values[index + 1] = values[index];
    }

    keys[0] = key;
    values[0] = value;

    if (startingIndex >= maxSize) {
      keys.length = maxSize;
      values.length = maxSize;
    }
  }
}

export default Cache;
