import { BON_API_BASE, BON_LAUNCH_TS } from "./constants";
import type { TransactionHistory, TransactionHistoryPoint } from "./types";

const TEN_MINUTES_MS = 600_000;
const TARGET_POINT_COUNT = 220;
const MAX_CONCURRENT_REQUESTS = 12;

const BUCKET_OPTIONS = [
  3600,
  7200,
  10800,
  21600,
  43200,
  86400,
  172800,
  604800,
] as const;

let cacheEntry: { data: TransactionHistory; timestamp: number } | null = null;
let refreshPromise: Promise<TransactionHistory> | null = null;

async function fetchNumber(path: string): Promise<number> {
  const res = await fetch(`${BON_API_BASE}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    throw new Error(`BoN API error: ${res.status} ${path}`);
  }

  const text = await res.text();
  const value = Number(text);

  if (!Number.isFinite(value)) {
    throw new Error(`BoN API returned non-numeric value for ${path}: "${text}"`);
  }

  return value;
}

function chooseBucketSeconds(ageSeconds: number): number {
  const minBucket = Math.ceil(ageSeconds / TARGET_POINT_COUNT);

  return (
    BUCKET_OPTIONS.find((seconds) => seconds >= minBucket) ??
    BUCKET_OPTIONS[BUCKET_OPTIONS.length - 1]
  );
}

function formatBucketLabel(bucketSeconds: number): string {
  if (bucketSeconds < 86400) {
    const hours = bucketSeconds / 3600;
    return `${hours}h`;
  }

  if (bucketSeconds < 604800) {
    const days = bucketSeconds / 86400;
    return `${days}d`;
  }

  const weeks = bucketSeconds / 604800;
  return `${weeks}w`;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );

  return results;
}

async function buildTransactionHistory(): Promise<TransactionHistory> {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const ageSeconds = Math.max(nowSeconds - BON_LAUNCH_TS, 3600);
  const bucketSeconds = chooseBucketSeconds(ageSeconds);
  const bucketStarts: number[] = [];

  for (let ts = BON_LAUNCH_TS; ts < nowSeconds; ts += bucketSeconds) {
    bucketStarts.push(ts);
  }

  const bucketCounts = await mapWithConcurrency(
    bucketStarts,
    MAX_CONCURRENT_REQUESTS,
    async (startTs) => {
      const endTs = Math.min(startTs + bucketSeconds, nowSeconds);
      return fetchNumber(`/transactions/count?after=${startTs}&before=${endTs}`);
    },
  );

  let runningTotal = 0;
  const points: TransactionHistoryPoint[] = [
    {
      timestamp: new Date(BON_LAUNCH_TS * 1000).toISOString(),
      cumulativeTransactions: 0,
    },
  ];

  bucketStarts.forEach((startTs, index) => {
    runningTotal += bucketCounts[index];
    points.push({
      timestamp: new Date(
        Math.min(startTs + bucketSeconds, nowSeconds) * 1000,
      ).toISOString(),
      cumulativeTransactions: runningTotal,
    });
  });

  return {
    generatedAt: new Date().toISOString(),
    from: new Date(BON_LAUNCH_TS * 1000).toISOString(),
    to: new Date(nowSeconds * 1000).toISOString(),
    bucketSeconds,
    bucketLabel: formatBucketLabel(bucketSeconds),
    points,
  };
}

export async function getTransactionHistory(): Promise<TransactionHistory> {
  const now = Date.now();

  if (cacheEntry && now - cacheEntry.timestamp < TEN_MINUTES_MS) {
    return cacheEntry.data;
  }

  if (!refreshPromise) {
    refreshPromise = buildTransactionHistory()
      .then((data) => {
        cacheEntry = { data, timestamp: Date.now() };
        return data;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  if (cacheEntry) {
    return cacheEntry.data;
  }

  return refreshPromise;
}
