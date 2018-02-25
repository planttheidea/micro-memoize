interface Cache = {
  keys: Array<any>,
  values: Array<any>
};

interface Options {
  isEqual?: (firstValue: any, secondValue: any) => boolean;
  isPromise?: boolean;
  maxSize?: number;
  onCacheAdd?: (cache: Cache, options: Options) => void;
  onCacheChange?: (cache: Cache, options: Options) => void;
  onCacheHit?: (cache: Cache, options: Options) => void;
  transformKey?: (args: any[]) => any;
}

type Fn = (...args: any[]) => any;

declare function memoize<T extends Fn>(fn: T, options?: Options): T;

export default memoize;
