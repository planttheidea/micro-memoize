import { copy } from 'fast-copy';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { memoize } from '../src/index.js';

describe('serialize', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('serializes the args passed by', () => {
    const three = () => {};
    const altThree = () => {};
    const four = Symbol('foo');
    const altFour = Symbol('foo');

    interface Arg {
      one: number;
      two: number;
      three: () => void;
      four: symbol;
      five: null;
    }

    const method = vi.fn(({ one, two, three, four, five }: Arg) => {
      return [one, two, three, four, five];
    });

    const memoized = memoize(method, { maxSize: 2, serialize: true });

    const resultA = memoized({
      one: 1,
      two: 2,
      three,
      four,
      five: null,
    });
    const resultB = memoized({
      one: 1,
      two: 2,
      three: altThree,
      four: altFour,
      five: null,
    });

    expect(resultA).toEqual([1, 2, three, four, null]);
    expect(resultB).toBe(resultA);

    expect(method).toHaveBeenCalledTimes(1);
  });

  test('handles circular objects', () => {
    interface Arg {
      deeply: {
        nested: {
          circular: Partial<Arg>;
        };
      };
    }

    const circularMethod = vi.fn((arg: Arg) => arg);
    const circularMemoized = memoize(circularMethod, { serialize: true });

    const circular: Arg = {
      deeply: {
        nested: {
          circular: {},
        },
      },
    };

    circular.deeply.nested.circular = circular;

    const resultA = circularMemoized(copy(circular));
    const resultB = circularMemoized(copy(circular));

    expect(resultB).toBe(resultA);

    expect(circularMethod).toHaveBeenCalledTimes(1);

    expect(circularMemoized.cache.snapshot.keys).toEqual([['[{"deeply":{"nested":{"circular":"[ref=.0]"}}}]']]);
  });
});

describe('serializeWith', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('serializes the arguments passed with the custom serializer', () => {
    interface Arg {
      one: number;
      two: number;
      three: () => void;
      four: symbol;
      five: null;
    }

    const method = vi.fn(({ one, two, three, four, five }: Arg) => {
      return [one, two, three, four, five];
    });

    const withSerializer = memoize(method, {
      serialize: (args: any[]) => [JSON.stringify(args)],
    });

    const three = () => {};
    const altThree = () => {};
    const four = Symbol('foo');
    const altFour = Symbol('foo');

    const resultA = withSerializer({
      one: 1,
      two: 2,
      three,
      four,
      five: null,
    });
    const resultB = withSerializer({
      one: 1,
      two: 2,
      three: altThree,
      four: altFour,
      five: null,
    });

    expect(resultA).toEqual([1, 2, three, four, null]);
    expect(resultB).toBe(resultA);

    expect(method).toHaveBeenCalledTimes(1);
  });
});
