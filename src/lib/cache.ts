// src/lib/cache.ts

import { CACHE_TTL_MS } from "./constants";

type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

let entry: CacheEntry<unknown> | null = null;
let refreshPromise: Promise<unknown> | null = null;

/**
 * Stale-while-revalidate cache.
 *
 * - If cache is fresh (< TTL), return cached data.
 * - If cache is stale (>= TTL), return stale data AND trigger a background refresh.
 * - If cache is empty, await the fetch and populate.
 *
 * @param fetcher - async function that produces fresh data
 * @returns the cached or freshly fetched data
 */
export async function getOrRefresh<T>(fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();

  // Cache hit: fresh
  if (entry && now - entry.timestamp < CACHE_TTL_MS) {
    return entry.data as T;
  }

  // Cache hit: stale — return stale, refresh in background
  if (entry) {
    if (!refreshPromise) {
      refreshPromise = fetcher()
        .then((data) => {
          entry = { data, timestamp: Date.now() };
        })
        .catch((err) => {
          console.error("[cache] background refresh failed:", err);
        })
        .finally(() => {
          refreshPromise = null;
        });
    }
    return entry.data as T;
  }

  // Cache miss: await fresh data
  const data = await fetcher();
  entry = { data, timestamp: Date.now() };
  return data;
}
