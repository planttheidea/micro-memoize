import { deepEqual, shallowEqual } from 'fast-equals';
import memoize from '../../src';
import { Cache } from './Cache';
import type { Moize, Moized, Options } from './internalTypes';
import { isMoized } from './utils';
import { getDefaultProfileName } from './stats';

function getIsArgEqual<Fn extends (...args: any[]) => any>(options: Options<Fn>) {
  const defaultIsArgEqual = options.isArgEqual;

  if (typeof defaultIsArgEqual === 'function') {
    return defaultIsArgEqual;
  }

  if (defaultIsArgEqual === 'deep') {
    return deepEqual;
  }
  
  if (defaultIsArgEqual === 'shallow') {
    return shallowEqual;
  }
}

const moize: Moize = function moize<
  Fn extends (...args: any[]) => any,
  Opts extends Options<Fn>,
>(
  fn: Fn | Moized<Fn, Opts>,
  options: Opts = {} as Opts,
): Moized<Fn, Opts> {
  if (isMoized(fn)) {
    return moize(fn.fn, Object.assign({}, fn.options, options));
  }

  const normalizedOptions = Object.assign({}, options, { 
    isArgEqual: getIsArgEqual(options),
    profileName: options.profileName || getDefaultProfileName(fn),
  });
  const moized = memoize(fn, normalizedOptions) as unknown as Moized<Fn, Opts>;

  moized.cache = new Cache(normalizedOptions);
  moized.isMoized = true;

  return moized;
};

moize.isMoized = function(fn: any): fn is Moized<any, any> {
  return typeof fn === 'function' && fn.isMoized;
}

export default moize;

