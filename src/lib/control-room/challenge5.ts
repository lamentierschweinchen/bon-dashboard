import path from "node:path";
import type {
  Challenge5DashboardData,
  Challenge5FundingSummary,
  Challenge5Preflight,
  Challenge5RunSummary,
  Challenge5StatusSnapshot,
} from "./types";
import {
  displayPath,
  pickLatestTimestamp,
  readJsonIfExists,
  readTextIfExists,
  readdirIfExists,
  sortByFreshness,
  workspacePath,
} from "./workspace";

const CHALLENGE_ROOT = workspacePath("Battle of Nodes", "challenge-5");
const RUNS_ROOT = path.join(CHALLENGE_ROOT, "artifacts", "runs");
const FUNDING_ROOT = path.join(CHALLENGE_ROOT, "artifacts", "funding");
const RUNBOOK_PATH = path.join(CHALLENGE_ROOT, "validator-challenge-5-runbook.md");
const PREFLIGHT_PATH = path.join(CHALLENGE_ROOT, "validator-challenge-5-preflight.json");

type PreflightJson = {
  checkedAt?: string;
  manifest?: string;
  selectedRoute?: string;
  sampleFundedWallets?: number;
  sampledWalletCount?: number;
  walletCount?: number;
  windowStartUtc?: string;
  windowEndUtc?: string;
  routeChecks?: Array<{
    route?: string;
    healthy?: boolean;
    reason?: string;
  }>;
};

type RunJson = {
  acceptedTarget?: number;
  manifest?: string;
  runFile?: string;
  kind?: string;
  createdAt?: string;
  updatedAt?: string;
  walletCount?: number;
  targetBalanceEgld?: string;
  totalEgld?: string;
  deficitWalletCount?: number;
  counts?: {
    acceptedTransactions?: number;
    transportAcceptedTransactions?: number;
    notAcceptedTransactions?: number;
    batchOutcomeCounts?: Record<string, number>;
  };
  route?: {
    name?: string;
    reason?: string;
  };
  rates?: {
    acceptedTpsOverall?: number;
    acceptedTpsRecent?: number;
    projectedHoursToTarget?: number | null;
  };
  latestSample?: Record<string, number>;
  latestCheckpoint?: string;
};

async function listNestedRunFiles(rootPath: string): Promise<string[]> {
  const entries = await readdirIfExists(rootPath);
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map(async (entry) => {
        const candidate = path.join(rootPath, entry.name, "run.json");
        const exists = await readTextIfExists(candidate);
        return exists ? candidate : null;
      }),
  );

  return files.filter((value): value is string => value !== null);
}

function toKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+([a-z0-9])/g, (_, letter: string) => letter.toUpperCase())
    .replace(/[^a-z0-9]/g, "");
}

function parseMarkdownKeyValueLines(markdown: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    const match = /^-\s+([^:]+):\s+`([^`]*)`$/.exec(line);

    if (!match) {
      continue;
    }

    result[toKey(match[1])] = match[2];
  }

  return result;
}

function parseNumber(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/,/g, "").trim();
  if (!normalized) {
    return null;
  }

  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

function parseProgress(value: string | undefined) {
  if (!value) {
    return { current: null, target: null, ratio: null };
  }

  const match = /([0-9,]+)\s*\/\s*([0-9,]+)/.exec(value);
  if (!match) {
    return { current: null, target: null, ratio: null };
  }

  const current = parseNumber(match[1]);
  const target = parseNumber(match[2]);

  return {
    current,
    target,
    ratio:
      current !== null && target !== null && target > 0
        ? current / target
        : null,
  };
}

function parseBatchOutcomes(value: string | undefined): Record<string, number> {
  if (!value) {
    return {};
  }

  return Object.fromEntries(
    value
      .split(",")
      .map((chunk) => chunk.trim())
      .map((chunk) => {
        const [label, rawNumber] = chunk.split("=");
        return [label.trim(), Number(rawNumber)];
      })
      .filter((entry) => Number.isFinite(entry[1])),
  );
}

function parseWorkerCeiling(value: string | undefined) {
  if (!value) {
    return { active: null, max: null };
  }

  const match = /([0-9]+)\s*\/\s*([0-9]+)/.exec(value);
  if (!match) {
    return { active: null, max: null };
  }

  return {
    active: Number(match[1]),
    max: Number(match[2]),
  };
}

function parseSample(value: string | undefined): Record<string, number> {
  if (!value) {
    return {};
  }

  const result: Record<string, number> = {};
  const trimmed = value.replace(/^\{|\}$/g, "");

  for (const pair of trimmed.split(",")) {
    const [rawKey, rawValue] = pair.split(":");
    if (!rawKey || !rawValue) {
      continue;
    }

    const key = rawKey.replace(/['"\s]/g, "");
    const number = Number(rawValue.trim().replace(/['"]/g, ""));

    if (key && Number.isFinite(number)) {
      result[key] = number;
    }
  }

  return result;
}

function labelFromStatusFile(fileName: string): string {
  const trancheMatch = /tranche-(\d+)/.exec(fileName);
  if (trancheMatch) {
    return `Tranche ${trancheMatch[1]}`;
  }

  return "Main lane";
}

function labelFromManifestName(manifestName: string): string {
  const trancheMatch = /tranche-(\d+)/.exec(manifestName);
  if (trancheMatch) {
    return `Tranche ${trancheMatch[1]}`;
  }

  if (manifestName.includes("500-manifest")) {
    return "Main fleet";
  }

  if (manifestName.includes("200-manifest")) {
    return "Fleet 200";
  }

  if (manifestName.includes("100-manifest")) {
    return "Fleet 100";
  }

  return manifestName.replace(/-/g, " ");
}

async function loadStatusSnapshots(): Promise<Challenge5StatusSnapshot[]> {
  const entries = await readdirIfExists(CHALLENGE_ROOT);
  const statusFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith("-status.md"))
    .map((entry) => entry.name)
    .sort();

  const snapshots = await Promise.all(
    statusFiles.map(async (fileName) => {
      const sourcePath = path.join(CHALLENGE_ROOT, fileName);
      const text = await readTextIfExists(sourcePath);
      const raw = parseMarkdownKeyValueLines(text ?? "");
      const progress = parseProgress(raw.accepted ?? raw.transportAccepted);
      const worker = parseWorkerCeiling(raw.workerCeiling);

      return {
        key: fileName,
        label: labelFromStatusFile(fileName),
        updatedAt: raw.updatedAt ?? null,
        route: raw.route ?? null,
        routeReason: raw.routeReason ?? null,
        progress,
        overallTps: parseNumber(raw.acceptedTpsOverall ?? raw.transportAcceptedTpsOverall),
        recentTps: parseNumber(raw.acceptedTpsRecent ?? raw.transportAcceptedTpsRecent),
        projectedHours: parseNumber(
          raw.projectedTo1MHours ?? raw.projectedTo1MHoursAtTransportRate,
        ),
        batchOutcomes: parseBatchOutcomes(raw.batchOutcomes),
        workerActive: worker.active,
        workerMax: worker.max,
        sample: parseSample(raw.sample),
        note: raw.note ?? null,
        sourcePath: displayPath(sourcePath) ?? fileName,
      };
    }),
  );

  return snapshots.sort((left, right) =>
    left.label.localeCompare(right.label, undefined, { numeric: true }),
  );
}

function collapseErrorLine(line: string): string | null {
  if (line.includes("Read timed out")) {
    return "read-timeout";
  }
  if (line.includes("too many requests")) {
    return "rate-limit";
  }
  if (line.includes("502 Bad Gateway")) {
    return "bad-gateway";
  }
  if (line.includes("lowerNonceInTx")) {
    return "nonce-drift";
  }
  if (line.includes("internal_issue")) {
    return "internal-issue";
  }

  return null;
}

async function readErrorSummary(runDir: string): Promise<Record<string, number>> {
  const eventsPath = path.join(runDir, "events.log");
  const text = await readTextIfExists(eventsPath);

  if (!text) {
    return {};
  }

  const lines = text.trim().split("\n").slice(-200);
  const counts = new Map<string, number>();

  for (const line of lines) {
    const key = collapseErrorLine(line);
    if (!key) {
      continue;
    }

    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => right[1] - left[1]),
  );
}

function latestByManifest<T extends { manifestName: string; updatedAt: string | null; createdAt: string | null }>(
  values: T[],
): T[] {
  const latest = new Map<string, T>();

  for (const value of sortByFreshness(values)) {
    if (!latest.has(value.manifestName)) {
      latest.set(value.manifestName, value);
    }
  }

  return sortByFreshness([...latest.values()]);
}

async function loadRunSummaries(): Promise<Challenge5RunSummary[]> {
  const runFiles = await listNestedRunFiles(RUNS_ROOT);
  const runs = await Promise.all(
    runFiles.map(async (runFile) => {
      const payload = await readJsonIfExists<RunJson>(runFile);
      if (!payload) {
        return null;
      }

      const manifestName = path.basename(payload.manifest ?? runFile, ".json");
      const runDir = path.dirname(runFile);

      return {
        label: labelFromManifestName(manifestName),
        manifestName,
        runDir: displayPath(runDir) ?? path.basename(runDir),
        runFile: displayPath(runFile) ?? path.basename(runFile),
        acceptedTarget: payload.acceptedTarget ?? null,
        acceptedTransactions: payload.counts?.acceptedTransactions ?? null,
        notAcceptedTransactions: payload.counts?.notAcceptedTransactions ?? null,
        overallTps: payload.rates?.acceptedTpsOverall ?? null,
        recentTps: payload.rates?.acceptedTpsRecent ?? null,
        projectedHours: payload.rates?.projectedHoursToTarget ?? null,
        routeName: payload.route?.name ?? null,
        routeReason: payload.route?.reason ?? null,
        walletCount: payload.walletCount ?? null,
        updatedAt: payload.updatedAt ?? null,
        createdAt: payload.createdAt ?? null,
        batchOutcomes: payload.counts?.batchOutcomeCounts ?? {},
        sample: payload.latestSample ?? {},
        checkpointPath: displayPath(payload.latestCheckpoint ?? null),
        errorSummary: await readErrorSummary(runDir),
      } satisfies Challenge5RunSummary;
    }),
  );

  return latestByManifest(
    runs.filter((run): run is Challenge5RunSummary => run !== null),
  );
}

async function loadFundingSummaries(): Promise<Challenge5FundingSummary[]> {
  const runFiles = await listNestedRunFiles(FUNDING_ROOT);
  const runs = await Promise.all(
    runFiles.map(async (runFile) => {
      const payload = await readJsonIfExists<RunJson>(runFile);
      if (!payload) {
        return null;
      }

      const manifestName = path
        .basename(path.dirname(runFile))
        .replace(/-[0-9]{8}T[0-9]{6}Z/, "");

      return {
        label: labelFromManifestName(manifestName),
        manifestName,
        runDir:
          displayPath(path.dirname(runFile)) ?? path.basename(path.dirname(runFile)),
        runFile: displayPath(runFile) ?? path.basename(runFile),
        acceptedTransactions: payload.counts?.acceptedTransactions ?? null,
        transportAcceptedTransactions:
          payload.counts?.transportAcceptedTransactions ?? null,
        notAcceptedTransactions: payload.counts?.notAcceptedTransactions ?? null,
        walletCount: payload.walletCount ?? null,
        deficitWalletCount: payload.deficitWalletCount ?? null,
        targetBalanceEgld: payload.targetBalanceEgld ?? null,
        totalEgld: payload.totalEgld ?? null,
        updatedAt: payload.updatedAt ?? null,
        createdAt: payload.createdAt ?? null,
      } satisfies Challenge5FundingSummary;
    }),
  );

  return latestByManifest(
    runs.filter((run): run is Challenge5FundingSummary => run !== null),
  );
}

async function loadPreflight(): Promise<Challenge5Preflight | null> {
  const payload = await readJsonIfExists<PreflightJson>(PREFLIGHT_PATH);

  if (!payload) {
    return null;
  }

  return {
    checkedAt: payload.checkedAt ?? null,
    manifest: payload.manifest ?? null,
    selectedRoute: payload.selectedRoute ?? null,
    sampleFundedWallets: payload.sampleFundedWallets ?? null,
    sampledWalletCount: payload.sampledWalletCount ?? null,
    walletCount: payload.walletCount ?? null,
    windowStartUtc: payload.windowStartUtc ?? null,
    windowEndUtc: payload.windowEndUtc ?? null,
    routeChecks: (payload.routeChecks ?? []).map((routeCheck) => ({
      route: routeCheck.route ?? "unknown",
      healthy: Boolean(routeCheck.healthy),
      reason: routeCheck.reason ?? "no reason recorded",
    })),
    sourcePath: displayPath(PREFLIGHT_PATH) ?? path.basename(PREFLIGHT_PATH),
  };
}

export async function getChallenge5DashboardData(): Promise<Challenge5DashboardData> {
  const [preflight, statuses, latestRuns, latestFundingRuns] = await Promise.all([
    loadPreflight(),
    loadStatusSnapshots(),
    loadRunSummaries(),
    loadFundingSummaries(),
  ]);

  const trancheStatuses = statuses.filter((status) =>
    status.label.toLowerCase().startsWith("tranche"),
  );
  const trackedStatuses = trancheStatuses.length > 0 ? trancheStatuses : statuses;

  const trackedAcceptedCurrent =
    trackedStatuses.length > 0
      ? trackedStatuses.reduce(
          (sum, status) => sum + (status.progress.current ?? 0),
          0,
        )
      : null;

  const trackedAcceptedTarget =
    trackedStatuses.length > 0
      ? trackedStatuses.reduce(
          (sum, status) => sum + (status.progress.target ?? 0),
          0,
        )
      : null;

  const lastUpdatedAt = pickLatestTimestamp(
    ...statuses.map((status) => status.updatedAt),
    ...latestRuns.flatMap((run) => [run.updatedAt, run.createdAt]),
    ...latestFundingRuns.flatMap((run) => [run.updatedAt, run.createdAt]),
    preflight?.checkedAt,
  );

  return {
    challengeRoot: displayPath(CHALLENGE_ROOT) ?? "Battle of Nodes/challenge-5",
    runbookPath: displayPath(RUNBOOK_PATH) ?? path.basename(RUNBOOK_PATH),
    objectiveTarget: 1_000_000,
    bonusWindowHours: 12,
    preflight,
    statuses,
    latestRuns,
    latestFundingRuns,
    trackedAcceptedCurrent,
    trackedAcceptedTarget,
    liveLaneCount: trackedStatuses.length,
    lastUpdatedAt,
  };
}
