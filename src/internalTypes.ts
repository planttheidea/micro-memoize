import type { Cache } from './Cache';

/**
 * Key used for cache entries.
 */
export type Key = any[];
/**
 * A single argument in a cache key.
 */
export type Arg = Key[number];

/**
 * The internal cache node used in the cache's linked list.
 */
export interface CacheNode<Fn extends (...args: any[]) => any> {
  n: CacheNode<Fn> | null;
  p: CacheNode<Fn> | null;
  k: Key;
  v: ReturnType<Fn>;
}

/**
 * A tuple representing a single entry in cache.
 */
export type CacheEntry<Fn extends (...args: any[]) => any> = [
  Key,
  ReturnType<Fn>,
];

/**
 * The type of cache event fired.
 */
export type CacheEventType = 'add' | 'delete' | 'hit' | 'update';

/**
 * The reason for the given cache event type (optional).
 */
export type CacheEventReason = 'evicted' | 'rejected' | 'resolved';

interface CacheEventBase<Fn extends (...args: any[]) => any> {
  cache: Cache<Fn>;
  entry: CacheEntry<Fn>;
  reason?: CacheEventReason;
  type: CacheEventType;
}

/**
 * Cache event fired when a new entry is added.
 */
export interface OnAddEvent<Fn extends (...args: any[]) => any>
  extends CacheEventBase<Fn> {
  reason?: undefined;
  type: 'add';
}

/**
 * Cache event fired when an existing entry is deleted.
 */
export interface OnDeleteEvent<Fn extends (...args: any[]) => any>
  extends CacheEventBase<Fn> {
  reason?: 'evicted' | 'rejected';
  type: 'delete';
}

/**
 * Cache event fired when the topmost entry in cache is retrieved.
 */
export interface OnHitEvent<Fn extends (...args: any[]) => any>
  extends CacheEventBase<Fn> {
  reason?: undefined;
  type: 'hit';
}

/**
 * Cache event fired when an existing entry in cache is updated. This
 * can be either updating the recency of an older entry in cache or
 * the resolution / rejection of an async entry.
 */
export interface OnUpdateEvent<Fn extends (...args: any[]) => any>
  extends CacheEventBase<Fn> {
  reason?: 'resolved';
  type: 'update';
}

/**
 * Cache event fired when a cache change occurs.
 */
export type CacheEvent<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
> = Type extends 'add'
  ? OnAddEvent<Fn>
  : Type extends 'delete'
  ? OnDeleteEvent<Fn>
  : Type extends 'hit'
  ? OnHitEvent<Fn>
  : Type extends 'update'
  ? OnUpdateEvent<Fn>
  : never;

/**
 * A listener for the given type of cache event.
 */
export type CacheEventListener<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
> = (event: CacheEvent<Type, Fn>) => void;

/**
 * Method that transforms the arguments passed to the function into
 * a custom cache key.
 */
export type KeyTransformer<Fn extends (...args: any[]) => any> = (
  args: Parameters<Fn>,
) => Key;

interface OptionsBase<Fn extends (...args: any[]) => any> {
  /**
   * Whether the result of calling the function is a promise. This
   * will automatically remove the entry from cache if the promise is
   * rejected to avoid caching error states.
   */
  async?: boolean;
  /**
   * The maximum number of entries to store in cache.
   * @default 1
   */
  maxSize?: number;
  /**
   * Whether the two args are equal in value. This is used to compare
   * specific arguments in order for a cached key versus the key the
   * function is called with to determine whether the cached entry
   * can be used.
   *
   * @default isSameValueZero
   *
   * @note
   * This option will be ignored if the `isKeyEqual` option is provided.
   */
  isArgEqual?: (cachedKeyArg: Arg, nextKeyArg: Arg) => boolean;
  /**
   * Whether the two keys are equal in value. This is used to compare
   * the key the function is called with against a given cache key to
   * determine whether the cached entry can be used.
   *
   * @default isShallowEqual
   *
   * @note
   * If provided, the `isArgEqual` option will be ignored.
   */
  isKeyEqual?: (cachedKey: Key, nextKey: Key) => boolean;
  /**
   * Transform the parameters passed into a custom key for storage in
   * cache.
   */
  transformKey?: KeyTransformer<Fn>;
}

export interface OptionsArgEqual<Fn extends (...args: any[]) => any> extends OptionsBase<Fn> {
  /**
   * Whether the two args are equal in value. This is used to compare
   * specific arguments in order for a cached key versus the key the
   * function is called with to determine whether the cached entry
   * can be used.
   *
   * @default isSameValueZero
   *
   * @note
   * This option will be ignored if the `isKeyEqual` option is provided.
   */
  isArgEqual?: (cachedKeyArg: Arg, nextKeyArg: Arg) => boolean;
  isKeyEqual?: never;
}

export interface OptionsKeyEqual<Fn extends (...args: any[]) => any> extends OptionsBase<Fn> {
  /**
   * Whether the two args are equal in value. This is used to compare
   * specific arguments in order for a cached key versus the key the
   * function is called with to determine whether the cached entry
   * can be used.
   *
   * @default isSameValueZero
   *
   * @note
   * This option will be ignored if the `isKeyEqual` option is provided.
   */
  isArgEqual?: never;
  isKeyEqual?: (cachedKey: Key, nextKey: Key) => boolean;
}

export type Options<Fn extends (...args: any[]) => any> = OptionsArgEqual<Fn> | OptionsKeyEqual<Fn>;

/**
 * Snapshot of the current cache state.
 */
export type CacheEntries<Fn extends (...args: any[]) => any> = Array<
  CacheEntry<Fn>
>;

export interface Memoized<
  Fn extends (...args: any[]) => any,
  Opts extends Options<Fn>,
> {
  (...args: Parameters<Fn>): ReturnType<Fn>;

  /**
   * The cache used for the memoized method.
   */
  cache: Cache<Fn>;
  /**
   * The original method that is memoized.
   */
  fn: Fn;
  /**
   * Simple identifier that the function has been memoized.
   */
  isMemoized: true;
  /**
   * Options passed for the memoized method.
   */
  options: Opts;
}

/**
 * The internal event emitter used by the cache to handle cache
 * change events.
 */
export interface EventEmitter<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
> {
  /**
   * The number of listeners active for the emitter.
   */
  s: number;

  /**
   * Add a listener for the given cache change event.
   */
  a(listener: CacheEventListener<Type, Fn>): void;
  /**
   * Notify all listeners for the given cache change event.
   */
  n(node: CacheNode<Fn>, reason?: CacheEventReason): void;
  /**
   * Remove a listener for the given cache change event.
   */
  r(listener: CacheEventListener<Type, Fn>): void;
}

export interface Memoize {
  <
    Fn extends Memoized<
      (...args: any[]) => any,
      Options<(...args: any[]) => any>
    >,
    Opts extends Options<Fn['fn']>,
  >(
    fn: Fn,
    passedOptions: Opts,
  ): Memoized<Fn['fn'], Fn['options'] & Opts>;
  <
    Fn extends Memoized<
      (...args: any[]) => any,
      Options<(...args: any[]) => any>
    >,
  >(
    fn: Fn,
  ): Memoized<Fn, Fn['options']>;
  <Fn extends (...args: any[]) => any, Opts extends Options<Fn>>(
    fn: Fn,
    passedOptions: Opts,
  ): Memoized<Fn, Opts>;
  // eslint-disable-next-line @typescript-eslint/ban-types
  <Fn extends (...args: any[]) => any>(fn: Fn): Memoized<Fn, {}>;
}
