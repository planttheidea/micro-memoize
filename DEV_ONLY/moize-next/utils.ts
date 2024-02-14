import type { Key } from "../../src";
import type { Moized } from "./internalTypes";

const slice = Array.prototype.slice;

/**
 * Compose functions into a single function.
 */
export function compose<Method>(...functions: Method[]): Method {
    return functions.reduce(function (f: any, g: any) {
        if (typeof f === 'function') {
            return typeof g === 'function'
                ? function (this: any) {
                      return f(g.apply(this, arguments));
                  }
                : f;
        }

        if (typeof g === 'function') {
            return g;
        }
    });
}

export function getArgs1<Fn extends (...args: any[]) => any>(args: IArguments | Parameters<Fn>): Key {
    return [args[0]];
}

export function getArgs2<Fn extends (...args: any[]) => any>(args: IArguments | Parameters<Fn>): Key {
    return [args[0], args[1]];
}

export function getArgs3<Fn extends (...args: any[]) => any>(args: IArguments | Parameters<Fn>): Key {
    return [args[0], args[1], args[2]];
}

export function getArgsN<Fn extends (...args: any[]) => any>(args: IArguments | Parameters<Fn>): Key {
    return args.length ? slice.call(args, 0) : [];
}

export function cloneKey<Fn extends (...args: any[]) => any>(args: IArguments | Parameters<Fn>): Key {
    const size = args.length;

    if (size === 1) {
        return getArgs1<Fn>(args);
    }

    if (size === 2) {
        return getArgs2<Fn>(args);
    }

    if (size === 3) {
        return getArgs3<Fn>(args);
    }

    return getArgsN<Fn>(args);
}

export function getMaxArgsTransformKey(maxArgs: number): (args: IArguments | Key) => Key {
    switch (maxArgs) {
        case 1:
            return getArgs1;
            
        case 2:
            return getArgs2;

        case 3:
            return getArgs3;

        default:
            return getArgsN;
    }
}

export function isMoized(fn: any): fn is Moized<any, any> {
  return typeof fn === 'function' && fn.isMemoized;
}