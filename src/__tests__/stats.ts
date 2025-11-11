import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  clearStats,
  getStats,
  isCollectingStats,
  memoize,
  startCollectingStats,
  stopCollectingStats,
} from '../index.js';

const foo = 'foo';
const bar = 'bar';

const method = vi.fn(function (one: string, two: string) {
  return { one, two };
});

describe('isCollectingStats', () => {
  test('should identify if stats are being collected', () => {
    expect(isCollectingStats()).toBe(false);

    startCollectingStats();

    expect(isCollectingStats()).toBe(true);

    stopCollectingStats();

    expect(isCollectingStats()).toBe(false);
  });
});

describe('statsName', () => {
  beforeEach(() => {
    startCollectingStats();
  });

  afterEach(() => {
    stopCollectingStats();
    clearStats();
  });

  test('should create a memoized method with the statsName passed', () => {
    const statsName = 'statsName';
    const profiled = memoize(method, { statsName });

    profiled(foo, bar);
    profiled(foo, bar);

    expect(getStats(statsName)).toEqual({
      calls: 2,
      hits: 1,
      name: statsName,
      usage: '50.0000%',
    });

    clearStats(statsName);

    expect(getStats(statsName)).toEqual({
      calls: 0,
      hits: 0,
      name: statsName,
      usage: '0.0000%',
    });
  });

  test('should handle collecting more stats after clearing', () => {
    const statsName = 'statsName';
    const profiled = memoize(method, { statsName });

    profiled(foo, bar);
    profiled(foo, bar);

    expect(getStats(statsName)).toEqual({
      calls: 2,
      hits: 1,
      name: statsName,
      usage: '50.0000%',
    });

    clearStats(statsName);

    expect(getStats(statsName)).toEqual({
      calls: 0,
      hits: 0,
      name: statsName,
      usage: '0.0000%',
    });

    profiled(foo, bar);
    profiled(foo, bar);

    expect(getStats(statsName)).toEqual({
      calls: 2,
      hits: 2,
      name: statsName,
      usage: '100.0000%',
    });
  });
});

describe('getStats', () => {
  beforeEach(() => {
    startCollectingStats();
  });

  afterEach(() => {
    stopCollectingStats();
    clearStats();
  });

  test('should handle stats for all usages', () => {
    const statsName = 'statsName';
    const profiled = memoize(method, { statsName });

    profiled(foo, bar);
    profiled(foo, bar);

    // specific stats
    expect(getStats(statsName)).toEqual({
      calls: 2,
      hits: 1,
      name: statsName,
      usage: '50.0000%',
    });

    // global stats
    expect(getStats()).toEqual({
      calls: 2,
      hits: 1,
      profiles: {
        [statsName]: {
          calls: 2,
          hits: 1,
          name: statsName,
          usage: '50.0000%',
        },
      },
      usage: '50.0000%',
    });

    clearStats();

    expect(getStats()).toEqual({
      calls: 0,
      hits: 0,
      profiles: {},
      usage: '0.0000%',
    });
  });

  test('should warn when getting stats and stats are not being collected', () => {
    stopCollectingStats();

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    getStats();

    expect(warn).toHaveBeenCalledWith(
      'Stats are not being collected; please run "startCollectingStats()" to collect them.',
    );

    warn.mockRestore();
  });
});
