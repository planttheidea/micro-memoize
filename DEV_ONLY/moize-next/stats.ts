import type {
  CacheEvent,
  CacheEventType,
  GlobalStats,
  StatsCache,
  Stats,
} from './internalTypes';

export const statsCache: StatsCache = {
  anonymousProfileNameCounter: 1,
  eventEmitter: {
    l: [],

    a(listener): void {
      if (this.l.indexOf(listener) === -1) {
        this.l.push(listener);
      }
    },

    n(isCollectingStats): void {
      for (let index = 0, length = this.l.length; index < length; ++index) {
        this.l[index]!(isCollectingStats);
      }
    },

    r(listener): void {
      const index = this.l.indexOf(listener);

      if (index !== -1) {
        this.l.splice(index, 1);
      }
    },
  },
  isCollectingStats: false,
  profiles: {},
};

let hasWarningDisplayed = false;

export function clearStats(profileName?: string) {
  if (profileName) {
    delete statsCache.profiles[profileName];
  } else {
    statsCache.profiles = {};
  }
}

/**
 * Activate stats collection.
 */
export function collectStats(isCollectingStats = true) {
  statsCache.isCollectingStats = isCollectingStats;
  statsCache.eventEmitter.n(isCollectingStats);
}

/**
 * Get the profileName for the function when one is not provided.
 */
export function getDefaultProfileName<Fn extends (...args: any[]) => any>(
  fn: Fn & { displayName?: string },
) {
  return (
    fn.displayName ||
    fn.name ||
    `Anonymous ${statsCache.anonymousProfileNameCounter++}`
  );
}

/**
 * Get the usage percentage based on the number of hits and total calls.
 */
export function getUsagePercentage(calls: number, hits: number) {
  return calls ? `${((hits / calls) * 100).toFixed(4)}%` : '0.0000%';
}

/**
 * Get the statistics for a given method or all methods.
 */
export function getStats(profileName: string): Stats;
export function getStats(): GlobalStats;
export function getStats(profileName?: string): GlobalStats | Stats {
  if (!statsCache.isCollectingStats && !hasWarningDisplayed) {
    console.warn(
      'Stats are not currently being collected, please run "collectStats" to enable them.',
    ); // eslint-disable-line no-console

    hasWarningDisplayed = true;
  }

  if (profileName) {
    const profile = statsCache.profiles[profileName];

    return profile
      ? Object.assign({}, profile)
      : { calls: 0, hits: 0, usage: getUsagePercentage(0, 0) };
  }

  const totals = Object.keys(statsCache.profiles).reduce(
    (completeProfiles, profileName) => {
      completeProfiles.calls += statsCache.profiles[profileName]!.calls;
      completeProfiles.hits += statsCache.profiles[profileName]!.hits;

      return completeProfiles;
    },
    { calls: 0, hits: 0 },
  );
  const profiles = Object.keys(statsCache.profiles).reduce(
    (computedProfiles, profileName) => {
      computedProfiles[profileName] = getStats(profileName);

      return computedProfiles;
    },
    {} as Record<string, Stats>,
  );

  return Object.assign({}, totals, {
    profiles,
    usage: getUsagePercentage(totals.calls, totals.hits),
  });
}

/**
 * Increment the number of calls and hits (if applicable) for the specific profile.
 */
export function onCacheChangeCollectStats<Fn extends (...args: any[]) => any>(
  event: CacheEvent<CacheEventType, Fn>,
): void {
  const profileName = event.cache.pn;

  let profile = statsCache.profiles[profileName];

  if (!profile) {
    profile = statsCache.profiles[profileName] = {
      get usage() {
        return getUsagePercentage(this.calls, this.hits);
      },
      calls: 0,
      hits: 0,
    };
  }

  ++profile.calls;

  if (event.type === 'hit') {
    ++profile.hits;
  }
}
