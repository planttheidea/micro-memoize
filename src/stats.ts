import { Cache } from './Cache.js';
import type { GlobalStats, Options, ProfileStats } from './internalTypes.js';

interface ProfileCounts {
  c: number;
  h: number;
}

const nameToProfile = new Map<string, StatsManager<any>>();

let active = false;

export class StatsManager<Fn extends (...args: any[]) => any> {
  /**
   * The [c]ache listened to when collecting counts.
   */
  c: Cache<Fn>;
  /**
   * Method to [d]elete existing cache listeners.
   */
  d: (() => void) | undefined;
  /**
   * The [n]ame of the profile to manage in stats.
   */
  n: string;
  /**
   * The counts for the stats [p]rofile.
   */
  p: ProfileCounts = { c: 0, h: 0 };

  constructor(cache: Cache<Fn>, statsName: string) {
    this.c = cache;
    this.n = statsName;

    nameToProfile.set(statsName, this);

    if (active) {
      this.s();
    }
  }

  /**
   * Method to compute the [m]etrics for the profile stats.
   */
  m(): ProfileStats {
    const { c: calls, h: hits } = this.p;
    const usage = calls ? `${((hits / calls) * 100).toFixed(4)}%` : '0.0000%';

    return { calls, hits, name: this.n, usage };
  }

  /**
   * Method to [r]eset the counts.
   */
  r() {
    this.p = { c: 0, h: 0 };
  }

  /**
   * Method to [s]tart the collection of stats for the given profile.
   */
  s() {
    const onAdd = () => {
      ++this.p.c;
    };
    const onHit = () => {
      ++this.p.c;
      ++this.p.h;
    };

    this.d = () => {
      this.c.off('add', onAdd);
      this.c.off('hit', onHit);

      this.d = undefined;

      this.p.c = this.p.h = 0;
    };

    this.c.on('add', onAdd);
    this.c.on('hit', onHit);
  }
}

/**
 * Clear all existing stats stored, either of the specific profile whose name is passed,
 * or globally if no name is passed.
 */
export function clearStats(statsName?: string) {
  if (!active) {
    return;
  }

  if (statsName) {
    const statsManager = nameToProfile.get(statsName);

    if (statsManager) {
      statsManager.r();
    }
  } else {
    nameToProfile.clear();
  }
}

/**
 * Get the stats of a given profile, or global stats if no `statsName` is given.
 */
export function getStats<Name extends string | undefined>(
  statsName?: Name,
): undefined extends Name ? GlobalStats | undefined : ProfileStats | undefined {
  if (!active) {
    console.warn('Stats are not being collected; please run "startCollectingStats()" to collect them.');
    return;
  }

  if (statsName != null) {
    const statsManager = nameToProfile.get(statsName);

    const profileStats: ProfileStats = statsManager?.p.c
      ? statsManager.m()
      : {
          calls: 0,
          hits: 0,
          name: statsName,
          usage: getUsagePercentage(0, 0),
        };
    // @ts-expect-error - Conditional returns can be tricky.
    return profileStats;
  }

  let calls = 0;
  let hits = 0;

  const profiles: Record<string, ProfileStats> = {};

  nameToProfile.forEach((profile, statsName) => {
    profiles[statsName] = profile.m();

    calls += profile.p.c;
    hits += profile.p.h;
  });

  const globalStats: GlobalStats = {
    calls,
    hits,
    profiles,
    usage: getUsagePercentage(calls, hits),
  };

  // @ts-expect-error - Conditional returns can be tricky.
  return globalStats;
}

/**
 * Get the stats manager for the given moized function.
 */
export function getStatsManager<Fn extends (...args: any[]) => any>(
  cache: Cache<Fn>,
  options: Options<Fn>,
): StatsManager<Fn> | undefined {
  if (options.statsName) {
    return new StatsManager(cache, options.statsName);
  }
}

/**
 * Get the usage percentage based on the number of hits and total calls.
 */
function getUsagePercentage(calls: number, hits: number) {
  return calls ? `${((hits / calls) * 100).toFixed(4)}%` : '0.0000%';
}

/**
 * Whether stats are currently being collected.
 */
export function isCollectingStats(): boolean {
  return active;
}

/**
 * Start collecting stats.
 */
export function startCollectingStats(): void {
  if (!active) {
    active = true;

    nameToProfile.forEach((profile) => {
      profile.s();
    });
  }
}

/**
 * Stop collecting stats.
 */
export function stopCollectingStats(): void {
  if (active) {
    nameToProfile.forEach((profile) => {
      profile.d?.();
    });

    active = false;
  }
}
