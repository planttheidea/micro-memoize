declare module 'micro-memoize' {
  declare type Cache = {
    keys: Array<any>,
    values: Array<any>
  };

  declare type Options = {
    isEqual?: (firstValue: any, secondValue: any) => boolean,
    isPromise?: boolean,
    maxSize?: number,
    onCacheChange?: (cache: Cache) => void,
    transformKey?: (args: any[]) => any
  };

  declare type Fn = (...args: any[]) => any;

  declare module.exports: {
    (fn: Fn, options?: Options): Fn
  };
}
