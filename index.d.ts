export class Cache<Fn extends (...args: any[]) => any> {
  /**
   * The current [c]ount of entries in the cache.
   */
  c: number;
  /**
   * The [h]ead of the cache linked list.
   */
  h: CacheNode<Fn> | undefined;
  /**
   * Whether the individual key [i]tem passed is equal to the same argument in order
   * for a key in cache.
   */
  i: (a: Arg, b: Arg) => boolean;
  /**
   * The transformer for the [k]ey stored in cache.
   */
  k: TransformKey<Fn> | undefined;
  /**
   * Whether the entire key [m]atches an existing key in cache.
   */
  m: (a: Key, b: Key) => boolean;
  /**
   * Event emitter for `[o]`n events.
   */
  o: CacheEventEmitter<Fn> | undefined;
  /**
   * Whether to await the [p]romise returned by the function.
   */
  p: boolean;
  /**
   * The maximum [s]ize of the cache.
   */
  s: number;
  /**
   * The [t]ail of the cache linked list.
   */
  t: CacheNode<Fn> | undefined;

  /**
   * The [key, value] pairs for the existing entries in cache.
   */
  get snapshot(): CacheSnapshot<Fn>;

  /**
   * Clear the cache.
   */
  clear(reason?: string): void;

  /**
   * Delete the entry for the given `key` in cache.
   */
  delete(key: Parameters<Fn>, reason?: string): boolean;

  /**
   * Get the value in cache based on the given `key`.
   */
  get(key: Parameters<Fn>, reason?: string): ReturnType<Fn> | undefined;

  /**
   * Determine whether the given `key` has a related entry in the cache.
   */
  has(key: Parameters<Fn>): boolean;

  /**
   * Remove the given `listener` for the given `type` of cache event.
   */
  off<Type extends CacheEventType>(
    type: Type,
    listener: CacheEventListener<Type, Fn>,
  ): void;

  /**
   * Add the given `listener` for the given `type` of cache event.
   */
  on<Type extends CacheEventType>(
    type: Type,
    listener: CacheEventListener<Type, Fn>,
  ): void;

  /**
   * Add or update the cache entry for the given `key`.
   */
  set(
    key: Parameters<Fn>,
    value: ReturnType<Fn>,
    reason?: string,
  ): ReturnType<Fn>;

  /**
   * Method to [d]elete the given `node` from the cache.
   */
  d(node: CacheNode<Fn>): void;

  /**
   * Method to determine if the next key is [e]qual to an existing key in cache.
   */
  e(prevKey: Key, nextKey: Key): boolean;

  /**
   * Method to [g]et an existing node from cache based on the given `key`.
   */
  g(key: Key): CacheNode<Fn> | undefined;

  /**
   * Method to [g]et an existing node from cache based on the [t]ransformed `key`.
   */
  gt(key: Parameters<Fn>): CacheNode<Fn> | undefined;

  /**
   * Method to create a new [n]ode and set it at the head of the linked list.
   */
  n(key: Key, value: ReturnType<Fn>): CacheNode<Fn>;

  /**
   * Method to [u]date the location of the given `node` in cache.
   */
  u(node: CacheNode<Fn>): void;

  /**
   * Method to [w]rap the promise in a handler to automatically delete the
   * entry if it rejects.
   */
  w(node: CacheNode<Fn>): ReturnType<Fn>;
}

type ListenerMap<Fn extends (...args: any[]) => any> = Partial<
  Record<string, Array<CacheEventListener<CacheEventType, Fn>>>
>;

export class CacheEventEmitter<Fn extends (...args: any[]) => any> {
  /**
   * The [c]ache the emitter is associated with.
   */
  private c: Cache<Fn>;
  /**
   * The list of [l]isteners for the given [t]ype.
   */
  private l: ListenerMap<Fn>;

  /**
   * Expose the listeners for testing only.
   */
  get listeners(): ListenerMap<Fn>;

  /**
   * Method to [a]dd a listener for the given cache change event.
   */
  a<Type extends CacheEventType>(
    type: Type,
    listener: CacheEventListener<Type, Fn>,
  ): void;

  /**
   * Method to [n]otify all listeners for the given cache change event.
   */
  n(type: CacheEventType, node: CacheNode<Fn>, reason?: any): void;

  /**
   * Method to [r]emove a listener for the given cache change event.
   */
  r<Type extends CacheEventType>(
    type: Type,
    listener: CacheEventListener<Type, Fn>,
  ): void;
}

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

/**
 * The reason for the given cache event type (optional).
 */
export type CacheEventReason = 'evicted' | 'rejected' | 'resolved';

interface CacheEventBase<Fn extends (...args: any[]) => any> {
  cache: Cache<Fn>;
  key: Key;
  reason?: CacheEventReason;
  value: ReturnType<Fn>;
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
export type TransformKey<Fn extends (...args: any[]) => any> = (
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
   * Whether the two keys are equal in value. This is used to compare
   * the key the function is called with against a given cache key to
   * determine whether the cached entry can be used.
   *
   * @default isShallowEqual
   *
   * @note
   * If provided, the `isKeyItemEqual` option will be ignored.
   */
  isKeyEqual?: (cachedKey: Key, nextKey: Key) => boolean;
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
  isKeyItemEqual?: (
    cachedKeyArg: Arg,
    nextKeyArg: Arg,
    index: number,
  ) => boolean;
  /**
   * The maximum number of entries to store in cache.
   * @default 1
   */
  maxSize?: number;
  /**
   * Transform the parameters passed into a custom key for storage in
   * cache.
   */
  transformKey?: TransformKey<Fn>;
}

export interface OptionsNoCustomEqual<Fn extends (...args: any[]) => any>
  extends OptionsBase<Fn> {
  isKeyEqual?: never;
  isKeyItemEqual?: never;
}

export interface OptionsKeyEqual<Fn extends (...args: any[]) => any>
  extends OptionsBase<Fn> {
  isKeyEqual: (cachedKey: Key, nextKey: Key) => boolean;
  isKeyItemEqual?: never;
}

export interface OptionsKeyItemEqual<Fn extends (...args: any[]) => any>
  extends OptionsBase<Fn> {
  isKeyEqual?: never;
  isKeyItemEqual: (cachedKeyItem: Arg, nextKeyItem: Arg) => boolean;
}

export type Options<Fn extends (...args: any[]) => any> =
  | OptionsNoCustomEqual<Fn>
  | OptionsKeyEqual<Fn>
  | OptionsKeyItemEqual<Fn>;

export type CacheEntry<Fn extends (...args: any[]) => any> = [
  Key,
  ReturnType<Fn>,
];

/**
 * Snapshot of the current cache state as a set of [key, value] entries.
 */
export interface CacheSnapshot<Fn extends (...args: any[]) => any> {
  entries: Array<CacheEntry<Fn>>;
  keys: Key[];
  size: number;
  values: Array<ReturnType<Fn>>;
}

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
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  <Fn extends (...args: any[]) => any>(fn: Fn): Memoized<Fn, {}>;
}

export declare const memoize: Memoize;
