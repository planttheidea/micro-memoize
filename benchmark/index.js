'use strict';

const Benchmark = require('benchmark');
const Table = require('cli-table2');
const ora = require('ora');

const underscore = require('underscore').memoize;
const lodash = require('lodash').memoize;
const ramda = require('ramda').memoize;
const memoizee = require('memoizee');
const fastMemoize = require('fast-memoize');
const addyOsmani = require('./addy-osmani');
const memoizerific = require('memoizerific');
const lruMemoize = require('lru-memoize').default;
const microMemoize = require('../lib').default;

const deepEquals = require('lodash').isEqual;
const fastDeepEqual = require('fast-equals').deepEqual;
const hashItEquals = require('hash-it').isEqual;

const showResults = (benchmarkResults) => {
  const table = new Table({
    head: ['Name', 'Ops / sec', 'Relative margin of error', 'Sample size']
  });

  benchmarkResults.forEach((result) => {
    const name = result.target.name;
    const opsPerSecond = result.target.hz.toLocaleString('en-US', {
      maximumFractionDigits: 0
    });
    const relativeMarginOferror = `± ${result.target.stats.rme.toFixed(2)}%`;
    const sampleSize = result.target.stats.sample.length;

    table.push([name, opsPerSecond, relativeMarginOferror, sampleSize]);
  });

  console.log(table.toString()); // eslint-disable-line no-console
};

const sortDescResults = (benchmarkResults) => {
  return benchmarkResults.sort((a, b) => {
    return a.target.hz < b.target.hz ? 1 : -1;
  });
};

const spinner = ora('Running benchmark');

let results = [];

const onCycle = (event) => {
  results.push(event);
  ora(event.target.name).succeed();
};

const onComplete = () => {
  spinner.stop();

  const orderedBenchmarkResults = sortDescResults(results);

  showResults(orderedBenchmarkResults);
};

const fibonacciSinglePrimitive = (number) => {
  return number < 2 ? number : fibonacciSinglePrimitive(number - 1) + fibonacciSinglePrimitive(number - 2);
};

const fibonacciSingleObject = (object) => {
  return object.number < 2
    ? object.number
    : fibonacciSingleObject({number: object.number - 1}) + fibonacciSingleObject({number: object.number - 2});
};

const fibonacciMultiplePrimitive = (number, isComplete) => {
  if (isComplete) {
    return number;
  }

  const firstValue = number - 1;
  const secondValue = number - 2;

  return (
    fibonacciMultiplePrimitive(firstValue, firstValue < 2) + fibonacciMultiplePrimitive(secondValue, secondValue < 2)
  );
};

const fibonacciMultipleObject = (object, check) => {
  if (check.isComplete) {
    return object.number;
  }

  const firstValue = object.number - 1;
  const secondValue = object.number - 2;

  return (
    fibonacciMultipleObject({number: firstValue}, {isComplete: firstValue < 2}) +
    fibonacciMultipleObject({number: secondValue}, {isComplete: secondValue < 2})
  );
};

const fibonacciMultipleDeepEqual = ({number}) => {
  return number < 2
    ? number
    : fibonacciMultipleDeepEqual({number: number - 1}) + fibonacciMultipleDeepEqual({number: number - 2});
};

const runSinglePrimitiveSuite = () => {
  const fibonacciSuite = new Benchmark.Suite('Single parameter primitive');
  const fibonacciNumber = 35;

  const mUnderscore = underscore(fibonacciSinglePrimitive);
  const mLodash = lodash(fibonacciSinglePrimitive);
  const mRamda = ramda(fibonacciSinglePrimitive);
  const mMemoizee = memoizee(fibonacciSinglePrimitive);
  const mFastMemoize = fastMemoize(fibonacciSinglePrimitive);
  const mAddyOsmani = addyOsmani(fibonacciSinglePrimitive);
  const mMemoizerific = memoizerific(Infinity)(fibonacciSinglePrimitive);
  const mLruMemoize = lruMemoize(Infinity)(fibonacciSinglePrimitive);
  const mMicroMemoize = microMemoize(fibonacciSinglePrimitive);

  return new Promise((resolve) => {
    fibonacciSuite
      .add('addy-osmani', () => {
        mAddyOsmani(fibonacciNumber);
      })
      .add('fast-memoize', () => {
        mFastMemoize(fibonacciNumber);
      })
      .add('lodash', () => {
        mLodash(fibonacciNumber);
      })
      .add('lru-memoize', () => {
        mLruMemoize(fibonacciNumber);
      })
      .add('memoizee', () => {
        mMemoizee(fibonacciNumber);
      })
      .add('memoizerific', () => {
        mMemoizerific(fibonacciNumber);
      })
      .add('micro-memoize', () => {
        mMicroMemoize(fibonacciNumber);
      })
      .add('ramda', () => {
        mRamda(fibonacciNumber);
      })
      .add('underscore', () => {
        mUnderscore(fibonacciNumber);
      })
      .on('start', () => {
        console.log(''); // eslint-disable-line no-console
        console.log('Starting cycles for functions with a single primitive parameter...'); // eslint-disable-line no-console

        results = [];

        spinner.start();
      })
      .on('cycle', onCycle)
      .on('complete', () => {
        onComplete();
        resolve();
      })
      .run({
        async: true
      });
  });
};

const runSingleObjectSuite = () => {
  const fibonacciSuite = new Benchmark.Suite('Single parameter object');
  const fibonacciNumber = {
    number: 35
  };

  const mUnderscore = underscore(fibonacciSingleObject);
  const mLodash = lodash(fibonacciSingleObject);
  const mRamda = ramda(fibonacciSingleObject);
  const mMemoizee = memoizee(fibonacciSingleObject);
  const mFastMemoize = fastMemoize(fibonacciSingleObject);
  const mAddyOsmani = addyOsmani(fibonacciSingleObject);
  const mMemoizerific = memoizerific(Infinity)(fibonacciSingleObject);
  const mLruMemoize = lruMemoize(Infinity)(fibonacciSingleObject);
  const mMicroMemoize = microMemoize(fibonacciSingleObject);

  return new Promise((resolve) => {
    fibonacciSuite
      .add('addy-osmani', () => {
        mAddyOsmani(fibonacciNumber);
      })
      .add('fast-memoize', () => {
        mFastMemoize(fibonacciNumber);
      })
      .add('lodash', () => {
        mLodash(fibonacciNumber);
      })
      .add('lru-memoize', () => {
        mLruMemoize(fibonacciNumber);
      })
      .add('memoizee', () => {
        mMemoizee(fibonacciNumber);
      })
      .add('memoizerific', () => {
        mMemoizerific(fibonacciNumber);
      })
      .add('micro-memoize', () => {
        mMicroMemoize(fibonacciNumber);
      })
      .add('ramda', () => {
        mRamda(fibonacciNumber);
      })
      .add('underscore', () => {
        mUnderscore(fibonacciNumber);
      })
      .on('start', () => {
        console.log(''); // eslint-disable-line no-console
        console.log('Starting cycles for functions with a single object parameter...'); // eslint-disable-line no-console

        results = [];

        spinner.start();
      })
      .on('cycle', onCycle)
      .on('complete', () => {
        onComplete();
        resolve();
      })
      .run({
        async: true
      });
  });
};

const runMultiplePrimitiveSuite = () => {
  const fibonacciSuite = new Benchmark.Suite('Multiple parameters (Primitive)');
  const fibonacciNumber = 35;
  const isComplete = false;

  const mMemoizee = memoizee(fibonacciMultiplePrimitive);
  const mFastMemoize = fastMemoize(fibonacciMultiplePrimitive);
  const mAddyOsmani = addyOsmani(fibonacciMultiplePrimitive);
  const mMemoizerific = memoizerific(Infinity)(fibonacciMultiplePrimitive);
  const mLruMemoize = lruMemoize(Infinity)(fibonacciMultiplePrimitive);
  const mMicroMemoize = microMemoize(fibonacciMultiplePrimitive);

  return new Promise((resolve) => {
    fibonacciSuite
      .add('addy-osmani', () => {
        mAddyOsmani(fibonacciNumber, isComplete);
      })
      .add('fast-memoize', () => {
        mFastMemoize(fibonacciNumber, isComplete);
      })
      .add('lru-memoize', () => {
        mLruMemoize(fibonacciNumber, isComplete);
      })
      .add('memoizee', () => {
        mMemoizee(fibonacciNumber, isComplete);
      })
      .add('memoizerific', () => {
        mMemoizerific(fibonacciNumber, isComplete);
      })
      .add('micro-memoize', () => {
        mMicroMemoize(fibonacciNumber, isComplete);
      })
      .on('start', () => {
        console.log(''); // eslint-disable-line no-console
        console.log('Starting cycles for functions with multiple parameters that contain only primitives...'); // eslint-disable-line no-console

        results = [];

        spinner.start();
      })
      .on('cycle', onCycle)
      .on('complete', () => {
        onComplete();
        resolve();
      })
      .run({
        async: true
      });
  });
};

const runMultipleObjectSuite = () => {
  const fibonacciSuite = new Benchmark.Suite('Multiple parameters (Object)');
  const fibonacciNumber = {
    number: 35
  };
  const isComplete = {
    isComplete: false
  };

  const mMemoizee = memoizee(fibonacciMultipleObject);
  const mFastMemoize = fastMemoize(fibonacciMultipleObject);
  const mAddyOsmani = addyOsmani(fibonacciMultipleObject);
  const mMemoizerific = memoizerific(Infinity)(fibonacciMultipleObject);
  const mLruMemoize = lruMemoize(Infinity)(fibonacciMultipleObject);
  const mMicroMemoize = microMemoize(fibonacciMultipleObject);

  return new Promise((resolve) => {
    fibonacciSuite
      .add('addy-osmani', () => {
        mAddyOsmani(fibonacciNumber, isComplete);
      })
      .add('fast-memoize', () => {
        mFastMemoize(fibonacciNumber, isComplete);
      })
      .add('lru-memoize', () => {
        mLruMemoize(fibonacciNumber, isComplete);
      })
      .add('memoizee', () => {
        mMemoizee(fibonacciNumber, isComplete);
      })
      .add('memoizerific', () => {
        mMemoizerific(fibonacciNumber, isComplete);
      })
      .add('micro-memoize', () => {
        mMicroMemoize(fibonacciNumber, isComplete);
      })
      .on('start', () => {
        console.log(''); // eslint-disable-line no-console
        console.log('Starting cycles for functions with multiple parameters that contain objects...'); // eslint-disable-line no-console

        results = [];

        spinner.start();
      })
      .on('cycle', onCycle)
      .on('complete', () => {
        onComplete();
        resolve();
      })
      .run({
        async: true
      });
  });
};

const runAlternativeOptionsSuite = () => {
  const fibonacciSuite = new Benchmark.Suite('Multiple parameters (Object)');
  const fibonacciNumber = {
    number: 35
  };

  const mMicroMemoizeDeep = microMemoize(fibonacciMultipleDeepEqual, {
    isEqual: deepEquals
  });

  const mMicroMemoizeFastDeep = microMemoize(fibonacciMultipleDeepEqual, {
    isEqual: fastDeepEqual
  });

  const mMicroMemoizeHashIt = microMemoize(fibonacciMultipleDeepEqual, {
    isEqual: hashItEquals
  });

  return new Promise((resolve) => {
    fibonacciSuite
      .add('micro-memoize deep equals (lodash isEqual)', () => {
        mMicroMemoizeDeep(fibonacciNumber);
      })
      .add('micro-memoize deep equals (fast-equals deepEqual)', () => {
        mMicroMemoizeFastDeep(fibonacciNumber);
      })
      .add('micro-memoize deep equals (hash-it isEqual)', () => {
        mMicroMemoizeHashIt(fibonacciNumber);
      })
      .on('start', () => {
        console.log(''); // eslint-disable-line no-console
        console.log('Starting cycles for alternative cache types...'); // eslint-disable-line no-console

        results = [];

        spinner.start();
      })
      .on('cycle', onCycle)
      .on('complete', () => {
        onComplete();
        resolve();
      })
      .run({
        async: true
      });
  });
};

// runAlternativeOptionsSuite();

runSinglePrimitiveSuite()
  .then(runSingleObjectSuite)
  .then(runMultiplePrimitiveSuite)
  .then(runMultipleObjectSuite)
  .then(runAlternativeOptionsSuite);
