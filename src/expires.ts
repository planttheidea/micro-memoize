import type { Cache } from './Cache.js';
import type {
  CacheEventListener,
  GetExpires,
  Key,
  Options,
  ShouldPersist,
  ShouldRemoveOnExpire,
} from './internalTypes.js';
import { isNumericValueValid } from './utils.js';

export class ExpirationManager<Fn extends (...args: any[]) => any> {
  /**
   * The [c]ache being monitored.
   */
  c: Cache<Fn>;
  /**
   * Map of [e]xpiration timeouts.
   */
  e = new Map<Key, ReturnType<typeof setTimeout>>();
  /**
   * Whether the entry in cache should [p]ersist, and therefore not
   * have any expiration.
   */
  p: ShouldPersist<Fn> | undefined;
  /**
   * Whether the entry in cache should be [r]emoved on expiration.
   */
  r: ShouldRemoveOnExpire<Fn> | undefined;
  /**
   * The [t]ime to wait before expiring, or a method that determines that time.
   */
  t: number | GetExpires<Fn>;
  /**
   * Whether the expiration should [u]pdate when the cache entry is hit.
   */
  u: boolean;

  constructor(cache: Cache<Fn>, expires: Required<Options<Fn>>['expires']) {
    this.c = cache;

    if (typeof expires === 'object') {
      this.t = expires.after;
      this.p = expires.shouldPersist;
      this.r = expires.shouldRemove;
      this.u = !!expires.update;
    } else {
      this.t = expires;
      this.u = false;
    }

    this.c.on('add', ({ key, value }) => {
      this.a(key, value) && this.s(key, value);
    });

    if (this.u) {
      // Set up a `hit` listener if we care about updating the expiration.
      this.c.on('hit', ({ key, value }) => {
        this.a(key, value) && this.s(key, value);
      });

      if (this.c.p) {
        const onResolved: CacheEventListener<'update', Fn> = ({ key, reason, value }) => {
          if (reason === 'resolved' && this.a(key, value)) {
            this.s(key, value);
            // Automatically remove the listener to avoid unnecessary work on updates after
            // the item is resolved, as that can only ever happen once.
            this.c.off('update', onResolved);
          }
        };

        // If the method is also async, then when the value resolved update the expiration cache.
        this.c.on('update', onResolved);
      }
    }

    this.c.on('delete', ({ key }) => {
      this.e.has(key) && this.d(key);
    });
  }

  get size(): number {
    return this.e.size;
  }

  /**
   * Whether the cache expiration should be set [a]gain, generally after some cache change.
   */
  a(key: Key, value: ReturnType<Fn>): boolean {
    return !!(this.c.g(key) && !this.p?.(key, value, this.c));
  }

  /**
   * Method to [d]elete the expiration.
   */
  d(key: Key): void {
    const expiration = this.e.get(key);

    if (expiration) {
      clearTimeout(expiration);
      this.e.delete(key);
    }
  }

  /**
   * Method to [s]et the new expiration. If one is present for the given `key`, it will delete
   * the existing expiration before creating the new one.
   */
  s(key: Key, value: ReturnType<Fn>): void {
    if (this.e.has(key)) {
      this.d(key);
    }

    const cache = this.c;
    const time = typeof this.t === 'function' ? this.t(key, value, cache) : this.t;

    if (!isNumericValueValid(time)) {
      throw new TypeError(`The expiration time must be a finite, non-negative number; received ${time as string}`);
    }

    const timeout = setTimeout(() => {
      this.d(key);

      const node = cache.g(key);

      if (!node) {
        return;
      }

      if (typeof this.r === 'function' && !this.r(key, node.v, time, cache)) {
        if (node !== cache.h) {
          cache.u(node, 'expiration reset', false);
        } else if (cache.o) {
          // Always notify, even if at the top of the cache.
          cache.o.n('update', node, 'expiration reset');
        }

        this.s(key, node.v);
      } else {
        cache.d(node, 'expired');
      }
    }, time);

    if (typeof timeout.unref === 'function') {
      // If done in NodeJS, the timeout should have its reference removed to avoid
      // hanging timers if collected while running.
      timeout.unref();
    }

    this.e.set(key, timeout);
  }
}
