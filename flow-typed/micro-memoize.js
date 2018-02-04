declare module 'micro-memoize' {
  declare type Options = {
    isEqual?: (firstValue: any, secondValue: any) => boolean,
    isPromise?: boolean,
    maxSize?: number,
    transformKey?: (args: any[]) => any
  };

  declare type Fn = (...args: any[]) => any;

  declare module.exports: {
    (fn: Fn, options?: Options): Fn
  };
}
