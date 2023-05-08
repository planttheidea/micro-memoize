export interface Dictionary<Type> {
  [key: string]: Type;
  [index: number]: Type;
}

export type AnyFn = (...args: any[]) => any;

export type Key = any[];
export type RawKey = Key | IArguments;
export type Value = any;

export interface CacheSnapshot {
  keys: Key[];
  size: number;
  values: Value[];
}

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

  constructor(options: NormalizedOptions<Fn>);

  /**
   * The number of cached [key,value] results.
   */
  get size(): number;

  /**
   * A copy of the cache at a moment in time. This is useful
   * to compare changes over time, since the cache mutates
   * internally for performance reasons.
   */
  get snapshot(): CacheSnapshot;

  /**
   * Order the array based on a Least-Recently-Used basis.
   */
  orderByLru(key: Key, value: Value, startingIndex: number): void;

  /**
   * Update the promise method to auto-remove from cache if rejected, and
   * if resolved then fire cache hit / changed.
   */
  updateAsyncCache(memoized: Memoized<Fn>): void;
}

export type EqualityComparator = (object1: any, object2: any) => boolean;

export type MatchingKeyComparator = (key1: Key, key2: RawKey) => boolean;

export type CacheModifiedHandler<Fn extends AnyFn> = (
  cache: Cache<Fn>,
  options: NormalizedOptions<Fn>,
  memoized: Memoized<Fn>,
) => void;

export type KeyTransformer = (args: Key) => Key;

export type KeyIndexGetter = (keyToMatch: RawKey) => number;

export interface StandardOptions<Fn extends AnyFn> {
  isEqual?: EqualityComparator;
  isMatchingKey?: MatchingKeyComparator;
  isPromise?: boolean;
  maxSize?: number;
  onCacheAdd?: CacheModifiedHandler<Fn>;
  onCacheChange?: CacheModifiedHandler<Fn>;
  onCacheHit?: CacheModifiedHandler<Fn>;
  transformKey?: KeyTransformer;
}

export interface Options<Fn extends AnyFn>
  extends StandardOptions<Fn>,
    Dictionary<any> {}

export interface NormalizedOptions<Fn extends AnyFn> extends Options<Fn> {
  isEqual: EqualityComparator;
  isPromise: boolean;
  maxSize: number;
}

export type Memoized<Fn extends AnyFn> = Fn &
  Dictionary<any> & {
    cache: Cache<Fn>;
    fn: Fn;
    isMemoized: true;
    options: NormalizedOptions<Fn>;
  };

/**
 * @deprecated
 * All types declared on this namespace are available for direct import
 * from the package. In a future release, this namespace will be removed
 * in favor of those direct imports.
 */
export declare namespace MicroMemoize {
  export type {
    Cache,
    CacheModifiedHandler,
    EqualityComparator,
    Key,
    KeyIndexGetter,
    KeyTransformer,
    MatchingKeyComparator,
    Memoized,
    NormalizedOptions,
    Options,
    StandardOptions,
    RawKey,
    Value,
  };
}

export default function memoize<Fn extends AnyFn>(
  fn: Fn | Memoized<Fn>,
  options?: Options<Fn>,
): Memoized<Fn>;
