import { getEntry } from './utils';
import type {
  Cache as CacheType,
  CacheEvent,
  CacheEventListener,
  CacheEventReason,
  CacheEventType,
  CacheNode,
  EventEmitter,
} from '../index.d';

export function createEventEmitter<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
>(cache: CacheType<Fn>, type: Type): EventEmitter<Type, Fn> {
  const listeners: Array<CacheEventListener<Type, Fn>> = [];

  return {
    s: 0,

    a(listener: CacheEventListener<Type, Fn>): void {
      if (listeners.indexOf(listener) === -1) {
        listeners.push(listener);
        ++this.s;
      }
    },

    n(node: CacheNode<Fn>, reason?: CacheEventReason): void {
      for (let index = 0, length = this.s; index < length; ++index) {
        listeners[index]!({
          cache,
          entry: getEntry(node),
          reason,
          type,
        } as CacheEvent<Type, Fn>);
      }
    },

    r(listener: CacheEventListener<Type, Fn>): void {
      const index = listeners.indexOf(listener);

      if (index !== -1) {
        listeners.splice(index, 1);
        --this.s;
      }
    },
  };
}
