import path from "node:path";
import { loadArtifact } from "./artifacts";
import { loadNodeRuntime } from "./nodes";
import { loadTxArtifact } from "./transactions";
import type { Challenge1DashboardData } from "./types";
import { pickLatestTimestamp, workspacePath } from "./workspace";

const LIVE_WALLET_ROOT = workspacePath("Battle of Nodes", "live-wallet");
const NATIVE_NODE_ROOT = workspacePath("Battle of Nodes", "native-node", "runtime");
const NODE_CHALLENGE_ROOT = workspacePath("Battle of Nodes", "node-challenge");

const setupStepDefs = [
  {
    key: "create-provider",
    label: "Create provider",
    filePath: path.join(LIVE_WALLET_ROOT, "create-provider-live.json"),
  },
  {
    key: "set-metadata",
    label: "Set metadata",
    filePath: path.join(LIVE_WALLET_ROOT, "set-metadata-live.json"),
  },
  {
    key: "delegate-topup",
    label: "Top up to 2500 EGLD",
    filePath: path.join(LIVE_WALLET_ROOT, "delegate-topup-live.json"),
  },
  {
    key: "add-node",
    label: "Add validator node",
    filePath: path.join(LIVE_WALLET_ROOT, "add-nodes-live.json"),
  },
  {
    key: "stake-node",
    label: "Stake validator node",
    filePath: path.join(LIVE_WALLET_ROOT, "stake-nodes-live.json"),
  },
] as const;

function toNumber(value: string | null) {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getChallenge1DashboardData(): Promise<Challenge1DashboardData> {
  const [setupSteps, mainNode, backupNode, artifactWatch] = await Promise.all([
    Promise.all(
      setupStepDefs.map((step) =>
        loadTxArtifact(step.key, step.label, step.filePath),
      ),
    ),
    loadNodeRuntime(path.join(NATIVE_NODE_ROOT, "node-0"), "node-0"),
    loadNodeRuntime(path.join(NATIVE_NODE_ROOT, "node-1"), "node-1"),
    Promise.all([
      ...setupStepDefs.map((step) =>
        loadArtifact(step.label, step.filePath),
      ),
      loadArtifact(
        "Primary node runtime",
        path.join(NATIVE_NODE_ROOT, "node-0", "stats", "session.info"),
      ),
      loadArtifact(
        "Primary node logs",
        path.join(NATIVE_NODE_ROOT, "node-0", "logs"),
      ),
      loadArtifact(
        "Challenge archive root",
        path.join(NODE_CHALLENGE_ROOT, "artifacts"),
      ),
    ]),
  ]);

  const providerAddress =
    setupSteps.find((step) => step.receiver && step.receiver !== setupSteps[0]?.receiver)
      ?.receiver ??
    setupSteps.find((step) => step.method === "delegate")?.receiver ??
    null;
  const providerStakeCurrent =
    setupSteps.some((step) => step.present)
      ? setupSteps.reduce((sum, step) => sum + toNumber(step.valueEgld), 0)
      : null;
  const lastUpdatedAt = pickLatestTimestamp(
    ...artifactWatch.map((artifact) => artifact.updatedAt),
    mainNode?.latestLogTimestamp,
    backupNode?.latestLogTimestamp,
  );

  return {
    providerAddress,
    operatorAddress: setupSteps.find((step) => step.sender)?.sender ?? null,
    providerStakeCurrent,
    providerStakeTarget: 2_500,
    setupSteps,
    mainNode,
    backupNode,
    artifactWatch,
    lastUpdatedAt,
  };
}
