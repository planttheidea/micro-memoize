// @flow

export type Cache = {
  keys: Array<any>,
  size: number,
  values: Array<any>,
};

export type Options = {
  isEqual: (any, any) => boolean,
  isMatchingKey?: (Array<any>, Array<any>) => boolean,
  isPromise: boolean,
  maxSize: number,
  onCacheAdd: (cache: Cache, options: Options, memoized: Function) => void,
  onCacheChange: (cache: Cache, options: Options, memoized: Function) => void,
  onCacheHit: (cache: Cache, options: Options, memoized: Function) => void,
  transformKey?: Function,
};
