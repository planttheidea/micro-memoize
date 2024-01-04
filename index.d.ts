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

export type CacheEventType = 'add' | 'delete' | 'hit' | 'update';

interface CacheEventBase<Fn extends (...args: any[]) => any> {
  cache: Cache<Fn>;
  entry: CacheEntry<Fn>;
  reason?: 'evicted' | 'rejected' | 'resolved';
  type: CacheEventType;
}

export interface OnAddEvent<Fn extends (...args: any[]) => any>
  extends CacheEventBase<Fn> {
  reason?: undefined;
  type: 'add';
}

export interface OnDeleteEvent<Fn extends (...args: any[]) => any>
  extends CacheEventBase<Fn> {
  reason?: 'evicted' | 'rejected';
  type: 'delete';
}

export interface OnHitEvent<Fn extends (...args: any[]) => any>
  extends CacheEventBase<Fn> {
  reason?: undefined;
  type: 'hit';
}

export interface OnUpdateEvent<Fn extends (...args: any[]) => any>
  extends CacheEventBase<Fn> {
  reason?: 'resolved';
  type: 'update';
}

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

export type CacheEventListener<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
> = (event: CacheEvent<Type, Fn>) => void;

export type OnChangeOptions<Fn extends (...args: any[]) => any> =
  | OnAddEvent<Fn>
  | OnDeleteEvent<Fn>
  | OnHitEvent<Fn>
  | OnUpdateEvent<Fn>;

export type KeyTransformer<Fn extends (...args: any[]) => any> = (
  args: Parameters<Fn>,
) => Key;

export interface Options<Fn extends (...args: any[]) => any> {
  [key: string]: any;

  async?: boolean;
  maxSize?: number;
  matchesArg?: (a: Arg, b: Arg) => boolean;
  matchesKey?: (a: Key, b: Key) => boolean;
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

export class EventEmitter<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
> {
  s: number;

  constructor(type: Type);

  a(listener: CacheEventListener<Type, Fn>): void;
  n(event: CacheEvent<Type, Fn>): void;
  r(listener: CacheEventListener<Type, Fn>): void;
}

export class Cache<Fn extends (...args: any[]) => any> {
  a: (a: Arg, b: Arg) => boolean;
  h: CacheNode<Fn> | null;
  k: ((args: IArguments | Key) => Key) | undefined;
  m: (a: Key, b: Key) => boolean;
  oa: EventEmitter<'add', Fn> | null;
  od: EventEmitter<'delete', Fn> | null;
  oh: EventEmitter<'hit', Fn> | null;
  ou: EventEmitter<'update', Fn> | null;
  s: number;
  t: CacheNode<Fn> | null;

  static EventEmitter: EventEmitter<CacheEventType, (...args: any[]) => any>;

  constructor(options: Options<Fn>);

  clear(): void;
  delete(key: Key): boolean;
  get(key: Key): ReturnType<Fn> | undefined;
  has(key: Key): boolean;
  off<
    Type extends CacheEventType,
    Listener extends CacheEventListener<Type, Fn>,
  >(type: Type, listener: Listener): void;
  on<
    Type extends CacheEventType,
    Listener extends CacheEventListener<Type, Fn>,
  >(type: Type, listener: Listener): Listener;
  set(key: Key, value: ReturnType<Fn>): void;
  snapshot(): CacheSnapshot<Fn>;

  d(node: CacheNode<Fn>): void;
  e(prevKey: Key, nextKey: Key): boolean;
  g(key: Key): CacheNode<Fn> | undefined;
  n(key: Key, value: ReturnType<Fn>): CacheNode<Fn>;
  og(type: CacheEventType): EventEmitter<CacheEventType, Fn> | null;
  os(
    type: CacheEventType,
    emitter: EventEmitter<CacheEventType, Fn> | null,
  ): void;
  u(node: CacheNode<Fn>): void;
}

interface Memoize {
  <Fn extends (...args: any[]) => any>(
    fn: Fn,
    passedOptions?: Options<Fn>,
  ): Memoized<Fn>;
  <Fn extends (...args: any[]) => any>(
    fn: Memoized<Fn>,
    passedOptions?: Options<Fn>,
  ): Memoized<Fn>;

  Cache: Cache<(...args: any[]) => any>;
}

declare const memoize: Memoize;

export default memoize;
