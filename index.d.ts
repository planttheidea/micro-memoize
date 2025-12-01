type ListenerMap<Fn extends (...args: any[]) => any> = Partial<
  Record<string, Set<CacheEventListener<CacheEventType, Fn>>>
>;
declare class CacheEventEmitter<Fn extends (...args: any[]) => any> {
  /**
   * The list of [l]isteners for the given [t]ype.
   */
  l: ListenerMap<Fn>;
  /**
   * The [c]ache the emitter is associated with.
   */
  private c;
  constructor(cache: Cache<Fn>);
  /**
   * Method to [a]dd a listener for the given cache change event.
   */
  a<Type extends CacheEventType>(type: Type, listener: CacheEventListener<Type, Fn>): void;
  /**
   * Method to [n]otify all listeners for the given cache change event.
   */
  n(type: CacheEventType, node: CacheNode<Fn>, reason?: string): void;
  /**
   * Method to [r]emove a listener for the given cache change event.
   */
  r<Type extends CacheEventType>(type: Type, listener: CacheEventListener<Type, Fn>): void;
}

declare class Cache<Fn extends (...args: any[]) => any> {
  /**
   * The current [c]ount of entries in the cache.
   */
  c: number;
  /**
   * Whether the entire key is [e]qual to an existing key in cache.
   */
  e: IsKeyEqual;
  /**
   * The [h]ead of the cache linked list.
   */
  h: CacheNode<Fn> | undefined;
  /**
   * The transformer for the [k]ey stored in cache.
   */
  k: Options<Fn>['transformKey'] | undefined;
  /**
   * Event emitter for `[o]`n events.
   */
  o: CacheEventEmitter<Fn> | undefined;
  /**
   * Whether to await the [p]romise returned by the function.
   */
  p: Options<Fn>['async'];
  /**
   * The maximum [s]ize of the cache.
   */
  s: number;
  /**
   * The [t]ail of the cache linked list.
   */
  t: CacheNode<Fn> | undefined;
  constructor(options: Options<Fn>);
  /**
   * The size of the populated cache.
   */
  get size(): number;
  /**
   * The [key, value] pairs for the existing entries in cache.
   */
  get snapshot(): CacheSnapshot<Fn>;
  /**
   * Clear the cache.
   */
  clear(reason?: string): void;
  /**
   * Delete the entry for the key based on the given `args` in cache.
   */
  delete(args: Parameters<Fn>, reason?: string): boolean;
  /**
   * Get the value in cache based on the given `args`.
   */
  get(args: Parameters<Fn>, reason?: string): ReturnType<Fn> | undefined;
  /**
   * Determine whether the given `args` have a related entry in the cache.
   */
  has(args: Parameters<Fn>): boolean;
  /**
   * Remove the given `listener` for the given `type` of cache event.
   */
  off<Type extends CacheEventType>(type: Type, listener: CacheEventListener<Type, Fn>): void;
  /**
   * Add the given `listener` for the given `type` of cache event.
   */
  on<Type extends CacheEventType>(type: Type, listener: CacheEventListener<Type, Fn>): void;
  /**
   * Add or update the cache entry for the given `key`.
   */
  set(key: Parameters<Fn>, value: ReturnType<Fn>, reason?: string): void;
  /**
   * Method to [d]elete the given `node` from the cache.
   */
  d(node: CacheNode<Fn>, reason: string): void;
  /**
   * Method to [g]et an existing node from cache based on the given `key`.
   */
  g(key: Key): CacheNode<Fn> | undefined;
  /**
   * Method to create a new [n]ode and set it at the head of the linked list.
   */
  n(key: Key, value: ReturnType<Fn>, reason?: string): CacheNode<Fn>;
  /**
   * Method to [u]date the location of the given `node` in cache.
   */
  u(node: CacheNode<Fn>, reason: string | undefined, hit: boolean): void;
  /**
   * Method to [w]rap the promise in a handler to automatically delete the
   * entry if it rejects.
   */
  w(node: CacheNode<Fn>): ReturnType<Fn>;
}

declare class ExpirationManager<Fn extends (...args: any[]) => any> {
  /**
   * The [c]ache being monitored.
   */
  c: Cache<Fn>;
  /**
   * Map of [e]xpiration timeouts.
   */
  e: Map<Key, NodeJS.Timeout>;
  /**
   * Whether the entry in cache should [p]ersist, and therefore not
   * have any expiration.
   */
  p: ShouldPersist<Fn> | undefined;
  /**
   * Whether the entry in cache should be [r]emoved on expiration.
   */
  r: ShouldRemoveOnExpire<Fn> | undefined;
  /**
   * The [t]ime to wait before expiring, or a method that determines that time.
   */
  t: number | GetExpires<Fn>;
  /**
   * Whether the expiration should [u]pdate when the cache entry is hit.
   */
  u: boolean;
  constructor(cache: Cache<Fn>, expires: Required<Options<Fn>>['expires']);
  get size(): number;
  /**
   * Whether the cache expiration should be set [a]gain, generally after some cache change.
   */
  a(key: Key, value: ReturnType<Fn>): boolean;
  /**
   * Method to [d]elete the expiration.
   */
  d(key: Key): void;
  /**
   * Method to [s]et the new expiration. If one is present for the given `key`, it will delete
   * the existing expiration before creating the new one.
   */
  s(key: Key, value: ReturnType<Fn>): void;
}

interface ProfileCounts {
  c: number;
  h: number;
}
declare class StatsManager<Fn extends (...args: any[]) => any> {
  /**
   * The [c]ache listened to when collecting counts.
   */
  c: Cache<Fn>;
  /**
   * Method to [d]elete existing cache listeners.
   */
  d: (() => void) | undefined;
  /**
   * The [n]ame of the profile to manage in stats.
   */
  n: string;
  /**
   * The counts for the stats [p]rofile.
   */
  p: ProfileCounts;
  constructor(cache: Cache<Fn>, statsName: string);
  /**
   * Method to compute the [m]etrics for the profile stats.
   */
  m(): ProfileStats;
  /**
   * Method to [r]eset the counts.
   */
  r(): void;
  /**
   * Method to [s]tart the collection of stats for the given profile.
   */
  s(): void;
}
/**
 * Clear all existing stats stored, either of the specific profile whose name is passed,
 * or globally if no name is passed.
 */
declare function clearStats(statsName?: string): void;
/**
 * Get the stats of a given profile, or global stats if no `statsName` is given.
 */
declare function getStats<Name extends string | undefined>(
  statsName?: Name,
): undefined extends Name ? GlobalStats | undefined : ProfileStats | undefined;
/**
 * Whether stats are currently being collected.
 */
declare function isCollectingStats(): boolean;
/**
 * Start collecting stats.
 */
declare function startCollectingStats(): void;
/**
 * Stop collecting stats.
 */
declare function stopCollectingStats(): void;

/**
 * Key used for cache entries.
 */
type Key = any[];
/**
 * A single argument in a cache key.
 */
type Arg = Key[number];
/**
 * The internal cache node used in the cache's linked list.
 */
interface CacheNode<Fn extends (...args: any[]) => any> {
  /**
   * The [n]ext node in the cache order.
   */
  n: CacheNode<Fn> | undefined;
  /**
   * The [p]revious node in the cache order.
   */
  p: CacheNode<Fn> | undefined;
  /**
   * If present, the node has been [r]emovd from cache.
   */
  r?: true;
  /**
   * The [k]ey for the given node in cache.
   */
  k: Key;
  /**
   * The cached [v]alue returned from the function call.
   */
  v: ReturnType<Fn>;
}
/**
 * The type of cache event fired.
 */
type CacheEventType = 'add' | 'delete' | 'hit' | 'update';
interface CacheEventBase<Fn extends (...args: any[]) => any> {
  /**
   * The cache associated with the given memoized function.
   */
  cache: Cache<Fn>;
  /**
   * The key of the affected node.
   */
  key: Key;
  /**
   * The reason (if any) the operation was performed on the node.
   */
  reason?: string;
  /**
   * The value of the affected node.
   */
  value: ReturnType<Fn>;
  /**
   * The type of operation performed on the node.
   */
  type: CacheEventType;
}
/**
 * Cache event fired when a new entry is added.
 */
interface OnAddEvent<Fn extends (...args: any[]) => any> extends CacheEventBase<Fn> {
  type: 'add';
}
/**
 * Cache event fired when an existing entry is deleted.
 */
interface OnDeleteEvent<Fn extends (...args: any[]) => any> extends CacheEventBase<Fn> {
  type: 'delete';
}
/**
 * Cache event fired when the topmost entry in cache is retrieved.
 */
interface OnHitEvent<Fn extends (...args: any[]) => any> extends CacheEventBase<Fn> {
  type: 'hit';
}
/**
 * Cache event fired when an existing entry in cache is updated. This
 * can be either updating the recency of an older entry in cache or
 * the resolution / rejection of an async entry.
 */
interface OnUpdateEvent<Fn extends (...args: any[]) => any> extends CacheEventBase<Fn> {
  type: 'update';
}
/**
 * Cache event fired when a cache change occurs.
 */
type CacheEvent<Type extends CacheEventType, Fn extends (...args: any[]) => any> = Type extends 'add'
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
type CacheEventListener<Type extends CacheEventType, Fn extends (...args: any[]) => any> = (
  event: CacheEvent<Type, Fn>,
) => void;
/**
 * Method use to trigger a forced update of cache.
 */
type ForceUpdate<Fn extends (...args: any[]) => any> = (args: Parameters<Fn>) => boolean;
/**
 * Method to retrieve the expiration duration in milliseconds based on
 * the values in cache.
 */
type GetExpires<Fn extends (...args: any[]) => any> = (key: Key, value: ReturnType<Fn>, cache: Cache<Fn>) => number;
/**
 * Method to determine if two complete keys are equal.
 */
type IsKeyEqual = (cachedKey: Key, nextKey: Key) => boolean;
/**
 * Method to determine if individual key items are equal.
 */
type IsKeyItemEqual = (cachedKeyItem: Arg, nextKeyItem: Arg, index: number) => boolean;
/**
 * Method to serialize the key into a stringified key.
 */
type Serializer = (key: Key) => [string];
/**
 * Method to determine whether the cache entry should not expire.
 */
type ShouldPersist<Fn extends (...args: any[]) => any> = (key: Key, value: ReturnType<Fn>, cache: Cache<Fn>) => boolean;
/**
 * Method to determine whether the cache entry should be removed on expire, or
 * start a new expiration period.
 */
type ShouldRemoveOnExpire<Fn extends (...args: any[]) => any> = (
  key: Key,
  value: ReturnType<Fn>,
  time: number,
  cache: Cache<Fn>,
) => boolean;
/**
 * Method to transform the arguments passed into a custom key format.
 */
type TransformKey<Fn extends (...args: any[]) => any> = (args: Parameters<Fn>) => Key;
/**
 * Advanced configuration for the `expires` option.
 */
interface ExpiresConfig<Fn extends (...args: any[]) => any> {
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
interface ProfileStats {
  calls: number;
  hits: number;
  name: string;
  usage: string;
}
/**
 * Statistics for all possible profiles who have stats collected.
 */
interface GlobalStats {
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
interface OptionsNoCustomEqual<Fn extends (...args: any[]) => any> extends OptionsBase<Fn> {
  isKeyEqual?: never;
  isKeyItemEqual?: never;
}
interface OptionsKeyEqual<Fn extends (...args: any[]) => any> extends OptionsBase<Fn> {
  isKeyEqual: IsKeyEqual;
  isKeyItemEqual?: never;
}
interface OptionsKeyItemEqual<Fn extends (...args: any[]) => any> extends OptionsBase<Fn> {
  isKeyEqual?: never;
  isKeyItemEqual?: 'deep' | 'shallow' | IsKeyItemEqual;
}
/**
 * Configuration options to drive how entries are stored, checked for cache breakage,
 * and evicted from cache.
 */
type Options<Fn extends (...args: any[]) => any> =
  | OptionsNoCustomEqual<Fn>
  | OptionsKeyEqual<Fn>
  | OptionsKeyItemEqual<Fn>;
/**
 * [key, value] pair for a given entry in cache.
 */
type CacheEntry<Fn extends (...args: any[]) => any> = [Key, ReturnType<Fn>];
/**
 * Snapshot of the current cache state as a set of [key, value] entries.
 */
interface CacheSnapshot<Fn extends (...args: any[]) => any> {
  entries: Array<CacheEntry<Fn>>;
  keys: Key[];
  size: number;
  values: Array<ReturnType<Fn>>;
}
/**
 * Method that has been memoized via `micro-memoize`.
 */
type Memoized<Fn extends (...args: any[]) => any, Opts extends Options<Fn>> = Fn & {
  /**
   * The cache used for the memoized method.
   */
  cache: Cache<Fn>;
  /**
   * Manager for the expirations cache. This is only populated when
   * `options.expires` is set.
   */
  expirationManager: ExpirationManager<Fn> | null;
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
  statsManager: StatsManager<Fn> | null;
};
interface Memoize {
  <Fn extends Memoized<(...args: any[]) => any, Options<(...args: any[]) => any>>>(fn: Fn): Memoized<Fn, Fn['options']>;
  <Fn extends Memoized<(...args: any[]) => any, Options<(...args: any[]) => any>>, Opts extends Options<Fn['fn']>>(
    fn: Fn,
    passedOptions: Opts,
  ): Memoized<Fn['fn'], Fn['options'] & Opts>;
  <Fn extends (...args: any[]) => any>(fn: Fn): Memoized<Fn, {}>;
  <Fn extends (...args: any[]) => any, Opts extends Options<Fn>>(fn: Fn, passedOptions: Opts): Memoized<Fn, Opts>;
}

declare const memoize: Memoize;

export {
  Cache,
  CacheEventEmitter,
  clearStats,
  getStats,
  isCollectingStats,
  memoize,
  startCollectingStats,
  stopCollectingStats,
};
export type {
  Arg,
  CacheEntry,
  CacheEvent,
  CacheEventListener,
  CacheEventType,
  CacheNode,
  CacheSnapshot,
  ExpiresConfig,
  ForceUpdate,
  GetExpires,
  GlobalStats,
  IsKeyEqual,
  IsKeyItemEqual,
  Key,
  Memoize,
  Memoized,
  OnAddEvent,
  OnDeleteEvent,
  OnHitEvent,
  OnUpdateEvent,
  Options,
  OptionsKeyEqual,
  OptionsKeyItemEqual,
  OptionsNoCustomEqual,
  ProfileStats,
  Serializer,
  ShouldPersist,
  ShouldRemoveOnExpire,
  TransformKey,
};
