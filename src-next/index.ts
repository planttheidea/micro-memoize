/* eslint-disable @typescript-eslint/no-use-before-define */
export type RawKey = IArguments | Key;
export type Key = any[];

type Arg = Key[number];

interface CacheNode<Fn extends (...args: any[]) => any> {
  n: CacheNode<Fn> | null;
  p: CacheNode<Fn> | null;
  k: Key;
  v: ReturnType<Fn>;
}

interface CacheEntry<Fn extends (...args: any[]) => any> {
  key: Key;
  value: ReturnType<Fn>;
}

type OnChange<Fn extends (...args: any[]) => any> = (
  type: 'add' | 'delete' | 'hit' | 'resolved' | 'update',
  entry: CacheEntry<Fn>,
  cache: Cache<Fn>,
) => void;
type KeyTransformer<Fn extends (...args: any[]) => any> = (
  args: Parameters<Fn>,
) => Key;

interface Options<Fn extends (...args: any[]) => any> {
  async?: boolean;
  maxSize?: number;
  matchesArg?: (a: Arg, b: Arg) => boolean;
  matchesKey?: (a: Key, b: Key) => boolean;
  onCache?: OnChange<Fn>;
  transformKey?: KeyTransformer<Fn>;
}

type CacheSnapshot<Fn extends (...args: any[]) => any> = Array<{
  key: Key;
  value: ReturnType<Fn>;
}>;

interface Memoized<Fn extends (...args: any[]) => any> {
  (...args: Parameters<Fn>): ReturnType<Fn>;

  cache: Cache<Fn>;
  fn: Fn;
  isMemoized: true;
  options: Options<Fn>;
}

type TypeOf =
  | 'bigint'
  | 'boolean'
  | 'function'
  | 'number'
  | 'object'
  | 'string'
  | 'symbol'
  | 'undefined';

class Cache<Fn extends (...args: any[]) => any> {
  private a: (a: Arg, b: Arg) => boolean;
  private c: boolean;
  private h: CacheNode<Fn> | null = null;
  private k: ((args: Parameters<Fn>) => Key) | undefined;
  private l: number;
  private m: (a: Key, b: Key) => boolean;
  private o: OnChange<Fn> | undefined;
  private p: boolean;
  private s = 0;
  private t: CacheNode<Fn> | null = null;

  constructor(options: Options<Fn>) {
    const transformKey = getDefault('function', options.transformKey);

    this.a = getDefault('function', options.matchesArg, sameValueZero);
    this.l = getDefault('number', options.maxSize, 1);
    this.m = getDefault('function', options.matchesKey, this.e);
    this.o = getDefault('function', options.onCache);
    this.p = getDefault('boolean', options.async, false);

    this.c = !!transformKey || options.matchesKey === this.m;
    this.k = this.c
      ? transformKey
        ? (args: Parameters<Fn>) => transformKey(cloneKey<Fn>(args))
        : cloneKey
      : undefined;
  }

  clear(): void {
    this.h = this.t = null;
    this.s = 0;
  }

  delete(node: CacheNode<Fn>): void {
    const next = node.n;
    const prev = node.p;

    if (next) {
      next.p = prev;
    } else {
      this.t = prev;
    }

    if (prev) {
      prev.n = next;
    } else {
      this.h = next;
    }

    --this.s;

    this.o && this.o('delete', getEntry(node), this);
  }

  get(key: Key): ReturnType<Fn> | undefined {
    const node = this.g(key);

    return node && node.v;
  }

  has(key: Key): boolean {
    return !!this.g(key);
  }

  set(key: Key, value: ReturnType<Fn>): CacheNode<Fn> {
    const existingNode = this.g(key);

    if (!existingNode) {
      const node = this.n(key, value);

      this.o && this.o('add', getEntry(node), this);

      return node;
    }

    existingNode.v = value;

    if (existingNode !== this.h) {
      this.u(existingNode);
    }

    this.o && this.o('update', getEntry(existingNode), this);

    return existingNode;
  }

  snapshot(): CacheSnapshot<Fn> {
    const cached: CacheSnapshot<Fn> = [];

    let node = this.h;

    while (node != null) {
      cached.push(getEntry(node));
      node = node.n;
    }

    return cached;
  }

  private e(prevKey: Key, nextKey: Key): boolean {
    const length = nextKey.length;

    if (prevKey.length !== length) {
      return false;
    }

    if (length === 1) {
      return this.a(prevKey[0], nextKey[0]);
    }

    for (let index = 0; index < length; ++index) {
      if (!this.a(prevKey[index], nextKey[index])) {
        return false;
      }
    }

    return true;
  }

  private g(key: Key): CacheNode<Fn> | undefined {
    if (!this.h) {
      return;
    }

    if (this.m(this.h.k, key)) {
      return this.h;
    }

    if (this.h === this.t) {
      return;
    }

    let cached: CacheNode<Fn> | null = this.h.n;

    while (cached) {
      if (this.m(cached.k, key)) {
        this.u(cached);
        return cached;
      }

      cached = cached.n;
    }
  }

  private n(key: Key, value: ReturnType<Fn>): CacheNode<Fn> {
    if (this.p) {
      value = value.then(
        (value: any) => {
          this.o &&
            this.has(node.k) &&
            this.o('resolved', getEntry(node), this);
          return value;
        },
        (error: Error) => {
          this.delete(node);
          throw error;
        },
      );
    }

    const prevHead = this.h;
    const prevTail = this.t;
    const node = { k: key, n: prevHead, p: null, v: value };

    this.h = node;

    if (prevHead) {
      prevHead.p = node;
    } else {
      this.t = node;
    }

    if (++this.s > this.l && prevTail) {
      this.delete(prevTail);
    }

    return node;
  }

  private u(node: CacheNode<Fn>): void {
    const next = node.n;
    const prev = node.p;

    if (next) {
      next.p = prev;
    }

    if (prev) {
      prev.n = next;
    }

    this.h!.p = node;
    node.n = this.h;
    node.p = null;
    this.h = node;

    if (node === this.t) {
      this.t = prev;
    }
  }
}

function cloneKey<Fn extends (...args: any[]) => any>(
  args: Parameters<Fn>,
): [...Parameters<Fn>] {
  const key = [] as unknown as Parameters<Fn>;

  for (let index = 0, length = args.length; index < length; ++index) {
    key[index] = args[index];
  }

  return key;
}

function getDefault<Value>(
  type: TypeOf,
  value: Value,
  defaultValue?: undefined,
): Value | undefined;
function getDefault<Value, DefaultValue>(
  type: TypeOf,
  value: Value,
  defaultValue: DefaultValue,
): Value extends undefined ? DefaultValue : Value;
function getDefault<Value, DefaultValue>(
  type: TypeOf,
  value: Value,
  defaultValue?: DefaultValue,
) {
  return typeof value === type ? value : defaultValue;
}

function getEntry<Fn extends (...args: any[]) => any>(
  node: CacheNode<Fn>,
): CacheEntry<Fn> {
  return { key: node.k, value: node.v };
}

function isMemoized(fn: any): fn is Memoized<any> {
  return typeof fn === 'function' && fn.fn;
}

function sameValueZero(a: any, b: any) {
  return a === b || (a !== a && b !== b);
}

export default function memoize<Fn extends (...args: any[]) => any>(
  fn: Fn,
  passedOptions?: Options<Fn>,
): Memoized<Fn>;
export default function memoize<Fn extends (...args: any[]) => any>(
  fn: Memoized<Fn>,
  passedOptions?: Options<Fn>,
): Memoized<Fn>;
export default function memoize<Fn extends (...args: any[]) => any>(
  fn: Fn | Memoized<Fn>,
  passedOptions: Options<Fn> = {},
): Memoized<Fn> {
  if (isMemoized(fn)) {
    return memoize(fn.fn, Object.assign({}, fn.options, passedOptions));
  }

  const cache = new Cache(passedOptions);
  // @ts-expect-error - Capture internal properties not surfaced on public API
  const { k: transformKey, o: onChange } = cache;

  const memoized: Memoized<Fn> = function memoized(this: any) {
    // @ts-expect-error - `arguments` does not line up with `Parameters<Fn>`
    const key: Key = transformKey ? transformKey!(arguments) : arguments;
    // @ts-expect-error - `h` is not surfaced on public API
    const prevHead = cache.h;
    // @ts-expect-error - `g` is not surfaced on public API
    let node = cache.g(key);

    if (node) {
      onChange &&
        onChange(node === prevHead ? 'hit' : 'update', getEntry(node), cache);
      return node.v;
    }

    // @ts-expect-error - `n` is not surfaced on public API
    node = cache.n(transformKey ? key : cloneKey(key), fn.apply(this, key));
    onChange && onChange('add', getEntry(node), cache);

    return node.v;
  };

  memoized.cache = cache;
  memoized.fn = fn;
  memoized.isMemoized = true;
  memoized.options = passedOptions;

  return memoized;
}
