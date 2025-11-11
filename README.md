# micro-memoize

A tiny, crazy [fast](#benchmarks) memoization library for the 95% use-case

## Table of contents

- [micro-memoize](#micro-memoize)
  - [Table of contents](#table-of-contents)
  - [Summary](#summary)
  - [Importing](#importing)
  - [Usage](#usage)
    - [Types](#types)
    - [Composition](#composition)
  - [Options](#options)
    - [async](#async)
    - [isArgEqual](#isargequal)
    - [isKeyEqual](#iskeyequal)
    - [maxSize](#maxsize)
    - [transformKey](#transformkey)
  - [Additional properties](#additional-properties)
    - [memoized.cache](#memoizedcache)
      - [memoized.cache.on](#memoizedcacheon)
        - [add](#add)
        - [delete](#delete)
        - [hit](#hit)
        - [update](#update)
      - [memoized.cache.snapshot](#memoizedcachesnapshot)
    - [memoized.fn](#memoizedfn)
    - [memoized.isMemoized](#memoizedismemoized)
    - [memoized.options](#memoizedoptions)
  - [Benchmarks](#benchmarks)
    - [Single primitive parameter](#single-primitive-parameter)
    - [Single array parameter](#single-array-parameter)
    - [Single object parameter](#single-object-parameter)
    - [Multiple primitive parameters](#multiple-primitive-parameters)
    - [Multiple array parameters](#multiple-array-parameters)
    - [Multiple object parameters](#multiple-object-parameters)
  - [Browser support](#browser-support)
  - [Node support](#node-support)
  - [Development](#development)

## Summary

As the author of [`moize`](https://github.com/planttheidea/moize), I created a consistently fast memoization library, but `moize` has a lot of features to satisfy a large number of edge cases. `micro-memoize` is a simpler approach, focusing on the core feature set with a much smaller footprint (~1.37kB minified+gzipped). Stripping out these edge cases also allows `micro-memoize` to be faster across the board than `moize`.

## Importing

ESM:

```ts
import { memoize } from 'micro-memoize';
```

CommonJS:

```ts
const { memoize } = require('micro-memoize');
```

## Usage

```ts
const assembleToObject = (one: string, two: string) => ({ one, two });

const memoized = memoize(assembleToObject);

console.log(memoized('one', 'two')); // {one: 'one', two: 'two'}
console.log(memoized('one', 'two')); // pulled from cache, {one: 'one', two: 'two'}
```

### Composition

Starting in `4.0.0`, you can compose memoized functions if you want to have multiple types of memoized versions based on different options.

```ts
const simple = memoized(fn); // { maxSize: 1 }
const upToFive = memoized(simple, { maxSize: 5 }); // { maxSize: 5 }
const withCustomEquals = memoized(upToFive, { isEqual: deepEqual }); // { maxSize: 5, isEqual: deepEqual }
```

**NOTE**: The original function is the function used in the composition, the composition only applies to the options. In the example above, `upToFive` does not call `simple`, it calls `fn`.

## Options

### async

`boolean`, _defaults to `false`_

Identifies the value returned from the method as a `Promise`, which will result in one of two possible scenarios:

- If the promise is resolved, it will fire the `onCacheHit` and `onCacheChange` options
- If the promise is rejected, it will trigger auto-removal from cache

```ts
const fn = async (one: string, two: string) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error(JSON.stringify({ one, two })));
    }, 500);
  });
};

const memoized = memoize(fn, { isPromise: true });

memoized('one', 'two');

console.log(memoized.cache.snapshot.keys); // [['one', 'two']]
console.log(memoized.cache.snapshot.values); // [Promise]

setTimeout(() => {
  console.log(memoized.cache.snapshot.keys); // []
  console.log(memoized.cache.snapshot.values); // []
}, 1000);
```

**NOTE**: If you don't want rejections to auto-remove the entry from cache, set `isPromise` to `false` (or simply do not set it), but be aware this will also remove the cache listeners that fire on successful resolution.

### isArgEqual

`function(object1: any, object2: any): boolean`, _defaults to `isSameValueZero`_

Custom method to compare equality of keys, determining whether to pull from cache or not, by comparing each argument in order.

Common use-cases:

- Deep equality comparison
- Limiting the arguments compared

```ts
import { deepEqual } from 'fast-equals';

type ContrivedObject = {
  deep: string;
};

const deepObject = (object: {
  foo: ContrivedObject;
  bar: ContrivedObject;
}) => ({
  foo: object.foo,
  bar: object.bar,
});

const memoizedDeepObject = memoize(deepObject, { isEqual: deepEqual });

console.log(
  memoizedDeepObject({
    foo: {
      deep: 'foo',
    },
    bar: {
      deep: 'bar',
    },
    baz: {
      deep: 'baz',
    },
  }),
); // {foo: {deep: 'foo'}, bar: {deep: 'bar'}}

console.log(
  memoizedDeepObject({
    foo: {
      deep: 'foo',
    },
    bar: {
      deep: 'bar',
    },
    baz: {
      deep: 'baz',
    },
  }),
); // pulled from cache
```

**NOTE**: The default method tests for [SameValueZero](http://ecma-international.org/ecma-262/7.0/#sec-samevaluezero) equality, which is summarized as strictly equal while also considering `NaN` equal to `NaN`.

### isKeyEqual

`function(object1: any[], object2: any[]): boolean`

Custom method to compare equality of keys, determining whether to pull from cache or not, by comparing the entire key.

Common use-cases:

- Comparing the shape of the key
- Matching on values regardless of order
- Serialization of arguments

```ts
import { deepEqual } from 'fast-equals';

type ContrivedObject = { foo: string; bar: number };

const deepObject = (object: ContrivedObject) => ({
  foo: object.foo,
  bar: object.bar,
});

const memoizedShape = memoize(deepObject, {
  // receives the full key in cache and the full key of the most recent call
  isMatchingKey(key1, key2) {
    const object1 = key1[0];
    const object2 = key2[0];

    return (
      object1.hasOwnProperty('foo') &&
      object2.hasOwnProperty('foo') &&
      object1.bar === object2.bar
    );
  },
});

console.log(
  memoizedShape({
    foo: 'foo',
    bar: 123,
    baz: 'baz',
  }),
); // {foo: {deep: 'foo'}, bar: {deep: 'bar'}}

console.log(
  memoizedShape({
    foo: 'not foo',
    bar: 123,
    baz: 'baz',
  }),
); // pulled from cache
```

### maxSize

`number`, _defaults to `1`_

The number of values to store in cache, based on a [Least Recently Used](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_Recently_Used_.28LRU.29) basis. This operates the same as [`maxSize`](https://github.com/planttheidea/moize#maxsize) on `moize`.

```ts
const manyPossibleArgs = (one: string, two: string) => [one, two];

const memoized = memoize(manyPossibleArgs, { maxSize: 3 });

console.log(memoized('one', 'two')); // ['one', 'two']
console.log(memoized('two', 'three')); // ['two', 'three']
console.log(memoized('three', 'four')); // ['three', 'four']

console.log(memoized('one', 'two')); // pulled from cache
console.log(memoized('two', 'three')); // pulled from cache
console.log(memoized('three', 'four')); // pulled from cache

console.log(memoized('four', 'five')); // ['four', 'five'], drops ['one', 'two'] from cache
```

### transformKey

`function(Array<any>): any`

A method that allows you transform the key that is used for caching, if you want to use something other than the pure arguments.

```ts
const ignoreFunctionArgs = (one: string, two: () => {}) => [one, two];

const memoized = memoize(ignoreFunctionArgs, {
  transformKey: (args) => [JSON.stringify(args[0])],
});

console.log(memoized('one', () => {})); // ['one', () => {}]
console.log(memoized('one', () => {})); // pulled from cache, ['one', () => {}]
```

If your transformed keys require something other than `SameValueZero` equality, you can combine `transformKey` with [`isEqual`](#isequal) for completely custom key creation and comparison.

```ts
const ignoreFunctionArg = (one: string, two: () => void) => [one, two];

const memoized = memoize(ignoreFunctionArg, {
  isMatchingKey: (key1, key2) => key1[0] === key2[0],
  // Cache based on the serialized first parameter
  transformKey: (args) => [JSON.stringify(args[0])],
});

console.log(memoized('one', () => {})); // ['one', () => {}]
console.log(memoized('one', () => {})); // pulled from cache, ['one', () => {}]
```

## Additional properties

### memoized.cache

`Object`

The `cache` object that is used internally. The shape of this structure:

```ts
{
  keys: any[][], // available as MicroMemoize.Key[]
  values: any[] // available as MicroMemoize.Value[]
}
```

The exposure of this object is to allow for manual manipulation of keys/values (injection, removal, expiration, etc).

```ts
const method = (one: string, two: string) => ({ one, two });

const memoized = memoize(method);

memoized.cache.keys.push(['one', 'two']);
memoized.cache.values.push('cached');

console.log(memoized('one', 'two')); // 'cached'
```

**NOTE**: `moize` offers a variety of convenience methods for this manual `cache` manipulation, and while `micro-memoize` allows all the same capabilities by exposing the `cache`, it does not provide any convenience methods.

#### memoized.cache.on

Add listeners to specific cache events, in case you want to perform side-effects.

### add

Executes whenever the cache is added to.

```ts
const fn = (one: string, two: string) => [one, two];

const memoized = memoize(fn, { maxSize: 2 });

memoized.cache.on('add', (event) => {
  console.log('cache has been added to: ', JSON.stringify(event));
});

memoized('foo', 'bar'); // cache has been added to
memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('bar', 'foo'); // cache has been added to
memoized('bar', 'foo');
memoized('bar', 'foo');
memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('foo', 'bar');
```

### delete

Executes whenever the cache has an entry removed.

```ts
const fn = (one: string, two: string) => [one, two];

const memoized = memoize(fn);

memoized.cache.on('delete', (event) => {
  console.log('cache has changed: ', JSON.stringify(event));
});

memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('foo', 'bar');
memoized('bar', 'foo'); // cache has changed
memoized('bar', 'foo');
memoized('bar', 'foo');
memoized('foo', 'bar'); // cache has changed
memoized('foo', 'bar');
memoized('foo', 'bar');
```

**NOTE**: This method is not executed when the `cache` is manually manipulated, only when changed via calling the memoized method. When the execution of other cache listeners (`onCacheAdd`, `onCacheHit`) is applicable, this method will execute after those methods.

### hit

Executes whenever the cache is hit, whether the order is updated or not.

```ts
const fn = (one: string, two: string) => [one, two];

const memoized = memoize(fn, { maxSize: 2 });

memoized.cache.on('update', (event) => {
  console.log('cache entry found: ', JSON.stringify(event));
});

memoized('foo', 'bar');
memoized('foo', 'bar'); // cache entry was found
memoized('foo', 'bar'); // cache entry was found
memoized('bar', 'foo');
memoized('bar', 'foo'); // cache entry was found
memoized('bar', 'foo'); // cache entry was found
memoized('foo', 'bar'); // cache entry was found
memoized('foo', 'bar'); // cache entry was found
memoized('foo', 'bar'); // cache entry was found
```

### update

Executes whenever the cache has the order of entries change due to an older entry being accessed more recently.

```ts
const fn = (one: string, two: string) => [one, two];

const memoized = memoize(fn, { maxSize: 2 });

memoized.cache.on('update', (event) => {
  console.log('cache has changed: ', JSON.stringify(event));
});

memoized('foo', 'bar');
memoized('bar', 'foo'); // cache has changed
memoized('bar', 'foo');
memoized('bar', 'foo');
memoized('foo', 'bar'); // cache has changed
memoized('foo', 'bar');
memoized('foo', 'bar');
```

**NOTE**: This method is not executed when the `cache` is manually manipulated, only when changed via calling the memoized method.

#### memoized.cache.snapshot

`Object`

Provide a persistent snapshot of the values at that time. This is useful when tracking the cache changes over time, as the `cache` object is mutated internally for performance reasons.

### memoized.fn

`function`

The original function passed to be memoized.

### memoized.isMemoized

`boolean`

Hard-coded to `true` when the function is memoized. This is useful for introspection, to identify if a method has been memoized or not.

### memoized.options

`Object`

The [`options`](#options) passed when creating the memoized method.

## Benchmarks

All values provided are the number of operations per second (ops/sec) calculated by the [Benchmark suite](https://benchmarkjs.com/). Note that `underscore`, `lodash`, and `ramda` do not support mulitple-parameter memoization (which is where `micro-memoize` really shines), so they are not included in those benchmarks.

Benchmarks was performed on an i9 16-core Linux laptop with 64GB of memory using NodeJS version `24.11.0`. The default configuration of each library was tested with a fibonacci calculation based on the following parameters:

- Single primitive = `35`
- Single object = `{number: 35}`
- Multiple primitives = `35, true`
- Multiple objects = `{number: 35}, {isComplete: true}`

**NOTE**: Not all libraries tested support multiple parameters out of the box, but support the ability to pass a custom `resolver`. Because these often need to resolve to a string value, [a common suggestion](https://github.com/lodash/lodash/issues/2115) is to just `JSON.stringify` the arguments, so that is what is used when needed.

### Single primitive parameter

```bash
┌─────────┬─────────────────┬─────────────────┐
│ (index) │ Package         │ Ops/sec         │
├─────────┼─────────────────┼─────────────────┤
│ 0       │ 'micro-memoize' │ 22339461.050674 │
│ 1       │ 'fast-memoize'  │ 20131998.08349  │
│ 2       │ 'lru-memoize'   │ 19648848.50776  │
│ 3       │ 'mem'           │ 19628813.236273 │
│ 4       │ 'lodash'        │ 17815347.32094  │
│ 5       │ 'underscore'    │ 17277107.636731 │
│ 6       │ 'ramda'         │ 16146863.169399 │
│ 7       │ 'addy osmani'   │ 15677020.310172 │
│ 8       │ 'memoizee'      │ 15025344.685345 │
│ 9       │ 'memoizerific'  │ 9416638.862002  │
└─────────┴─────────────────┴─────────────────┘
Fastest was "micro-memoize".
```

### Single array parameter

```bash
┌─────────┬─────────────────┬─────────────────┐
│ (index) │ Package         │ Ops/sec         │
├─────────┼─────────────────┼─────────────────┤
│ 0       │ 'micro-memoize' │ 18107869.305642 │
│ 1       │ 'lodash'        │ 16013767.234523 │
│ 2       │ 'lru-memoize'   │ 15813274.251587 │
│ 3       │ 'memoizee'      │ 12648234.359664 │
│ 4       │ 'memoizerific'  │ 8830490.418083  │
│ 5       │ 'mem'           │ 5315469.999401  │
│ 6       │ 'ramda'         │ 4970058.738857  │
│ 7       │ 'underscore'    │ 4634034.220672  │
│ 8       │ 'addy osmani'   │ 4211267.675523  │
│ 9       │ 'fast-memoize'  │ 2582107.271755  │
└─────────┴─────────────────┴─────────────────┘
Fastest was "micro-memoize".
```

### Single object parameter

```bash
┌─────────┬─────────────────┬─────────────────┐
│ (index) │ Package         │ Ops/sec         │
├─────────┼─────────────────┼─────────────────┤
│ 0       │ 'micro-memoize' │ 18146820.870404 │
│ 1       │ 'lodash'        │ 16474684.838111 │
│ 2       │ 'lru-memoize'   │ 15009638.772225 │
│ 3       │ 'memoizee'      │ 12421246.214537 │
│ 4       │ 'memoizerific'  │ 8953238.444208  │
│ 5       │ 'mem'           │ 4188000.599823  │
│ 6       │ 'ramda'         │ 3901543.841238  │
│ 7       │ 'underscore'    │ 3663290.473278  │
│ 8       │ 'addy osmani'   │ 3206201.128022  │
│ 9       │ 'fast-memoize'  │ 2281321.7395    │
└─────────┴─────────────────┴─────────────────┘
Fastest was "micro-memoize".
```

### Multiple primitive parameters

```bash
┌─────────┬─────────────────┬─────────────────┐
│ (index) │ Package         │ Ops/sec         │
├─────────┼─────────────────┼─────────────────┤
│ 0       │ 'micro-memoize' │ 16819457.04594  │
│ 1       │ 'lru-memoize'   │ 16566652.504496 │
│ 2       │ 'memoizee'      │ 9314567.770051  │
│ 3       │ 'memoizerific'  │ 6919904.142539  │
│ 4       │ 'addy osmani'   │ 5432062.608103  │
│ 5       │ 'mem'           │ 5098045.189683  │
│ 6       │ 'ramda'         │ 2175465.788265  │
│ 7       │ 'lodash'        │ 2057530.677261  │
│ 8       │ 'fast-memoize'  │ 1979279.071327  │
│ 9       │ 'underscore'    │ 1979124.876948  │
└─────────┴─────────────────┴─────────────────┘
Fastest was "micro-memoize".
```

### Multiple array parameters

```bash
┌─────────┬─────────────────┬─────────────────┐
│ (index) │ Package         │ Ops/sec         │
├─────────┼─────────────────┼─────────────────┤
│ 0       │ 'micro-memoize' │ 16093289.293139 │
│ 1       │ 'lru-memoize'   │ 15739671.222008 │
│ 2       │ 'memoizee'      │ 9256283.775659  │
│ 3       │ 'memoizerific'  │ 7503036.231682  │
│ 4       │ 'mem'           │ 4339662.731408  │
│ 5       │ 'addy osmani'   │ 2659719.638446  │
│ 6       │ 'ramda'         │ 2005015.031479  │
│ 7       │ 'lodash'        │ 1800600.567902  │
│ 8       │ 'underscore'    │ 1751301.686092  │
│ 9       │ 'fast-memoize'  │ 1736208.519866  │
└─────────┴─────────────────┴─────────────────┘
Fastest was "micro-memoize".
```

### Multiple object parameters

```bash
┌─────────┬─────────────────┬─────────────────┐
│ (index) │ Package         │ Ops/sec         │
├─────────┼─────────────────┼─────────────────┤
│ 0       │ 'micro-memoize' │ 16479039.098427 │
│ 1       │ 'lru-memoize'   │ 16402826.829361 │
│ 2       │ 'memoizee'      │ 9339148.585288  │
│ 3       │ 'memoizerific'  │ 7496273.774758  │
│ 4       │ 'mem'           │ 3072611.80029   │
│ 5       │ 'addy osmani'   │ 2064427.477477  │
│ 6       │ 'ramda'         │ 1655977.714224  │
│ 7       │ 'lodash'        │ 1527122.351717  │
│ 8       │ 'underscore'    │ 1486597.083487  │
│ 9       │ 'fast-memoize'  │ 1475414.89725   │
└─────────┴─────────────────┴─────────────────┘
Fastest was "micro-memoize".
```

## Browser support

- Chrome 47+
- Firefox 15+
- Edge 12+
- Opera 34+
- Safari 10+

## Node support

- 6+

## Development

Standard stuff, clone the repo and `npm install` dependencies. The npm scripts available:

- `benchmark` => run benchmarks against well-known alternative packages
- `build` => run `rollup` to build the `dist` files
- `build:cjs` => run `rollup` to build the `dist` files specific to CJS requires
- `build:esm` => run `rollup` to build the `dist` files specific to ESM imports
- `build:min` => run `rollup` to build the `dist` files specific to pre-minified files
- `build:umd` => run `rollup` to build the `dist` files specific to legacy environments, such as Node 10
- `clean`: remove `dist` folder
- `clean:cjs`: remove `dist/cjs` folder
- `clean:esm`: remove `dist/esm` folder
- `clean:min`: remove `dist/min` folder
- `clean:umd`: remove `dist/umd` folder
- `dev` => run webpack dev server to run example app (playground!)
- `dist` => runs `build` and `build-minified`
- `lint` => run ESLint against all files in the `src` folder
- `release` => runs the release process, which publishes the latest version of the package
- `release:beta` => runs the beta release process, which publishes the next beta version of the package
- `release:scripts` => run the precursor tasks as part of the release process
- `test` => run unit tests
- `test:coverage` => run `test` but with coverage
- `test:watch` => run `test` but with persistent watcher
- `typecheck` => run `tsc` to verify types are valid
