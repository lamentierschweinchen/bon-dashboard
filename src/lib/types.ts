// src/lib/types.ts

/** The server-side aggregated snapshot returned by /api/snapshot. */
export type DashboardSnapshot = {
  generatedAt: string;
  nodesOnline: number;
  nodesSynced: number;
  backupCoveragePct: number;
  backupCoverageProviders: {
    covered: number;
    total: number;
  };
  distinctActiveOperators: number;
  communityRunNodesOnline: number;
  transactionsSinceLaunch: number;
  successfulTxLast24h: number;
  scCallsLast24h: number;
  blocksSinceLaunch: number;
  epoch: {
    number: number;
    roundsPassed: number;
    roundsPerEpoch: number;
    progressPct: number;
    remainingMs: number | null;
  };
};

export type TransactionHistoryPoint = {
  timestamp: string;
  cumulativeTransactions: number;
};

export type TransactionHistory = {
  generatedAt: string;
  from: string;
  to: string;
  bucketSeconds: number;
  bucketLabel: string;
  points: TransactionHistoryPoint[];
};

/** Shape of a node object from the BoN /nodes API. Only the fields we use. */
export type BonNode = {
  name?: string;
  shard: number;
  type: string;
  status: string;
  online: boolean;
  nonce?: number;
  owner?: string;
  identity?: string;
  provider?: string;
};

/** Shape of /network/status/{shard} response. */
export type NetworkStatusResponse = {
  data: {
    status: {
      erd_nonce: number;
      erd_epoch_number: number;
      erd_rounds_passed_in_current_epoch: number;
      erd_rounds_per_epoch: number;
    };
  };
};

/** Shape of /network/config response (subset). */
export type NetworkConfigResponse = {
  data: {
    config: {
      erd_round_duration: string;
    };
  };
};
