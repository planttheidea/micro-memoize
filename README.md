# micro-memoize

A tiny, crazy [fast](#benchmarks) memoization library for the 95% use-case

## Table of contents

* [Summary](#summary)
* [Usage](#usage)
* [Options](#options)
  * [isEqual](#isequal)
  * [maxSize](#maxsize)
* [Additional properties](#additional-properties)
  * [cache](#cache)
  * [cacheSnapshot](#cachesnapshot)
  * [isMemoized](#ismemoized)
  * [options](#options)
* [Benchmarks](#benchmarks)
  * [Single parameter](#single-parameter)
  * [Multiple parameters (primitives only)](#multiple-parameters-primitives-only)
  * [Multiple parameters (complex objects)](#multiple-parameters-complex-objects)
* [Browser support](#browser-support)
* [Node support](#node-support)
* [Development](#development)

## Summary

As the author of [`moize`](https://github.com/planttheidea/moize), I created a consistently fast memoization library, but `moize` has a lot of features to satisfy a large number of edge cases. `micro-memoize` is a simpler approach, focusing on the core feature set with a much smaller footprint (959 _bytes_ minified+gzipped).

It also is the fastest memoization library I've benchmarked (even faster than `moize`) in all supported scenarios.

## Usage

```javascript
// ES2015+
import memoize from 'micro-memoize';

// CommonJS
const memoize = require('micro-memoize').default;

// old-school
const memoize = window.memoize;

const assembleToObject = (one, two) => {
  return {one, two};
};

const memoized = memoize(assembleToObject);

console.log(memoized('one', 'two')); // {one: 'one', two: 'two'}
console.log(memoized('one', 'two')); // pulled from cache => {one: 'one', two: 'two'}
```

## Options

#### isEqual

`function(object1: any, object2: any): boolean`, _defaults to `isSameValueZero`_

Custom method to compare equality of keys, determining whether to pull from cache or not. This operates the same as [`equals`](https://github.com/planttheidea/moize#equals) from `moize`.

Common use-cases:

* Deep equality comparison
* Limiting the arguments compared
* Serialization of arguments

```javascript
import {deepEqual} from 'fast-equals';

const deepObject = (object) => {
  return {
    foo: object.foo,
    bar: object.bar
  };
};

const memoizedDeepObject = memoize(deepObject, {isEqual: deepEqual});

console.log(
  memoizedDeepObject({
    foo: {
      deep: 'foo'
    },
    bar: {
      deep: 'bar'
    },
    baz: {
      deep: 'baz'
    }
  })
); // {foo: {deep: 'foo'}, bar: {deep: 'bar'}}

console.log(
  memoizedDeepObject({
    foo: {
      deep: 'foo'
    },
    bar: {
      deep: 'bar'
    },
    baz: {
      deep: 'baz'
    }
  })
); // pulled from cache
```

**NOTE**: The default method tests for [SameValueZero](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero) equality, which is summarized as strictly equal while also considering `NaN` equal to `NaN`.

#### maxSize

`number`, _defaults to `1`_

The number of values to store in cache, based on a [Least Recently Used](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_Recently_Used_.28LRU.29) basis. This operates the same as [`maxSize`](https://github.com/planttheidea/moize#maxsize) on `moize`, with the exception of the default being different.

```javascript
const manyPossibleArgs = (one, two) => {
  return [one, two];
};

const memoized = memoize(manyPossibleArgs, {maxSize: 3});

console.log(memoized('one', 'two')); // ['one', 'two']
console.log(memoized('two', 'three')); // ['two', 'three']
console.log(memoized('three', 'four')); // ['three', 'four']

console.log(memoized('one', 'two')); // pulled from cache
console.log(memoized('two', 'three')); // pulled from cache
console.log(memoized('three', 'four')); // pulled from cache

console.log(memoized('four', 'five')); // ['four', 'five'], drops ['one', 'two'] from cache
```

**NOTE**: The default for `micro-memoize` differs from the default implementation of `moize`. `moize` will store an infinite number of results unless restricted, whereas `micro-memoize` will only store the most recent result. In this way, the default implementation of `micro-memoize` operates more like [`moize.simple`](https://github.com/planttheidea/moize#moizesimple).

## Additional properties

#### cache

`Object`

The `cache` object that is used internally. The shape of this structure:

```javascript
{
  keys: Array<Array<any>>, // array of arg arrays
  values: Array<any> // array of values
}
```

The exposure of this object is to allow for manual manipulation of keys/values (injection, removal, expiration, etc).

```javascript
const method = (one, two) => {
  return {one, two};
};

const memoized = memoize(method);

memoized.cache.keys.push(['one', 'two']);
memoized.cache.values.push('cached');

console.log(memoized('one', 'two')); // 'cached'
```

**HOTE**: `moize` offers a variety of convenience methods for this manual `cache` manipulation, and while `micro-memoize` allows all the same capabilities by exposing the `cache`, it does not provide any convenience methods.

#### cacheSnapshot

`Object`

This is identical to the `cache` object referenced above, but it is a deep clone created at request, which will provide a persistent snapshot of the values at that time. This is useful when tracking the cache changes over time, as the `cache` object is mutated internally for performance reasons.

#### isMemoized

`boolean`

Hard-coded to `true` when the function is memoized. This is useful for introspection, to identify if a method has been memoized or not.

#### options

`Object`

The [`options`](#options) passed when creating the memoized method.

## Benchmarks

All values provided are the number of operations per second (ops/sec) calculated by the [Benchmark suite](https://benchmarkjs.com/). Note that `underscore`, `lodash`, and `ramda` do not support mulitple-parameter memoization, so they are not included in those benchmarks.

Each benchmark was performed using the default configuration of the library, with a fibonacci calculation based on a starting parameter of `35`, and in the case of multiple parameters a second parameter (`boolean` for primitives, `object` for complex objects) was used.

#### Single parameter

|                    | Operations / second | Relative margin of error |
|--------------------|---------------------|--------------------------|
| **micro-memoize**  | **42,418,881**      | **0.63%**                |
| fast-memoize       | 39,213,355          | 0.57%                    |
| moize              | 29,118,565          | 0.72%                    |
| lodash             | 24,144,216          | 0.52%                    |
| underscore         | 22,867,768          | 0.94%                    |
| memoizee           | 16,130,060          | 0.69%                    |
| lru-memoize        |  8,850,221          | 1.13%                    |
| Addy Osmani        |  6,400,200          | 0.67%                    |
| memoizerific       |  4,767,238          | 0.82%                    |
| ramda              |  1,038,438          | 0.79%                    |

#### Multiple parameters (primitives only)

|                    | Operations / second | Relative margin of error |
|--------------------|---------------------|--------------------------|
| **micro-memoize**  | **28,103,063**      | **0.78%**                |
| moize              | 20,589,607          | 0.93%                    |
| memoizee           |  9,282,774          | 0.61%                    |
| lru-memoize        |  6,674,788          | 1.49%                    |
| memoizerific       |  3,535,136          | 0.88%                    |
| Addy Osmani        |  3,205,031          | 0.98%                    |
| fast-memoize       |  1,039,039          | 0.71%                    |

#### Multiple parameters (complex objects)

|                    | Operations / second | Relative margin of error |
|--------------------|---------------------|--------------------------|
| **micro-memoize**  | **28,504,863**      | **0.88%**                |
| moize              | 21,126,388          | 0.79%                    |
| memoizee           |  7,145,023          | 0.61%                    |
| lru-memoize        |  6,623,210          | 1.57%                    |
| memoizerific       |  3,011,415          | 0.86%                    |
| Addy Osmani        |  1,471,939          | 1.03%                    |
| fast-memoize       |    882,447          | 0.69%                    |

## Browser support

* Chrome (all versions)
* Firefox (all versions)
* Edge (all versions)
* Opera 15+
* IE 9+
* Safari 6+
* iOS 8+
* Android 4+

## Node support

* 4+

## Development

Standard stuff, clone the repo and `npm install` dependencies. The npm scripts available:
* `build` => run webpack to build development `dist` file with NODE_ENV=development
* `build:minifed` => run webpack to build production `dist` file with NODE_ENV=production
* `dev` => run webpack dev server to run example app (playground!)
* `dist` => runs `build` and `build-minified`
* `lint` => run ESLint against all files in the `src` folder
* `prepublish` => runs `compile-for-publish`
* `prepublish:compile` => run `lint`, `test`, `transpile:es`, `transpile:lib`, `dist`
* `test` => run AVA test functions with `NODE_ENV=test`
* `test:coverage` => run `test` but with `nyc` for coverage checker
* `test:watch` => run `test`, but with persistent watcher
* `transpile:lib` => run babel against all files in `src` to create files in `lib`
* `transpile:es` => run babel against all files in `src` to create files in `es`, preserving ES2015 modules (for [`pkg.module`](https://github.com/rollup/rollup/wiki/pkg.module))
