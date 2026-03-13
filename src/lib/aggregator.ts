// src/lib/aggregator.ts

import {
  BON_API_BASE,
  BON_LAUNCH_TS,
  BON_LAUNCH_EPOCH,
  BON_LAUNCH_PARTIAL_BLOCKS_E2033,
  SYNC_TOLERANCE_BLOCKS,
  BACKUP_NAME_REGEX,
  OFFICIAL_INFRA_IDENTITIES,
  OFFICIAL_INFRA_NAME_PATTERNS,
  OFFICIAL_INFRA_OWNERS,
  OFFICIAL_INFRA_PROVIDERS,
} from "./constants";
import type {
  DashboardSnapshot,
  BonNode,
  NetworkStatusResponse,
  NetworkConfigResponse,
} from "./types";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BON_API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`BoN API error: ${res.status} ${path}`);
  return res.json() as Promise<T>;
}

async function fetchNumber(path: string): Promise<number> {
  const res = await fetch(`${BON_API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`BoN API error: ${res.status} ${path}`);
  const text = await res.text();
  return Number(text);
}

async function fetchAllNodes(): Promise<BonNode[]> {
  const allNodes: BonNode[] = [];
  let from = 0;
  const size = 500;

  while (true) {
    const page = await fetchJson<BonNode[]>(
      `/nodes?size=${size}&from=${from}&fields=name,shard,type,status,online,nonce,owner,identity,provider`
    );
    allNodes.push(...page);
    if (page.length < size) break;
    from += size;
  }

  return allNodes;
}

function isSynced(
  node: BonNode,
  shardNonces: Record<number, number>
): boolean {
  const shardNonce = shardNonces[node.shard];
  return (
    node.online === true &&
    typeof node.nonce === "number" &&
    typeof shardNonce === "number" &&
    shardNonce - node.nonce >= 0 &&
    shardNonce - node.nonce <= SYNC_TOLERANCE_BLOCKS
  );
}

function isOfficialInfra(node: BonNode): boolean {
  const identity = (node.identity || "").toLowerCase();
  const name = node.name || "";

  return (
    OFFICIAL_INFRA_IDENTITIES.has(identity) ||
    OFFICIAL_INFRA_NAME_PATTERNS.some((re) => re.test(name)) ||
    OFFICIAL_INFRA_OWNERS.has(node.owner || "") ||
    OFFICIAL_INFRA_PROVIDERS.has(node.provider || "")
  );
}

async function computeBlocksSinceLaunch(
  currentEpoch: number
): Promise<number> {
  let total = BON_LAUNCH_PARTIAL_BLOCKS_E2033;

  // Fetch block counts for each epoch since launch in parallel
  const epochs: number[] = [];
  for (let e = BON_LAUNCH_EPOCH + 1; e <= currentEpoch; e++) {
    epochs.push(e);
  }

  const counts = await Promise.all(
    epochs.map((e) => fetchNumber(`/blocks/count?epoch=${e}`))
  );

  for (const count of counts) {
    total += count;
  }

  return total;
}

export async function buildSnapshot(): Promise<DashboardSnapshot> {
  const after24h = Math.floor(Date.now() / 1000) - 86400;

  // Fetch ALL endpoints in parallel — nodes, shard statuses, tx counts, config
  const [
    nodes,
    nodesOnline,
    status0,
    status1,
    status2,
    statusMeta,
    transactionsSinceLaunch,
    successfulTxLast24h,
    scCallsLast24h,
    networkConfig,
  ] = await Promise.all([
    fetchAllNodes(),
    fetchNumber("/nodes/count?online=true"),
    fetchJson<NetworkStatusResponse>("/network/status/0"),
    fetchJson<NetworkStatusResponse>("/network/status/1"),
    fetchJson<NetworkStatusResponse>("/network/status/2"),
    fetchJson<NetworkStatusResponse>("/network/status/4294967295"),
    fetchNumber(`/transactions/count?after=${BON_LAUNCH_TS}`),
    fetchNumber(`/transactions/count?status=success&after=${after24h}`),
    fetchNumber(
      `/transactions/count?isScCall=true&status=success&after=${after24h}`
    ),
    fetchJson<NetworkConfigResponse>("/network/config"),
  ]);

  // Build shard nonce map
  const shardNonces: Record<number, number> = {
    0: status0.data.status.erd_nonce,
    1: status1.data.status.erd_nonce,
    2: status2.data.status.erd_nonce,
    4294967295: statusMeta.data.status.erd_nonce,
  };

  // Stat 2: Nodes Fully Synced
  const nodesSynced = nodes.filter((n) => isSynced(n, shardNonces)).length;

  // Stat 3: Backup Coverage %
  const onlineMainProviders = new Set(
    nodes
      .filter(
        (n) =>
          n.online === true &&
          n.provider &&
          n.type === "validator" &&
          !BACKUP_NAME_REGEX.test(n.name || "")
      )
      .map((n) => n.provider!)
  );

  const onlineBackupProviders = new Set(
    nodes
      .filter(
        (n) =>
          n.online === true &&
          n.provider &&
          BACKUP_NAME_REGEX.test(n.name || "")
      )
      .map((n) => n.provider!)
  );

  const coveredCount = [...onlineMainProviders].filter((p) =>
    onlineBackupProviders.has(p)
  ).length;

  const backupCoveragePct =
    onlineMainProviders.size === 0
      ? 0
      : (100 * coveredCount) / onlineMainProviders.size;

  // Stat 4: Distinct Active Operators
  const distinctActiveOperators = new Set(
    nodes
      .filter((n) => n.online === true && !!n.owner)
      .map((n) => n.owner!)
  ).size;

  // Stat 5: Community-Run Nodes Online
  const communityRunNodesOnline = nodes.filter(
    (n) => n.online === true && !isOfficialInfra(n)
  ).length;

  // Stat 9: Blocks Since Launch
  const currentEpoch = statusMeta.data.status.erd_epoch_number;
  const blocksSinceLaunch = await computeBlocksSinceLaunch(currentEpoch);

  // Stat 10: Epoch Progress
  const metaStatus = statusMeta.data.status;
  const roundsPassed = metaStatus.erd_rounds_passed_in_current_epoch;
  const roundsPerEpoch = metaStatus.erd_rounds_per_epoch;
  const epochProgressPct = (100 * roundsPassed) / roundsPerEpoch;

  const roundDurationMs = Number(
    networkConfig.data.config.erd_round_duration
  );
  const remainingRounds = roundsPerEpoch - roundsPassed;
  const remainingMs =
    roundDurationMs > 0 ? remainingRounds * roundDurationMs : null;

  return {
    generatedAt: new Date().toISOString(),
    nodesOnline,
    nodesSynced,
    backupCoveragePct,
    backupCoverageProviders: {
      covered: coveredCount,
      total: onlineMainProviders.size,
    },
    distinctActiveOperators,
    communityRunNodesOnline,
    transactionsSinceLaunch,
    successfulTxLast24h,
    scCallsLast24h,
    blocksSinceLaunch,
    epoch: {
      number: currentEpoch,
      roundsPassed,
      roundsPerEpoch,
      progressPct: epochProgressPct,
      remainingMs,
    },
  };
}
