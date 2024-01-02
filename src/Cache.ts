import type {
  Arg,
  Cache as CacheType,
  CacheEntry,
  CacheNode,
  CacheSnapshot,
  Key,
  OnChange,
  Options,
} from '../index.d';
import { cloneKey, getDefault, getEntry, isSameValueZero } from './utils';

export class Cache<Fn extends (...args: any[]) => any>
  implements CacheType<Fn>
{
  private c: boolean;
  private l: number;
  private p: boolean;
  private s = 0;

  a: (a: Arg, b: Arg) => boolean;
  h: CacheNode<Fn> | null = null;
  k: ((args: IArguments) => Key) | undefined;
  m: (a: Key, b: Key) => boolean;
  o: OnChange<Fn> | undefined;
  t: CacheNode<Fn> | null = null;

  constructor(options: Options<Fn>) {
    const transformKey = getDefault('function', options.transformKey);

    this.a = getDefault('function', options.matchesArg, isSameValueZero);
    this.l = getDefault('number', options.maxSize, 1);
    this.m = getDefault('function', options.matchesKey, this.e);
    this.o = getDefault('function', options.onCache);
    this.p = getDefault('boolean', options.async, false);

    this.c = !!transformKey || options.matchesKey === this.m;

    if (this.c) {
      this.k = transformKey
        ? (args: IArguments) => transformKey(cloneKey<Fn>(args))
        : cloneKey;
    }
  }

  get size() {
    return this.s;
  }

  clear(): void {
    this.h = this.t = null;
    this.s = 0;
  }

  delete(key: Key): boolean {
    const node = this.g(key);

    if (!node) {
      return false;
    }

    this.d(node);
    this.o && this.o({ cache: this, entry: getEntry(node), type: 'delete' });

    return true;
  }

  get(key: Key): ReturnType<Fn> | undefined {
    const node = this.g(key);

    return node && node.v;
  }

  has(key: Key): boolean {
    return !!this.g(key);
  }

  hydrate(entries: Array<CacheEntry<Fn>>): void {
    for (let index = 0, length = entries.length; index < length; ++index) {
      const entry = entries[index]!;

      const existingNode = this.g(entry.key);

      if (existingNode) {
        existingNode.v = entry.value;

        if (existingNode !== this.h) {
          this.u(existingNode);
        }
      } else {
        this.n(entry.key, entry.value);
      }
    }
  }

  set(key: Key, value: ReturnType<Fn>): CacheNode<Fn> {
    const existingNode = this.g(key);

    if (!existingNode) {
      const node = this.n(key, value);

      this.o && this.o({ cache: this, entry: getEntry(node), type: 'add' });

      return node;
    }

    existingNode.v = value;

    if (existingNode !== this.h) {
      this.u(existingNode);
    }

    this.o &&
      this.o({ cache: this, entry: getEntry(existingNode), type: 'update' });

    return existingNode;
  }

  snapshot(): CacheSnapshot<Fn> {
    const entries: Array<CacheEntry<Fn>> = [];

    let node = this.h;

    while (node != null) {
      entries.push(getEntry(node));
      node = node.n;
    }

    return { entries, size: this.s };
  }

  d(node: CacheNode<Fn>): void {
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
  }

  e(prevKey: Key, nextKey: Key): boolean {
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

  g(key: Key): CacheNode<Fn> | undefined {
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

  n(key: Key, value: ReturnType<Fn>): CacheNode<Fn> {
    const prevHead = this.h;
    const prevTail = this.t;
    const node = { k: key, n: prevHead, p: null, v: value };

    if (this.p) {
      node.v = value.then(
        (value: any) => {
          this.o &&
            this.has(key) &&
            this.o({
              cache: this,
              entry: getEntry(node),
              reason: 'resolved',
              type: 'update',
            });
          return value;
        },
        (error: Error) => {
          if (this.has(key)) {
            this.d(node);
            this.o &&
              this.o({
                cache: this,
                entry: getEntry(node),
                reason: 'rejected',
                type: 'delete',
              });
          }

          throw error;
        },
      );
    }

    this.h = node;

    if (prevHead) {
      prevHead.p = node;
    } else {
      this.t = node;
    }

    if (++this.s > this.l && prevTail) {
      this.d(prevTail);
      this.o &&
        this.o({
          cache: this,
          entry: getEntry(prevTail),
          reason: 'evicted',
          type: 'delete',
        });
    }

    return node;
  }

  u(node: CacheNode<Fn>): void {
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
