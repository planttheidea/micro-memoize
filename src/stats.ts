import { Cache } from './Cache.js';
import { GlobalStats, Options, ProfileStats } from './internalTypes.js';

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

  constructor(cache: Cache<Fn>, profileName: string) {
    this.c = cache;
    this.n = profileName;

    nameToProfile.set(profileName, this);

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

function aggregateGlobalStats(): GlobalStats {
  let calls = 0;
  let hits = 0;

  const profiles: Record<string, ProfileStats> = {};

  nameToProfile.forEach((profile, profileName) => {
    profiles[profileName] = profile.m();

    calls += profile.p.c;
    hits += profile.p.h;
  });

  return {
    calls,
    hits,
    profiles,
    usage: getUsagePercentage(calls, hits),
  };
}

function aggregateProfileStats(profileName: string): ProfileStats {
  const statsManager = nameToProfile.get(profileName);

  return statsManager?.p.c
    ? statsManager.m()
    : {
        calls: 0,
        hits: 0,
        name: profileName,
        usage: getUsagePercentage(0, 0),
      };
}

function clear(profileName: string | undefined): void {
  if (profileName) {
    const statsManager = nameToProfile.get(profileName);

    if (statsManager) {
      statsManager.r();
    }
  } else {
    nameToProfile.clear();
  }
}

/**
 * Clear all existing stats stored, either of the specific profile whose name is passed,
 * or globally if no name is passed.
 */
export function clearStats(profileName?: string) {
  active && clear(profileName);
}

/**
 * Get the stats of a given profile, or global stats if no `profileName` is given.
 */
export function getStats<Name extends string | undefined>(
  profileName?: Name,
): undefined extends Name ? GlobalStats | undefined : ProfileStats | undefined {
  if (!active) {
    console.warn(
      'Stats are not being collected; please run "startCollectingStats()" to collect them.',
    );
    return;
  }

  return profileName != null
    ? // @ts-expect-error - Conditional returns can be tricky.
      aggregateProfileStats(profileName)
    : // @ts-expect-error - Conditional returns can be tricky.
      aggregateGlobalStats();
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
