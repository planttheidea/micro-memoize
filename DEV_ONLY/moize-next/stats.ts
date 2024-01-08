import type {
    GlobalStatsObject,
    NormalizedOptions,
    StatsCache,
    StatsProfile,
} from './internalTypes';

export const statsCache: StatsCache = {
    anonymousProfileNameCounter: 1,
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
}

/**
 * Create a function that increments the number of calls for the specific profile.
 */
export function createOnCacheAddIncrementCalls<Fn extends (...args: any[]) => any>(
    options: NormalizedOptions<Fn>
) {
    const { profileName } = options;

    return function () {
        if (profileName && !statsCache.profiles[profileName]) {
            statsCache.profiles[profileName] = {
                calls: 0,
                hits: 0,
            };
        }

        statsCache.profiles[profileName]!.calls++;
    };
}

/**
 * Create a function that increments the number of calls and cache hits for the specific profile.
 */
export function createOnCacheHitIncrementCallsAndHits<Fn extends (...args: any[]) => any>(options: NormalizedOptions<Fn>) {
    return function () {
        const { profiles } = statsCache;
        const { profileName } = options;

        if (!profiles[profileName]) {
            profiles[profileName] = {
                calls: 0,
                hits: 0,
            };
        }

        profiles[profileName]!.calls++;
        profiles[profileName]!.hits++;
    };
}

/**
 * Get the profileName for the function when one is not provided.
 */
export function getDefaultProfileName<Fn extends (...args: any[]) => any>(
    fn: Fn
) {
    return (
        (fn as any).displayName ||
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
export function getStats(profileName?: string): GlobalStatsObject {
    if (!statsCache.isCollectingStats && !hasWarningDisplayed) {
        console.warn(
            'Stats are not currently being collected, please run "collectStats" to enable them.'
        ); // eslint-disable-line no-console

        hasWarningDisplayed = true;
    }

    const { profiles } = statsCache;

    if (profileName) {
        if (!profiles[profileName]) {
            return {
                calls: 0,
                hits: 0,
                usage: '0.0000%',
            };
        }

        const profile = profiles[profileName]!;

        return {
            ...profile,
            usage: getUsagePercentage(profile.calls, profile.hits),
        };
    }

    const completeStats: StatsProfile = Object.keys(statsCache.profiles).reduce(
        (completeProfiles, profileName) => {
            completeProfiles.calls += profiles[profileName]!.calls;
            completeProfiles.hits += profiles[profileName]!.hits;

            return completeProfiles;
        },
        { calls: 0, hits: 0 }
    );

    return {
        ...completeStats,
        profiles: Object.keys(profiles).reduce(
            (computedProfiles, profileName) => {
                computedProfiles[profileName] = getStats(profileName);

                return computedProfiles;
            },
            {} as Record<string, StatsProfile>
        ),
        usage: getUsagePercentage(completeStats.calls, completeStats.hits),
    };
}
