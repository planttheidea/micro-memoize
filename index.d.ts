export type RawKey = IArguments | Key;
export type Key = any[];
export type Arg = Key[number];

export interface CacheNode<Fn extends (...args: any[]) => any> {
  n: CacheNode<Fn> | null;
  p: CacheNode<Fn> | null;
  k: Key;
  v: ReturnType<Fn>;
}

export interface CacheEntry<Fn extends (...args: any[]) => any> {
  key: Key;
  value: ReturnType<Fn>;
}

export type OnChange<Fn extends (...args: any[]) => any> = (
  type: 'add' | 'delete' | 'hit' | 'resolved' | 'update',
  entry: CacheEntry<Fn>,
  cache: Cache<Fn>,
) => void;
export type KeyTransformer<Fn extends (...args: any[]) => any> = (
  args: Parameters<Fn>,
) => Key;

export interface Options<Fn extends (...args: any[]) => any> {
  [key: string]: any;

  async?: boolean;
  maxSize?: number;
  matchesArg?: (a: Arg, b: Arg) => boolean;
  matchesKey?: (a: Key, b: Key) => boolean;
  onCache?: OnChange<Fn>;
  transformKey?: KeyTransformer<Fn>;
}

export interface CacheSnapshot<Fn extends (...args: any[]) => any> {
  entries: Array<CacheEntry<Fn>>;
  size: number;
}

export interface Memoized<Fn extends (...args: any[]) => any> {
  (...args: Parameters<Fn>): ReturnType<Fn>;

  cache: Cache<Fn>;
  fn: Fn;
  isMemoized: true;
  options: Options<Fn>;
}

export type TypeOf =
  | 'bigint'
  | 'boolean'
  | 'function'
  | 'number'
  | 'object'
  | 'string'
  | 'symbol'
  | 'undefined';

export class Cache<Fn extends (...args: any[]) => any> {
  a: (a: Arg, b: Arg) => boolean;
  c: boolean;
  h: CacheNode<Fn> | null;
  k: ((args: Parameters<Fn>) => Key) | undefined;
  m: (a: Key, b: Key) => boolean;
  o: OnChange<Fn> | undefined;
  p: boolean;
  t: CacheNode<Fn> | null;

  constructor(options: Options<Fn>);

  get size(): number;

  clear(): void;
  delete(node: CacheNode<Fn>): void;
  get(key: Key): ReturnType<Fn> | undefined;
  has(key: Key): boolean;
  hydrate(entries: Array<CacheEntry<Fn>>): void;
  set(key: Key, value: ReturnType<Fn>): CacheNode<Fn>;
  snapshot(): CacheSnapshot<Fn>;
}
