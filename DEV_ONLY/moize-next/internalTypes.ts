import type {
  CacheEntry,
  CacheEvent as BaseCacheEvent,
  CacheEventType,
  Key,
  OptionsArgEqual as BaseOptionsArgEqual,
  OptionsKeyEqual as BaseOptionsKeyEqual,
} from '../../src';
import type { Cache } from './Cache';

export type * from '../../src';

interface OptionsArgEqual<Fn extends (...args: any[]) => any>
  extends Omit<BaseOptionsArgEqual<Fn>, 'isArgEqual'> {
  isArgEqual?: 'deep' | 'shallow' | BaseOptionsArgEqual<Fn>['isArgEqual'];
}

type BaseOptions<Fn extends (...args: any[]) => any> = OptionsArgEqual<Fn> &
  BaseOptionsKeyEqual<Fn>;

export type CacheEvent<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
> = BaseCacheEvent<Type, Fn> & {
  cache: Cache<Fn>;
};

export type CacheEventListener<
  Type extends CacheEventType,
  Fn extends (...args: any[]) => any,
> = (event: CacheEvent<Type, Fn>) => void;

export type Options<Fn extends (...args: any[]) => any> = BaseOptions<Fn> & {
  expiresAfter?: number;
  /**
   * Whether the function is a React component.
   */
  maxArgs?: number;
  onExpire?: (entry: CacheEntry<Fn>) => any;
  profileName?: string;
  rescheduleExpiration?:
    | boolean
    | ((event: CacheEvent<'hit' | 'update', Fn>) => boolean);
  serialize?: boolean | ((key: Key) => [string]);
};

export type NormalizedOptions<Fn extends (...args: any[]) => any> =
  Options<Fn> & {
    isArgEqual: BaseOptions<Fn>['isArgEqual'];
    profileName: string;
  };

export interface Moized<
  Fn extends (...args: any[]) => any,
  Opts extends Options<Fn>,
> {
  (...args: Parameters<Fn>): ReturnType<Fn>;

  /**
   * The cache used for the memoized method.
   */
  cache: Cache<Fn>;
  /**
   * The original method that is memoized.
   */
  fn: Fn;
  /**
   * Simple identifier that the function has been memoized.
   */
  isMoized: true;
  /**
   * Options passed for the memoized method.
   */
  options: Opts;
}

export interface Moize {
  <
    Fn extends Moized<
      (...args: any[]) => any,
      Options<(...args: any[]) => any>
    >,
    Opts extends Options<Fn['fn']>,
  >(
    fn: Fn,
    passedOptions: Opts,
  ): Moized<Fn['fn'], Fn['options'] & Opts>;
  <
    Fn extends Moized<
      (...args: any[]) => any,
      Options<(...args: any[]) => any>
    >,
  >(
    fn: Fn,
  ): Moized<Fn, Fn['options']>;
  <Fn extends (...args: any[]) => any, Opts extends Options<Fn>>(
    fn: Fn,
    passedOptions: Opts,
  ): Moized<Fn, Opts>;
  // eslint-disable-next-line @typescript-eslint/ban-types
  <Fn extends (...args: any[]) => any>(fn: Fn): Moized<Fn, {}>;

  isMoized: (fn: any) => fn is Moized<any, any>;
}

export type CollectStatsEventListener = (isCollectingStats: boolean) => void;

export interface CollectStatsEventEmitter {
  l: CollectStatsEventListener[];
  a(listener: CollectStatsEventListener): void;
  n(isCollectingStats: boolean): void;
  r(listener: CollectStatsEventListener): void;
}

export interface StatsCache {
  anonymousProfileNameCounter: number;
  eventEmitter: CollectStatsEventEmitter;
  isCollectingStats: boolean;
  profiles: Record<string, Stats>;
}

export interface StatsObject {
  calls: number;
  hits: number;
  usage: string;
}

export interface GlobalStats extends StatsObject {
  profiles?: Record<string, Stats>;
}

export interface Stats {
  get usage(): string;

  calls: number;
  hits: number;
}
