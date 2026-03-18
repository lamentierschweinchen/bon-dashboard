import path from "node:path";
import { loadArtifact } from "./artifacts";
import type {
  Challenge4DashboardData,
  Challenge4WindowRun,
  Challenge4WindowSummary,
} from "./types";
import {
  displayPath,
  pickLatestTimestamp,
  readJsonIfExists,
  readdirIfExists,
  sortByFreshness,
  workspacePath,
} from "./workspace";

const STRESS_ROOT = workspacePath("Battle of Nodes", "stress-test");
const NODE_CHALLENGE_ROOT = workspacePath("Battle of Nodes", "node-challenge");

type ManifestJson = {
  count?: number;
  wallets?: Array<{
    shard?: number | string;
  }>;
};

type RunJson = {
  kind?: string;
  createdAt?: string;
  updatedAt?: string;
  walletCount?: number;
  txCount?: number;
  batchSize?: number;
  completed?: boolean;
  submitted?: number;
  target?: number;
  sender?: string;
  destinationToken?: string;
};

function numberOrNull(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

async function loadWindowRuns(windowRoot: string) {
  const runDir = path.join(windowRoot, "runs");
  const entries = await readdirIfExists(runDir);
  const runs = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map(async (entry) => {
        const filePath = path.join(runDir, entry.name);
        const payload = await readJsonIfExists<RunJson>(filePath);
        if (!payload) {
          return null;
        }

        return {
          key: entry.name,
          kind: payload.kind ?? "unknown",
          createdAt: payload.createdAt ?? null,
          updatedAt: payload.updatedAt ?? null,
          walletCount: numberOrNull(payload.walletCount),
          txCount: numberOrNull(payload.txCount),
          batchSize: numberOrNull(payload.batchSize),
          completed: typeof payload.completed === "boolean" ? payload.completed : null,
          submitted: numberOrNull(payload.submitted),
          target: numberOrNull(payload.target),
          sender: payload.sender ?? null,
          destinationToken: payload.destinationToken ?? null,
          filePath: displayPath(filePath) ?? entry.name,
        } satisfies Challenge4WindowRun;
      }),
  );

  return sortByFreshness(
    runs.filter((run): run is Challenge4WindowRun => run !== null),
  );
}

async function loadWindowSummary(windowName: string): Promise<Challenge4WindowSummary> {
  const windowRoot = path.join(STRESS_ROOT, windowName);
  const manifestPath = path.join(windowRoot, "manifest.json");
  const [manifest, runs] = await Promise.all([
    readJsonIfExists<ManifestJson>(manifestPath),
    loadWindowRuns(windowRoot),
  ]);

  const shardDistribution: Record<string, number> = {};
  for (const wallet of manifest?.wallets ?? []) {
    const shard = String(wallet.shard ?? "unknown");
    shardDistribution[shard] = (shardDistribution[shard] ?? 0) + 1;
  }

  const fundingRuns = runs.filter((run) => run.kind === "fund-wallets");
  const workloadRuns = runs.filter((run) => run.kind !== "fund-wallets");
  const latestFunding = fundingRuns[0] ?? null;

  return {
    key: windowName,
    label: windowName.replace("challenge-wallets-", "").replace(/-/g, " "),
    manifestPath: displayPath(manifestPath) ?? "manifest.json",
    manifestWalletCount:
      numberOrNull(manifest?.count) ?? manifest?.wallets?.length ?? null,
    shardDistribution,
    workloadKinds: [...new Set(workloadRuns.map((run) => run.kind))],
    workloadSubmitted:
      workloadRuns.length > 0
        ? workloadRuns.reduce((sum, run) => sum + (run.submitted ?? 0), 0)
        : null,
    workloadTarget:
      workloadRuns.length > 0
        ? workloadRuns.reduce(
            (sum, run) => sum + (run.target ?? run.txCount ?? 0),
            0,
          )
        : null,
    fundingSubmitted: latestFunding?.submitted ?? null,
    fundingTarget:
      latestFunding?.target ?? latestFunding?.walletCount ?? null,
    lastUpdatedAt: pickLatestTimestamp(
      ...runs.flatMap((run) => [run.updatedAt, run.createdAt]),
    ),
    runs,
  };
}

export async function getChallenge4DashboardData(): Promise<Challenge4DashboardData> {
  const stressEntries = await readdirIfExists(STRESS_ROOT);
  const windowNames = stressEntries
    .filter(
      (entry) =>
        entry.isDirectory() && entry.name.startsWith("challenge-wallets-window-"),
    )
    .map((entry) => entry.name)
    .sort();

  const [windows, recoveryArtifacts, submissionArtifacts] = await Promise.all([
    Promise.all(windowNames.map((windowName) => loadWindowSummary(windowName))),
    Promise.all([
      loadArtifact(
        "Recovery sweep plan",
        path.join(STRESS_ROOT, "recovery", "sweep-20260317T194226Z.json"),
      ),
      loadArtifact(
        "Recovery submit log",
        path.join(STRESS_ROOT, "recovery", "sweep-submit-20260317T195553Z.json"),
      ),
    ]),
    Promise.all([
      loadArtifact(
        "Stress main-machine bundle",
        path.join(
          STRESS_ROOT,
          "artifacts",
          "challenge-4-stress-main-machine-20260314.zip",
        ),
      ),
      loadArtifact(
        "Challenge 4 upload bundle",
        path.join(
          NODE_CHALLENGE_ROOT,
          "artifacts",
          "submissions",
          "challenge-4",
          "challenge-4-stress-erd12w3lk8gs7nmrjysqgwh3m5sgq085mq8asnysxac892w0j9qffc4s5lzrrn.zip",
        ),
      ),
      loadArtifact(
        "Challenge 4 restart bundle",
        path.join(
          NODE_CHALLENGE_ROOT,
          "artifacts",
          "submissions",
          "challenge-4",
          "challenge-4-stress-erd12w3lk8gs7nmrjysqgwh3m5sgq085mq8asnysxac892w0j9qffc4s5lzrrn-postrestart-segment.zip",
        ),
      ),
      loadArtifact(
        "Challenge 4 combined log",
        path.join(
          NODE_CHALLENGE_ROOT,
          "artifacts",
          "submissions",
          "challenge-4",
          "challenge-4-stress-erd12w3lk8gs7nmrjysqgwh3m5sgq085mq8asnysxac892w0j9qffc4s5lzrrn.log",
        ),
      ),
      loadArtifact(
        "Challenge 4 restart log",
        path.join(
          NODE_CHALLENGE_ROOT,
          "artifacts",
          "submissions",
          "challenge-4",
          "challenge-4-stress-erd12w3lk8gs7nmrjysqgwh3m5sgq085mq8asnysxac892w0j9qffc4s5lzrrn-postrestart-segment.log",
        ),
      ),
    ]),
  ]);

  return {
    windows,
    recoveryArtifacts,
    submissionArtifacts,
    totalWorkloadSubmitted:
      windows.length > 0
        ? windows.reduce((sum, window) => sum + (window.workloadSubmitted ?? 0), 0)
        : null,
    totalWorkloadTarget:
      windows.length > 0
        ? windows.reduce((sum, window) => sum + (window.workloadTarget ?? 0), 0)
        : null,
    lastUpdatedAt: pickLatestTimestamp(
      ...windows.map((window) => window.lastUpdatedAt),
      ...recoveryArtifacts.map((artifact) => artifact.updatedAt),
      ...submissionArtifacts.map((artifact) => artifact.updatedAt),
    ),
  };
}
