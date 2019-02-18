type PlainObject = {
  [key: string]: any;
  [index: number]: any;
};

declare namespace MicroMemoize {
  export type Key = any[];

  export type RawKey = Key | IArguments;

  export type Keys = Key[];

  export type Values = any[];

  export type Options = {
    isEqual?: EqualityComparator;
    isMatchingKey?: MatchingKeyComparator;
    isPromise?: boolean;
    maxSize?: number;
    onCacheAdd?: CacheModifiedHandler;
    onCacheChange?: CacheModifiedHandler;
    onCacheHit?: CacheModifiedHandler;
    transformKey?: KeyTransformer;
  };

  export type Cache = {
    keys: Keys;
    getKeyIndex: (key: RawKey) => number;
    options: Options;
    values: Values;
  };

  export type EqualityComparator = (object1: any, object2: any) => boolean;

  export type MatchingKeyComparator = (key1: Key, key2: RawKey) => boolean;

  export type CacheModifiedHandler = (
    cache: Cache,
    options: Options,
    memoized: Function,
  ) => void;

  export type KeyTransformer = (args: RawKey) => Key;

  export type KeyIndexGetter = (allKeys: Keys, keyToMatch: RawKey) => number;

  export type AsyncCacheUpdater = (cache: Cache, memoized: Memoized) => void;

  export interface Memoized extends Function {
    [key: string]: any;
    cache?: Cache;
    cacheSnapshot?: Cache;
    isMemoized?: boolean;
    options?: Options;
  }
}
