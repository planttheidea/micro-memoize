type Dictionary<Type> = {
  [key: string]: Type;
  [index: number]: Type;
};

type AnyFn = (...args: any[]) => any;

export declare namespace MicroMemoize {
  export type Key = any[];
  export type Value = any;

  export type RawKey = Key | IArguments;

  export type Cache<Fn extends AnyFn> = import('./src/Cache').Cache<Fn>;

  export type EqualityComparator = (object1: any, object2: any) => boolean;

  export type MatchingKeyComparator = (key1: Key, key2: RawKey) => boolean;

  export type CacheModifiedHandler<Fn extends AnyFn> = (
    cache: Cache<Fn>,
    options: NormalizedOptions<Fn>,
    memoized: Fn,
  ) => void;

  export type KeyTransformer = (args: Key) => Key;

  export type KeyIndexGetter = (keyToMatch: RawKey) => number;

  export type StandardOptions<Fn extends AnyFn> = {
    isEqual?: EqualityComparator;
    isMatchingKey?: MatchingKeyComparator;
    isPromise?: boolean;
    maxSize?: number;
    onCacheAdd?: CacheModifiedHandler<Fn>;
    onCacheChange?: CacheModifiedHandler<Fn>;
    onCacheHit?: CacheModifiedHandler<Fn>;
    transformKey?: KeyTransformer;
  };

  export type Options<Fn extends AnyFn> = StandardOptions<Fn> & Dictionary<any>;
  export type NormalizedOptions<Fn extends AnyFn> = Options<Fn> & {
    isEqual: EqualityComparator;
    isPromise: boolean;
    maxSize: number;
  };

  export type Memoized<Fn extends AnyFn> = Fn &
    Dictionary<any> & {
      cache: Cache<Fn>;
      fn: Fn;
      isMemoized: true;
      options: NormalizedOptions<Fn>;
    };
}

export default function memoize<Fn extends AnyFn>(
  fn: Fn | MicroMemoize.Memoized<Fn>,
  options?: MicroMemoize.Options<Fn>,
): MicroMemoize.Memoized<Fn>;
