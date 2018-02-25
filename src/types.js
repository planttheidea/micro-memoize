// @flow

export type Cache = {
  keys: Array<any>,
  values: Array<any>
};

export type Options = {
  isEqual: Function,
  isPromise: boolean,
  maxSize: number,
  onCacheAdd: Function,
  onCacheChange: Function,
  onCacheHit: Function,
  transformKey: ?Function
};
