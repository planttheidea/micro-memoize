/*
 * memoize.js
 * by @philogb and @addyosmani
 * with further optimizations by @mathias
 * and @DmitryBaranovsk
 * perf tests: http://bit.ly/q3zpG3
 * Released under an MIT license.
 */
module.exports = function memoize(fn) {
  fn.cache || (fn.cache = {});

  return function() {
    let index = arguments.length;
    let hash = '';
    let currentArg = null;

    while (index--) {
      currentArg = arguments[index];
      hash +=
        currentArg === Object(currentArg)
          ? JSON.stringify(currentArg)
          : currentArg;
    }

    return hash in fn.cache
      ? fn.cache[hash]
      : (fn.cache[hash] = fn.apply(this, arguments));
  };
};
