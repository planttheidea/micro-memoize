import type { Cache } from './Cache.js';
import type { CacheEventEmitter } from './CacheEventEmitter.js';
import type { ExpirationManager } from './expires.js';
import type { StatsManager } from './stats.js';

export type { Cache, CacheEventEmitter };

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
  n: CacheNode<Fn> | undefined;
  p: CacheNode<Fn> | undefined;
  k: Key;
  v: ReturnType<Fn>;
}

/**
 * The type of cache event fired.
 */
export type CacheEventType = 'add' | 'delete' | 'hit' | 'update';

interface CacheEventBase<Fn extends (...args: any[]) => any> {
  cache: Cache<Fn>;
  key: Key;
  reason?: string;
  value: ReturnType<Fn>;
  type: CacheEventType;
}

/**
 * Cache event fired when a new entry is added.
 */
export interface OnAddEvent<Fn extends (...args: any[]) => any> extends CacheEventBase<Fn> {
  type: 'add';
}

/**
 * Cache event fired when an existing entry is deleted.
 */
export interface OnDeleteEvent<Fn extends (...args: any[]) => any> extends CacheEventBase<Fn> {
  type: 'delete';
}

/**
 * Cache event fired when the topmost entry in cache is retrieved.
 */
export interface OnHitEvent<Fn extends (...args: any[]) => any> extends CacheEventBase<Fn> {
  type: 'hit';
}

/**
 * Cache event fired when an existing entry in cache is updated. This
 * can be either updating the recency of an older entry in cache or
 * the resolution / rejection of an async entry.
 */
export interface OnUpdateEvent<Fn extends (...args: any[]) => any> extends CacheEventBase<Fn> {
  type: 'update';
}

/**
 * Cache event fired when a cache change occurs.
 */
export type CacheEvent<Type extends CacheEventType, Fn extends (...args: any[]) => any> = Type extends 'add'
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
export type CacheEventListener<Type extends CacheEventType, Fn extends (...args: any[]) => any> = (
  event: CacheEvent<Type, Fn>,
) => void;

/**
 * Method use to trigger a forced update of cache.
 */
export type ForceUpdate<Fn extends (...args: any[]) => any> = (args: Parameters<Fn>) => boolean;
/**
 * Method to retrieve the expiration duration in milliseconds based on
 * the values in cache.
 */
export type GetExpires<Fn extends (...args: any[]) => any> = (
  key: Key,
  value: ReturnType<Fn>,
  cache: Cache<Fn>,
) => number;
/**
 * Method to determine if two complete keys are equal.
 */
export type IsKeyEqual = (cachedKey: Key, nextKey: Key) => boolean;
/**
 * Method to determine if individual key items are equal.
 */
export type IsKeyItemEqual = (cachedKeyItem: Arg, nextKeyItem: Arg, index: number) => boolean;
/**
 * Method to serialize the key into a stringified key.
 */
export type Serializer = (key: Key) => [string];
/**
 * Method to determine whether the cache entry should not expire.
 */
export type ShouldPersist<Fn extends (...args: any[]) => any> = (
  key: Key,
  value: ReturnType<Fn>,
  cache: Cache<Fn>,
) => boolean;
/**
 * Method to determine whether the cache entry should be removed on expire, or
 * start a new expiration period.
 */
export type ShouldRemoveOnExpire<Fn extends (...args: any[]) => any> = (
  key: Key,
  value: ReturnType<Fn>,
  time: number,
  cache: Cache<Fn>,
) => boolean;
/**
 * Method to transform the arguments passed into a custom key format.
 */
export type TransformKey<Fn extends (...args: any[]) => any> = (args: Parameters<Fn>) => Key;

/**
 * Advanced configuration for the `expires` option.
 */
export interface ExpiresConfig<Fn extends (...args: any[]) => any> {
  /**
   * The amount of time before the cache entry is automatically removed.
   */
  after: number | GetExpires<Fn>;
  /**
   * Determine whether the cache entry should never expire.
   */
  shouldPersist?: ShouldPersist<Fn>;
  /**
   * Determine whether the cache entry should be removed upon expiration.
   * If `false` is returned, a new expiration is generated (not persistent).
   */
  shouldRemove?: ShouldRemoveOnExpire<Fn>;
  /**
   * Whether the cache entry expiration should be reset upon being hit.
   */
  update?: boolean;
}

/**
 * Statistics object for a specific `statsName` profile.
 */
export interface ProfileStats {
  calls: number;
  hits: number;
  name: string;
  usage: string;
}

/**
 * Statistics for all possible profiles who have stats collected.
 */
export interface GlobalStats {
  calls: number;
  hits: number;
  profiles: Record<string, ProfileStats>;
  usage: string;
}

interface OptionsBase<Fn extends (...args: any[]) => any> {
  /**
   * Whether the result of calling the function is a promise. This
   * will automatically remove the entry from cache if the promise is
   * rejected to avoid caching error states.
   */
  async?: boolean;
  /**
   * Whether the entry in cache should automatically remove itself
   * after a period of time.
   */
  expires?: number | GetExpires<Fn> | ExpiresConfig<Fn>;
  /**
   * Method to determine whether to bypass the cache to force an update
   * of the underlying entry based on new results.
   *
   * This should only be necessary if the memoized function is not
   * deterministic due to side-effects.
   */
  forceUpdate?: ForceUpdate<Fn>;
  /**
   * Whether the two keys are equal in value. This is used to compare
   * the key the function is called with against a given cache key to
   * determine whether the cached entry can be used.
   *
   * @note
   * If provided, the `isKeyItemEqual` option will be ignored.
   */
  isKeyEqual?: IsKeyEqual;
  /**
   * Whether the two args are equal in value. This is used to compare
   * specific arguments in order for a cached key versus the key the
   * function is called with to determine whether the cached entry
   * can be used.
   *
   * @default `Object.is`
   *
   * @note
   * This option will be ignored if the `isKeyEqual` option is provided.
   */
  isKeyItemEqual?: 'deep' | 'shallow' | IsKeyItemEqual;
  /**
   * The maximum number of args to consider for caching.
   */
  maxArgs?: number;
  /**
   * The maximum number of entries to store in cache.
   * @default 1
   */
  maxSize?: number;
  /**
   * Whether to serialize the arguments into a string value for cache
   * purposes. A custom serializer can also be provided, if the default
   * one is insufficient.
   *
   * This can potentially be faster than `isKeyItemEqual: 'deep'` in rare
   * cases, but can also be used to provide a deep equal check that handles
   * circular references.
   */
  serialize?: boolean | Serializer;
  /**
   * The name to give this method when recording profiling stats.
   */
  statsName?: string;
  /**
   * Transform the parameters passed into a custom key for storage in
   * cache.
   */
  transformKey?: TransformKey<Fn>;
}

export interface OptionsNoCustomEqual<Fn extends (...args: any[]) => any> extends OptionsBase<Fn> {
  isKeyEqual?: never;
  isKeyItemEqual?: never;
}

export interface OptionsKeyEqual<Fn extends (...args: any[]) => any> extends OptionsBase<Fn> {
  isKeyEqual: IsKeyEqual;
  isKeyItemEqual?: never;
}

export interface OptionsKeyItemEqual<Fn extends (...args: any[]) => any> extends OptionsBase<Fn> {
  isKeyEqual?: never;
  isKeyItemEqual?: 'deep' | 'shallow' | IsKeyItemEqual;
}

/**
 * Configuration options to drive how entries are stored, checked for cache breakage,
 * and evicted from cache.
 */
export type Options<Fn extends (...args: any[]) => any> =
  | OptionsNoCustomEqual<Fn>
  | OptionsKeyEqual<Fn>
  | OptionsKeyItemEqual<Fn>;

/**
 * [key, value] pair for a given entry in cache.
 */
export type CacheEntry<Fn extends (...args: any[]) => any> = [Key, ReturnType<Fn>];

/**
 * Snapshot of the current cache state as a set of [key, value] entries.
 */
export interface CacheSnapshot<Fn extends (...args: any[]) => any> {
  entries: Array<CacheEntry<Fn>>;
  keys: Key[];
  size: number;
  values: Array<ReturnType<Fn>>;
}

/**
 * Method that has been memoized via `micro-memoize`.
 */
export interface Memoized<Fn extends (...args: any[]) => any, Opts extends Options<Fn>> {
  (...args: Parameters<Fn>): ReturnType<Fn>;

  /**
   * The cache used for the memoized method.
   */
  cache: Cache<Fn>;
  /**
   * Manager for the expirations cache. This is only populated when
   * `options.expires` is set.
   */
  expirationManager: ExpirationManager<Fn> | undefined;
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
  /**
   * Manager for the stats cache. This is only populated when `options.statsName`
   * is set.
   */
  statsManager: StatsManager<Fn> | undefined;
}

export interface Memoize {
  <Fn extends Memoized<(...args: any[]) => any, Options<(...args: any[]) => any>>>(fn: Fn): Memoized<Fn, Fn['options']>;
  <Fn extends Memoized<(...args: any[]) => any, Options<(...args: any[]) => any>>, Opts extends Options<Fn['fn']>>(
    fn: Fn,
    passedOptions: Opts,
  ): Memoized<Fn['fn'], Fn['options'] & Opts>;

  <Fn extends (...args: any[]) => any>(fn: Fn): Memoized<Fn, {}>;
  <Fn extends (...args: any[]) => any, Opts extends Options<Fn>>(fn: Fn, passedOptions: Opts): Memoized<Fn, Opts>;
}
