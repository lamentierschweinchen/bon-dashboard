// src/lib/cache.ts

import { CACHE_TTL_MS } from "./constants";
import type { DashboardSnapshot } from "./types";

type CacheEntry = {
  data: DashboardSnapshot;
  timestamp: number;
};

let entry: CacheEntry | null = null;
let refreshPromise: Promise<void> | null = null;

/**
 * Stale-while-revalidate cache for the dashboard snapshot.
 *
 * - If cache is fresh (< TTL), return cached data.
 * - If cache is stale (>= TTL), return stale data AND trigger a background refresh.
 * - If cache is empty, await the fetch and populate.
 * - Concurrent cold-start requests are coalesced into a single fetch.
 */
export async function getOrRefresh(
  fetcher: () => Promise<DashboardSnapshot>,
): Promise<DashboardSnapshot> {
  const now = Date.now();

  // Cache hit: fresh
  if (entry && now - entry.timestamp < CACHE_TTL_MS) {
    return entry.data;
  }

  // Cache hit: stale — return stale, refresh in background
  if (entry) {
    if (!refreshPromise) {
      refreshPromise = fetcher()
        .then((data) => {
          entry = { data, timestamp: Date.now() };
        })
        .catch((err) => {
          const staleAge = Date.now() - (entry?.timestamp ?? 0);
          console.error(
            `[cache] background refresh failed (stale for ${staleAge}ms):`,
            err,
          );
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    return entry.data;
  }

  // Cache miss: coalesce concurrent cold-start requests
  if (!refreshPromise) {
    refreshPromise = fetcher()
      .then((data) => {
        entry = { data, timestamp: Date.now() };
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  await refreshPromise;
  return entry!.data;
}
