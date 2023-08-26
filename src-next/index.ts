/* eslint-disable @typescript-eslint/no-use-before-define */
export type RawKey = IArguments | Key;
export type Key = any[];

type Arg = Key[number];

interface CacheEntry<Fn extends (...args: any[]) => any> {
  key: Key;
  value: ReturnType<Fn>;
}

type OnChange<Fn extends (...args: any[]) => any> = (
  type: 'add' | 'hit' | 'remove' | 'update',
  entry: CacheEntry<Fn>,
  cache: Cache<Fn>,
) => void;
type KeyTransformer = (args: Key) => Key;

interface Options<Fn extends (...args: any[]) => any> {
  isPromise?: boolean;
  maxSize?: number;
  matchesArg?: (a: Arg, b: Arg) => boolean;
  matchesKey?: (a: Key, b: Key) => boolean;
  onChange?: OnChange<Fn>;
  transformKey?: KeyTransformer;
}

// interface NormalizedOptions<Fn extends (...args: any[]) => any>
//   extends Required<Omit<Options<Fn>, 'onChange' | 'transformKey'>> {
//   onChange: OnChange<Fn> | undefined;
//   transformKey: KeyTransformer | undefined;
// }

type CacheSnapshot<Fn extends (...args: any[]) => any> = Array<{
  key: Key;
  value: ReturnType<Fn>;
}>;

interface Memoized<Fn extends (...args: any[]) => any> {
  (...args: Parameters<Fn>): ReturnType<Fn>;

  cache: Cache<Fn>;
  fn: Fn;
  isMemoized: true;
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

function cloneKey(args: RawKey): Key {
  const key: Key = [];

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

function updateAsyncEntry<Fn extends (...args: any[]) => any>(
  cache: Cache<Fn>,
  entry: CacheEntry<Fn>,
): void {
  entry.value = entry.value.then(
    (value: any) => {
      if (cache.onChange) {
        const index = cache.entries.indexOf(entry);

        if (index === 0) {
          cache.onChange('hit', entry, cache);
        } else if (index !== -1) {
          cache.onChange('update', entry, cache);
        }
      }

      return value;
    },
    (error: Error) => {
      cache.remove(entry);
      throw error;
    },
  );
}

class Cache<Fn extends (...args: any[]) => any> {
  private c: boolean;

  entries: Array<CacheEntry<Fn>> = [];
  matchesArg: (a: Arg, b: Arg) => boolean;
  matchesKey: (a: Key, b: Key) => boolean;
  maxSize: number;
  isPromise: boolean;
  onChange: OnChange<Fn> | undefined;
  transformKey: ((args: RawKey | Key) => Key) | undefined;

  constructor(options: Options<Fn>) {
    const transformKey = getDefault('function', options.transformKey);

    this.isPromise = getDefault('boolean', options.isPromise, false);
    this.matchesArg = getDefault('function', options.matchesArg, sameValueZero);
    this.matchesKey = getDefault('function', options.matchesKey, this.e);
    this.maxSize = getDefault('number', options.maxSize, 1);
    this.onChange = getDefault('function', options.onChange);
    this.c = !!transformKey || options.matchesKey === this.matchesKey;
    this.transformKey = this.c
      ? transformKey
        ? (args: RawKey) => transformKey(cloneKey(args))
        : cloneKey
      : undefined;
  }

  add(key: Key, value: ReturnType<Fn>): CacheEntry<Fn> {
    const entry = { key, value };

    this.r(entry, this.entries.length);
    this.onChange && this.onChange('add', entry, this);

    return entry;
  }

  clear(): void {
    this.entries.length = 0;
  }

  match(key: Key): CacheEntry<Fn> | undefined {
    const length = this.entries.length;

    if (!length) {
      return;
    }

    let entry = this.entries[0]!;

    if (this.matchesKey(entry.key, key)) {
      this.onChange && this.onChange('hit', entry, this);
      return entry;
    }

    if (length === 1) {
      return;
    }

    for (let index = 1; index < length; ++index) {
      entry = this.entries[index]!;

      if (this.matchesKey(entry.key, key)) {
        this.r(entry, index);
        this.onChange && this.onChange('update', entry, this);
        return entry;
      }
    }
  }

  remove(entry: CacheEntry<Fn>): void {
    const index = this.entries.indexOf(entry);

    if (index !== -1) {
      this.entries.splice(index, 1);
      this.onChange && this.onChange('remove', entry, this);
    }
  }

  snapshot(): CacheSnapshot<Fn> {
    return this.entries.map(({ key, value }) => ({ key, value }));
  }

  private e(prevKey: Key, nextKey: Key): boolean {
    const length = nextKey.length;

    if (prevKey.length !== length) {
      return false;
    }

    if (length === 1) {
      return this.matchesArg(prevKey[0], nextKey[0]);
    }

    for (let index = 0; index < length; ++index) {
      if (!this.matchesArg(prevKey[index], nextKey[index])) {
        return false;
      }
    }

    return true;
  }

  private r(entry: CacheEntry<Fn>, startingIndex: number) {
    const currentLength = this.entries.length;

    let index = startingIndex;

    while (index--) {
      this.entries[index + 1] = this.entries[index]!;
    }

    this.entries[0] = entry;

    if (currentLength === this.maxSize && startingIndex === currentLength) {
      this.entries.pop();
    } else if (startingIndex >= this.maxSize) {
      // eslint-disable-next-line no-multi-assign
      this.entries.length = this.maxSize;
    }
  }
}

function sameValueZero(a: any, b: any) {
  return a === b || (a !== a && b !== b);
}

export default function memoize<Fn extends (...args: any[]) => any>(
  fn: Fn,
  passedOptions: Options<Fn> = {},
): Memoized<Fn> {
  const cache = new Cache(passedOptions);
  const transformed = !!cache.transformKey;

  const memoized: Memoized<Fn> = function memoized(this: any) {
    const key = transformed
      ? cache.transformKey!(arguments)
      : (arguments as unknown as Key);
    let cached = cache.match(key);

    if (cached) {
      return cached.value;
    }

    cached = cache.add(transformed ? key : cloneKey(key), fn.apply(this, key));

    if (cache.isPromise) {
      updateAsyncEntry(cache, cached);
    }

    return cached.value;
  };

  memoized.cache = cache;
  memoized.fn = fn;
  memoized.isMemoized = true;

  return memoized;
}
