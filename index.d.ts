type Dictionary<Type> = {
  [key: string]: Type;
  [index: number]: Type;
};

export type Key = any[];
export type Value = any;

export type RawKey = Key | IArguments;

type CacheClass = import('./src/Cache').Cache;

export interface Cache extends CacheClass {
  constructor: Cache;
  new (options: Options): Cache;
}

export type EqualityComparator = (object1: any, object2: any) => boolean;

export type MatchingKeyComparator = (key1: Key, key2: RawKey) => boolean;

export type CacheModifiedHandler = (
  cache: Cache,
  options: StandardOptions,
  memoized: Function,
) => void;

export type KeyTransformer = (args: RawKey) => Key;

export type KeyIndexGetter = (keyToMatch: RawKey) => number;

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
    cache: Cache;
    fn: Fn;
    isMemoized: true;
    options: Options;
  };

export default function memoize<Fn extends Function>(
  fn: Fn | Memoized<Fn>,
  options?: Options,
): Memoized<Fn>;
