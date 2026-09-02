import { Cache } from './Cache.js';
import type { GlobalStats, ProfileStats } from './internalTypes.js';

interface ProfileCounts {
  c: number;
  h: number;
}

/**
 * Registry of every live profile, keyed by its resolved name.
 */
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
    // Two memoized methods asking for the same name are still two separate methods, so the
    // later one is numbered rather than replacing the profile of the earlier.
    this.n = getAvailableName(statsName);

    nameToProfile.set(this.n, this);

    if (active) {
      this.s();
    }
  }

  /**
   * Stop collecting stats for this profile and remove it from the stats registry.
   *
   * Profiles are held for the lifetime of the process otherwise, so this is required to
   * release a memoized method (and everything its cache retains) when it is no longer used.
   */
  dispose(): void {
    this.d?.();

    nameToProfile.delete(this.n);
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
 *
 * @NOTE
 * This resets the counts collected; the profiles themselves remain registered and continue
 * collecting. Use `memoized.statsManager.dispose()` to remove a profile entirely.
 */
export function clearStats(statsName?: string) {
  if (!active) {
    return;
  }

  if (statsName != null) {
    nameToProfile.get(statsName)?.r();
  } else {
    nameToProfile.forEach((profile) => {
      profile.r();
    });
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
    // @ts-expect-error - Conditional returns can be tricky.
    return getProfileStats(statsName, nameToProfile.get(statsName));
  }

  let calls = 0;
  let hits = 0;

  const profiles: Record<string, ProfileStats> = {};

  nameToProfile.forEach((profile, name) => {
    const profileStats = getProfileStats(name, profile);

    profiles[name] = profileStats;

    calls += profileStats.calls;
    hits += profileStats.hits;
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
 * Get a name not already in use, numbering the one requested when it is taken.
 */
function getAvailableName(statsName: string): string {
  let name = statsName;
  let count = 1;

  while (nameToProfile.has(name)) {
    name = `${statsName} (${String(++count)})`;
  }

  return name;
}

/**
 * Get the stats for the given profile.
 */
function getProfileStats(name: string, profile: StatsManager<any> | undefined): ProfileStats {
  const calls = profile ? profile.p.c : 0;
  const hits = profile ? profile.p.h : 0;

  return { calls, hits, name, usage: getUsagePercentage(calls, hits) };
}

/**
 * Get the usage percentage based on the number of hits and total calls.
 */
function getUsagePercentage(calls: number, hits: number): string {
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
