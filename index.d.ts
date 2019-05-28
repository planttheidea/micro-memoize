type Dictionary<Type> = {
  [key: string]: Type;
  [index: number]: Type;
};

declare namespace MicroMemoize {
  export type Key = any[];
  export type Value = any;

  export type RawKey = Key | IArguments;

  export interface Cache {
    canTransformKey: boolean;
    getKeyIndex: KeyIndexGetter;
    keys: Key[];
    options: Options;
    shouldCloneArguments: boolean;
    shouldUpdateOnAdd: boolean;
    shouldUpdateOnChange: boolean;
    shouldUpdateOnHit: boolean;
    snapshot: {
      keys: Key[];
      size: number;
      values: Value[];
    };
    values: Value[];
  }

  export type EqualityComparator = (object1: any, object2: any) => boolean;

  export type MatchingKeyComparator = (key1: Key, key2: RawKey) => boolean;

  export type CacheModifiedHandler = (
    cache: Cache,
    options: StandardOptions,
    memoized: Function,
  ) => void;

  export type KeyTransformer = (args: RawKey) => Key;

  export type KeyIndexGetter = (allKeys: Key[], keyToMatch: RawKey) => number;

  export type StandardOptions = {
    isEqual?: EqualityComparator;
    isMatchingKey?: MatchingKeyComparator;
    isPromise?: boolean;
    maxSize?: number;
    onCacheAdd?: CacheModifiedHandler;
    onCacheChange?: CacheModifiedHandler;
    onCacheHit?: CacheModifiedHandler;
    transformKey?: KeyTransformer;
  };

  export type Options = StandardOptions & Dictionary<any>;

  export type Memoized<Fn extends Function> = Fn &
    Dictionary<any> & {
      cache?: Cache;
      fn: Fn;
      isMemoized?: boolean;
      options?: Options;
    };
}
