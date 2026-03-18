import path from "node:path";
import { loadArtifact } from "./artifacts";
import { loadNodeRuntime } from "./nodes";
import { loadTxArtifact } from "./transactions";
import type { Challenge3DashboardData } from "./types";
import { pickLatestTimestamp, workspacePath } from "./workspace";

const LIVE_WALLET_ROOT = workspacePath("Battle of Nodes", "live-wallet");
const NATIVE_NODE_ROOT = workspacePath("Battle of Nodes", "native-node", "runtime");
const NODE_CHALLENGE_ROOT = workspacePath("Battle of Nodes", "node-challenge");

export async function getChallenge3DashboardData(): Promise<Challenge3DashboardData> {
  const backupRegistrationPath = path.join(LIVE_WALLET_ROOT, "add-backup-node.json");
  const [backupRegistration, backupRegistrationArtifact, mainNode, backupNode, archiveArtifacts] =
    await Promise.all([
      loadTxArtifact(
        "backup-registration",
        "Backup registration",
        backupRegistrationPath,
      ),
      loadArtifact("Backup registration artifact", backupRegistrationPath),
      loadNodeRuntime(path.join(NATIVE_NODE_ROOT, "node-0"), "node-0"),
      loadNodeRuntime(path.join(NATIVE_NODE_ROOT, "node-1"), "node-1"),
      Promise.all([
        loadArtifact(
          "Primary node archive",
          path.join(NODE_CHALLENGE_ROOT, "artifacts", "node-0.zip"),
        ),
        loadArtifact(
          "BoN Logs upload",
          path.join(
            NODE_CHALLENGE_ROOT,
            "artifacts",
            "submissions",
            "BoN Logs.zip",
          ),
        ),
        loadArtifact(
          "Backup + Trie Sync upload",
          path.join(
            NODE_CHALLENGE_ROOT,
            "artifacts",
            "submissions",
            "BoN Backup + Trie Sync Logs.zip",
          ),
        ),
      ]),
    ]);

  const lastUpdatedAt = pickLatestTimestamp(
    backupRegistrationArtifact.updatedAt,
    mainNode?.latestLogTimestamp,
    backupNode?.latestLogTimestamp,
    ...archiveArtifacts.map((artifact) => artifact.updatedAt),
  );

  return {
    providerAddress: backupRegistration.receiver,
    backupRegistration,
    mainNode,
    backupNode,
    archiveArtifacts,
    lastUpdatedAt,
  };
}
