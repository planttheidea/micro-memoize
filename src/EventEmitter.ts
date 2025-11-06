import type { Cache } from "./Cache.ts";
import type {
  CacheEventListener,
  CacheEventType,
  CacheNode,
} from "./internalTypes.ts";

export class CacheEventEmitter<Fn extends (...args: any[]) => any> {
  /**
   * The [c]ache the emitter is associated with.
   */
  private c: Cache<Fn>;
  /**
   * The list of [l]isteners for the given [t]ype.
   */
  private l: Partial<
    Record<string, Array<CacheEventListener<CacheEventType, Fn>>>
  > = {};

  constructor(cache: Cache<Fn>) {
    this.c = cache;
  }

  /**
   * Expose the listeners for testing only.
   */
  get listeners() {
    return this.l;
  }

  /**
   * Method to [a]dd a listener for the given cache change event.
   */
  a<Type extends CacheEventType>(
    type: Type,
    listener: CacheEventListener<Type, Fn>
  ): void {
    const listeners = this.l[type];

    if (listeners) {
      if (!listeners.includes(listener)) {
        listeners.push(listener);
      }
    } else {
      this.l[type] = [listener];
    }
  }

  /**
   * Method to [n]otify all listeners for the given cache change event.
   */
  n(type: CacheEventType, node: CacheNode<Fn>, reason?: any): void {
    const listeners = this.l[type];

    if (!listeners) {
      return;
    }

    for (let index = 0; index < listeners.length; ++index) {
      listeners[index]({
        cache: this.c,
        key: node.k,
        reason,
        value: node.v,
        type,
      });
    }
  }

  /**
   * Method to [r]emove a listener for the given cache change event.
   */
  r<Type extends CacheEventType>(
    type: Type,
    listener: CacheEventListener<Type, Fn>
  ): void {
    const listeners = this.l[type];

    if (!listeners) {
      return;
    }

    const index = listeners.indexOf(listener);

    if (index !== -1) {
      listeners.splice(index, 1);
    }

    if (!listeners.length) {
      this.l[type] = undefined;
    }
  }
}
