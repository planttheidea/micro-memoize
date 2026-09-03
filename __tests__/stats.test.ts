import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  clearStats,
  getStats,
  isCollectingStats,
  memoize,
  startCollectingStats,
  stopCollectingStats,
} from '../src/index.js';

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

    profiled.statsManager!.dispose();
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

    profiled.statsManager!.dispose();
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

    // The counts are reset, but the profile remains registered and continues collecting,
    // matching the behavior of `clearStats(statsName)`.
    expect(getStats()).toEqual({
      calls: 0,
      hits: 0,
      profiles: {
        [statsName]: {
          calls: 0,
          hits: 0,
          name: statsName,
          usage: '0.0000%',
        },
      },
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

    profiled.statsManager!.dispose();
  });

  test('should keep collecting into a profile after a global clear', () => {
    const statsName = 'globalClear';
    const profiled = memoize(method, { statsName });

    profiled(foo, bar);
    profiled(foo, bar);
    profiled(foo, 'baz');

    expect(getStats(statsName)).toEqual({
      calls: 3,
      hits: 1,
      name: statsName,
      usage: '33.3333%',
    });

    clearStats();

    profiled(foo, 'baz');
    profiled(foo, 'baz');

    expect(getStats(statsName)).toEqual({
      calls: 2,
      hits: 2,
      name: statsName,
      usage: '100.0000%',
    });

    expect(getStats()!.profiles[statsName]).toEqual({
      calls: 2,
      hits: 2,
      name: statsName,
      usage: '100.0000%',
    });

    profiled.statsManager!.dispose();
  });

  test('should number a profile whose statsName is already taken', () => {
    const statsName = 'shared';
    const first = memoize(method, { statsName });
    const second = memoize(method, { statsName });
    const third = memoize(method, { statsName });

    // Two methods asking for one name are still two methods, so each keeps its own profile.
    expect(first.statsManager!.n).toBe('shared');
    expect(second.statsManager!.n).toBe('shared (2)');
    expect(third.statsManager!.n).toBe('shared (3)');

    first(foo, bar);
    first(foo, bar);
    second(foo, bar);

    expect(getStats('shared')).toEqual({ calls: 2, hits: 1, name: 'shared', usage: '50.0000%' });
    expect(getStats('shared (2)')).toEqual({ calls: 1, hits: 0, name: 'shared (2)', usage: '0.0000%' });
    expect(getStats('shared (3)')).toEqual({ calls: 0, hits: 0, name: 'shared (3)', usage: '0.0000%' });

    first.statsManager!.dispose();
    second.statsManager!.dispose();
    third.statsManager!.dispose();
  });

  test('should reuse a name once the profile holding it is disposed', () => {
    const first = memoize(method, { statsName: 'reused' });

    expect(first.statsManager!.n).toBe('reused');

    first.statsManager!.dispose();

    const second = memoize(method, { statsName: 'reused' });

    expect(second.statsManager!.n).toBe('reused');

    second.statsManager!.dispose();
  });

  test('should remove a disposed profile from the registry and stop collecting', () => {
    const statsName = 'disposed';
    const profiled = memoize(method, { statsName });

    profiled(foo, bar);
    profiled(foo, bar);

    expect(getStats()!.profiles[statsName]).toBeDefined();

    profiled.statsManager!.dispose();

    profiled(foo, bar);

    expect(getStats()!.profiles[statsName]).toBeUndefined();
    expect(getStats(statsName)).toEqual({
      calls: 0,
      hits: 0,
      name: statsName,
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
