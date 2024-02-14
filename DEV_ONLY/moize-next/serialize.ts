import { Arg, type Key } from '../../src';

/**
 * Faster `Array.prototype.indexOf` implementation build for slicing / splicing
 */
function getCutoff(array: any[], value: any) {
    const { length } = array;

    for (let index = 0; index < length; ++index) {
        if (array[index] === value) {
            return index + 1;
        }
    }

    return 0;
}

/**
 * Custom replacer for the stringify function
 */
function createDefaultReplacer() {
    const cache: any[] = [];
    const keys: string[] = [];

    return function defaultReplacer(this: any, key: string, value: any) {
        const type = typeof value;

        if (type === 'function' || type === 'symbol') {
            return value.toString();
        }

        if (typeof value === 'object') {
            if (cache.length) {
                const thisCutoff = getCutoff(cache, this);

                if (thisCutoff === 0) {
                    cache[cache.length] = this;
                } else {
                    cache.splice(thisCutoff);
                    keys.splice(thisCutoff);
                }

                keys[keys.length] = key;

                const valueCutoff = getCutoff(cache, value);

                if (valueCutoff !== 0) {
                    return `[ref=${
                        keys.slice(0, valueCutoff).join('.') || '.'
                    }]`;
                }
            } else {
                cache[0] = value;
                keys[0] = key;
            }

            return value;
        }

        return '' + value;
    };
}

/**
 * Get the stringified version of the argument passed.
 */
function getStringifiedArgument<Type>(arg: Type) {
    if (!arg) {
        return arg;
    }

    const typeofArg = typeof arg;

    return typeofArg === 'object' || typeofArg === 'function'
        ? JSON.stringify(arg, createDefaultReplacer())
        : arg;
}

/**
 * Serialize the arguments passed.
 */
export function defaultArgumentSerializer(args: IArguments | Key): Key {
    const key: string[] = [];

    for (let index = 0; index < args.length; index++) {
        key.push(getStringifiedArgument<Arg>(args[index]));
    }

    return [key.join('|')];
}

/**
 * Whether the serialized keys are equal to one another.
 */
export function isSerializedKeyEqual(cacheKey: Key, key: Key) {
    return cacheKey[0] === key[0];
}
