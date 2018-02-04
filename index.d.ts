interface Options {
  isEqual?: (firstValue: any, secondValue: any) => boolean;
  isPromise?: boolean;
  maxSize?: number;
  transformKey?: (args: any[]) => any;
}

type Fn = (...args: any[]) => any;

declare function memoize<T extends Fn>(fn: T, options?: Options): T;

export default memoize;
