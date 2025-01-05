# micro-memoize CHANGELOG

## 4.1.3

- [#121](https://github.com/planttheidea/micro-memoize/pull/121) - Avoid reference to broken source maps (fix for [#79](https://github.com/planttheidea/micro-memoize/issues/79))

## 4.1.2

- Republish of [#102](https://github.com/planttheidea/micro-memoize/pull/102)

## 4.1.1 (Bad version - do not use)

- [#102](https://github.com/planttheidea/micro-memoize/pull/102) - avoid publishing development-only files for less `node_modules` bloat

## 4.1.0

#### Enhancements

- Types now have direct exports instead of requiring the `MicroMemoize` namespace. That namespace has been labeled as deprecated, and will be removed in the next major version change in favor of the direct type exports.

#### Bugfixes

- [#97](https://github.com/planttheidea/micro-memoize/issues/97) - `src` files included in publish, and referenced from `*.d.ts` files
- `mjs/*d.ts` files renamed to `mjs/*.d.mts` to align with NodeJS standard
- [#101](https://github.com/planttheidea/micro-memoize/pull/101) - fixed benchmark using `mem` incorrectly for complex object parameters or multiple parameter calls

## 4.0.15

- [#99](https://github.com/planttheidea/micro-memoize/issues/99) - `mjs` import does not have typings surfaced

## 4.0.14

- Republish of [#87](https://github.com/planttheidea/micro-memoize/pull/87)

## 4.0.13 (Bad version - do not use)

- [#87](https://github.com/planttheidea/micro-memoize/pull/87) - Default generic values for exposed types, to avoid unintentional breaking changes from [#85](https://github.com/planttheidea/micro-memoize/pull/85)

## 4.0.12

- [#84](https://github.com/planttheidea/micro-memoize/pull/84) - Fix inferred typing of memoized function
- [#85](https://github.com/planttheidea/micro-memoize/pull/85) - Follow-up on [#84](https://github.com/planttheidea/micro-memoize/pull/84), further improving inferred typing via pass-throughs.

## 4.0.11

- Fix [#79](https://github.com/planttheidea/micro-memoize/issues/79) - Sourcemaps referencing incorrect hierarchy

## 4.0.10

- Fix [#76](https://github.com/planttheidea/micro-memoize/issues/76) - `noUncheckedIndexedAccess` support on TS 4.1+

## 4.0.9

- Update npm search keywords and documentation

## 4.0.8

- Improve typings to support `strict` mode in TypeScript

## 4.0.7

- Create more targeted `getKeyIndex` helpers for more speed in each key situation

## 4.0.6

- Use standard `then` interface (`.then(onFulfilled, onRejected)`) instead of ES spec (`.then(onFulfilled).catch(onRejected)`) for broader support

## 4.0.5

- Fix failure when `getKeyIndex` is used and no keys are in the cache

## 4.0.4

- Use `.pop()` to cap cache to `maxSize` when possible (slight performance improvement)

## 4.0.3

- Namespace types under `MicroMemoize` namespace (which is how it was for `4.0.0`, but it got lost)

## 4.0.2

- Make Cache class consumable in types

## 4.0.1

- Fix types for consumption

## 4.0.0

- Update to use `Cache` class instead of plain object (~10% performance improvement)

#### Breaking changes

- `memoized.cacheSnapshot` has been deprecated in favor of `memoized.cache.snapshot`
- Memoizing an already-memoized function no longer returns the function passed (now composes, see [Composition](README.md#composition))

#### Enhancements

- You can now compose memoized functions with their options (see [Composition](README.md#composition))

## 3.0.2

- Fix types declarations to ensure signature of `fn` passed is retained
- Throw an error when the first parameter passed is not a function

## 3.0.1

- Fix types declaration for `Options` to allow custom keys / indices

## 3.0.0

- Rewrite in TypeScript
- Use `rollup` for builds of all packages

#### BREAKING CHANGES

- CommonJS `require`s no longer require `.default`
- Types contract is much stricter
- Utility methods are no longer deep-linkable
  - Not technically exposed in the API, but was relied upon by other libraries)

## 2.1.2

- Fix issue where `isMatchingKey` was not being used with promise updater
- Remove requirement of `Object.assign` existing globally
- Add common use-case static handlers for up to 3 arguments, falling back to pre-existing dynamic handlers for more (faster comparison / argument cloning)

## 2.1.1

- Upgrade to babel 7
- Add `"sideEffects": false` for better tree-shaking with webpack

## 2.1.0

- Add ESM support for NodeJS with separate [`.mjs` extension](https://nodejs.org/api/esm.html) exports

## 2.0.4

- Fix issue with recursive calls to memoized function created discrepancy between `keys` and `values` in cache

## 2.0.3

- More TypeScript typings (thanks again [@rtorr](https://github.com/rtorr))

## 2.0.2

- Fix TypeScript typings (thanks [@rtorr](https://github.com/rtorr))

## 2.0.1

- Fix TypeScript typings (thanks [@Crecket](https://github.com/Crecket))

## 2.0.0

- Add [`isMatchingKey`](#ismatchingkey) method to provide match test on entire key vs iterative equality

**BREAKING CHANGES**

- The return value from `transformKey` must be an `Array` (would previously coalesce it for you)

**NEW FEATURES**

- `isMatchingKey` will matching on entire key vs `isEqual`, which does an iterative comparison of arguments in order
- Add `size` property to `cache`

## 1.8.1

- Fix `getKeyIndex` being passed as `memoize` for promises

## 1.8.0

- Include the memoized function itself as the third parameter to `onCacheAdd`, `onCacheChange`, and `onCacheHit` firings

## 1.7.0

- Fire `onCacheHit` and `onCacheChange` when promise functions successfully resolve

## 1.6.3

- Replace native `slice` usages with `cloneArray` utility

## 1.6.2

- Convert `dist` files to be built using [`rollup`](https://github.com/rollup/rollup) instead of webpack

## 1.6.1

- Optimize `slice` calls for key storage (performance)

## 1.6.0

- Add [`onCacheAdd`](README.md#oncacheadd) option
- Pass through unused properties in `options` for higher-order memoization library usage

## 1.5.0

- Add [`onCacheHit`](README.md#oncachehit) option

## 1.4.0

- Add `options` as second parameter to `onCacheChanged`

## 1.3.2

- Make additional properties (`cache`, `cacheSnapshot`, `isMemoized`, `options`) configurable for higher-order memoization library usage

## 1.3.1

- Only reorder keys when matching cache entry is not first key

## 1.3.0

- Add [`onCacheChange`](README.md#oncachechange) option

## 1.2.0

- Add [`isPromise`](README.md#ispromise) option
- Add typings for Flowtype and TypeScript

## 1.1.0

- Add [`transformKey`](README.md#transformkey) option

## 1.0.1

- Delay argument-to-key generation until stored as new cache value (speed improvement of ~35%)

## 1.0.0

- Initial release
