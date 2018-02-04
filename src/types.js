// @flow

export type Cache = {
  keys: Array<any>,
  values: Array<any>
};

export type Options = {
  isEqual: Function,
  isPromise: boolean,
  maxSize: number,
  onCacheChange: Function,
  transformKey: ?Function
};
