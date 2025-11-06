import type {
  AnyFn,
  CacheModifiedHandler,
  CacheSnapshot,
  Key,
  KeyIndexGetter,
  MatchingKeyComparator,
  Memoized,
  NormalizedOptions,
  RawKey,
  Value,
} from '../index.d';

// utils
import { cloneArray } from './utils';

export class Cache<Fn extends AnyFn> {
  readonly canTransformKey: boolean;
  readonly getKeyIndex: KeyIndexGetter;
  readonly options: NormalizedOptions<Fn>;
  readonly shouldCloneArguments: boolean;
  readonly shouldUpdateOnAdd: boolean;
  readonly shouldUpdateOnChange: boolean;
  readonly shouldUpdateOnHit: boolean;

  /**
   * The prevents call arguments which have cached results.
   */
  keys: Key[];
  /**
   * The results of previous cached calls.
   */
  values: Value[];

  constructor(options: NormalizedOptions<Fn>) {
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

  /**
   * The number of cached [key,value] results.
   */
  get size(): number {
    return this.keys.length;
  }

  /**
   * A copy of the cache at a moment in time. This is useful
   * to compare changes over time, since the cache mutates
   * internally for performance reasons.
   */
  get snapshot(): CacheSnapshot {
    return {
      keys: cloneArray(this.keys),
      size: this.size,
      values: cloneArray(this.values),
    };
  }

  /**
   * Gets the matching key index when a custom key matcher is used.
   */
  _getKeyIndexFromMatchingKey(keyToMatch: RawKey) {
    const { isMatchingKey, maxSize } = this.options as {
      isMatchingKey: MatchingKeyComparator;
      maxSize: number;
    };

    const { keys } = this;
    const keysLength = keys.length;

    if (!keysLength) {
      return -1;
    }

    if (isMatchingKey(keys[0]!, keyToMatch)) {
      return 0;
    }

    if (maxSize > 1) {
      for (let index = 1; index < keysLength; index++) {
        if (isMatchingKey(keys[index]!, keyToMatch)) {
          return index;
        }
      }
    }

    return -1;
  }

  /**
   * Gets the matching key index when multiple keys are used.
   */
  _getKeyIndexForMany(keyToMatch: RawKey) {
    const { isEqual } = this.options;

    const { keys } = this;
    const keysLength = keys.length;

    if (!keysLength) {
      return -1;
    }

    if (keysLength === 1) {
      return this._getKeyIndexForSingle(keyToMatch);
    }

    const keyLength = keyToMatch.length;

    let existingKey;
    let argIndex;

    if (keyLength > 1) {
      for (let index = 0; index < keysLength; index++) {
        existingKey = keys[index]!;

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
    } else {
      for (let index = 0; index < keysLength; index++) {
        existingKey = keys[index]!;

        if (
          existingKey.length === keyLength &&
          isEqual(existingKey[0], keyToMatch[0])
        ) {
          return index;
        }
      }
    }

    return -1;
  }

  /**
   * Gets the matching key index when a single key is used.
   */
  _getKeyIndexForSingle(keyToMatch: RawKey) {
    const { keys } = this;

    if (!keys.length) {
      return -1;
    }

    const existingKey = keys[0]!;
    const { length } = existingKey;

    if (keyToMatch.length !== length) {
      return -1;
    }

    const { isEqual } = this.options;

    if (length > 1) {
      for (let index = 0; index < length; index++) {
        if (!isEqual(existingKey[index], keyToMatch[index])) {
          return -1;
        }
      }

      return 0;
    }

    return isEqual(existingKey[0], keyToMatch[0]) ? 0 : -1;
  }

  /**
   * Order the array based on a Least-Recently-Used basis.
   */
  orderByLru(key: Key, value: Value, startingIndex: number) {
    const { keys } = this;
    const { values } = this;

    const currentLength = keys.length;

    let index = startingIndex;

    while (index--) {
      keys[index + 1] = keys[index]!;
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
   * Update the promise method to auto-remove from cache if rejected, and
   * if resolved then fire cache hit / changed.
   */
  updateAsyncCache(memoized: Memoized<Fn>) {
    const { onCacheChange, onCacheHit } = this.options as {
      onCacheChange: CacheModifiedHandler<Fn>;
      onCacheHit: CacheModifiedHandler<Fn>;
    };

    const [firstKey] = this.keys;
    const [firstValue] = this.values;

    this.values[0] = firstValue.then(
      (value: any) => {
        if (this.shouldUpdateOnHit) {
          onCacheHit(this, this.options, memoized);
        }

        if (this.shouldUpdateOnChange) {
          onCacheChange(this, this.options, memoized);
        }

        return value;
      },
      (error: Error) => {
        const keyIndex = this.getKeyIndex(firstKey!);

        if (keyIndex !== -1) {
          this.keys.splice(keyIndex, 1);
          this.values.splice(keyIndex, 1);
        }

        throw error;
      },
    );
  }
}
