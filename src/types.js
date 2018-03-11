// @flow

export type Cache = {
  keys: Array<any>,
  values: Array<any>
};

export type Options = {
  isEqual: Function,
  isPromise: boolean,
  maxSize: number,
  onCacheAdd: (cache: Cache, options: Options, memoized: Function) => void,
  onCacheChange: (cache: Cache, options: Options, memoized: Function) => void,
  onCacheHit: (cache: Cache, options: Options, memoized: Function) => void,
  transformKey: ?Function
};
