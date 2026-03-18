export type ChallengeId =
  | "challenge-1"
  | "challenge-2"
  | "challenge-3"
  | "challenge-4"
  | "challenge-5";

export type ChallengeLiveMode = "planned" | "design-ready" | "live-adapter";

export type DataSourceSpec = {
  label: string;
  kind: "file" | "api" | "contract" | "log" | "tool";
  value: string;
};

export type WidgetBlueprint = {
  id: string;
  kind:
    | "hero"
    | "checklist"
    | "proof-matrix"
    | "artifact-rail"
    | "timeline"
    | "telemetry-grid"
    | "run-table"
    | "topology";
  title: string;
  description: string;
};

export type ChallengeSpec = {
  id: ChallengeId;
  title: string;
  shortTitle: string;
  phase: "setup" | "operations" | "load";
  accent: string;
  summary: string;
  objective: string;
  scoringFocus: string;
  liveMode: ChallengeLiveMode;
  docPaths: string[];
  artifactRoots: string[];
  dataSources: DataSourceSpec[];
  successRules: string[];
  widgets: WidgetBlueprint[];
};

export type ControlRoomArtifact = {
  label: string;
  path: string;
  present: boolean;
  note?: string | null;
  updatedAt?: string | null;
};

export type ControlRoomTxArtifact = {
  key: string;
  label: string;
  filePath: string;
  present: boolean;
  txHash: string | null;
  sender: string | null;
  receiver: string | null;
  nonce: number | null;
  gasLimit: number | null;
  method: string | null;
  arguments: string[];
  rawData: string | null;
  valueAtomic: string | null;
  valueEgld: string | null;
};

export type ControlRoomLocalApiStatus = {
  port: number;
  source: string;
  available: boolean;
  displayName: string | null;
  syncing: boolean | null;
  nonce: number | null;
  highestNonce: number | null;
  nodeType: string | null;
  redundancyLevel: number | null;
  heartbeatCount: number | null;
  heartbeatActive: number | null;
};

export type ControlRoomNodeRuntime = {
  nodeKey: string;
  displayName: string | null;
  redundancyLevel: number | null;
  sessionRedundancyLevel: number | null;
  shardId: string | null;
  restApiInterface: string | null;
  appVersion: string | null;
  latestLogPath: string | null;
  latestLogTimestamp: string | null;
  logCount: number;
  startEvidence: boolean;
  trieSyncEvidence: boolean;
  redundancyKeyEvidence: boolean;
  namingRule: string | null;
  namingPass: boolean | null;
  localApi: ControlRoomLocalApiStatus | null;
};

export type Challenge1DashboardData = {
  providerAddress: string | null;
  operatorAddress: string | null;
  providerStakeCurrent: number | null;
  providerStakeTarget: number;
  setupSteps: ControlRoomTxArtifact[];
  mainNode: ControlRoomNodeRuntime | null;
  backupNode: ControlRoomNodeRuntime | null;
  artifactWatch: ControlRoomArtifact[];
  lastUpdatedAt: string | null;
};

export type Challenge2Task = {
  id: string;
  title: string;
  summary: string;
  primaryArtifact: ControlRoomTxArtifact | null;
  supportingArtifacts: ControlRoomTxArtifact[];
  verificationTarget: string;
  successSignal: string;
  status: "captured" | "missing";
};

export type Challenge2DashboardData = {
  providerAddress: string | null;
  providerCapEgld: string | null;
  tasks: Challenge2Task[];
  callMatrix: ControlRoomTxArtifact[];
  artifactWatch: ControlRoomArtifact[];
  lastUpdatedAt: string | null;
};

export type Challenge3DashboardData = {
  providerAddress: string | null;
  backupRegistration: ControlRoomTxArtifact | null;
  mainNode: ControlRoomNodeRuntime | null;
  backupNode: ControlRoomNodeRuntime | null;
  archiveArtifacts: ControlRoomArtifact[];
  lastUpdatedAt: string | null;
};

export type Challenge4WindowRun = {
  key: string;
  kind: string;
  createdAt: string | null;
  updatedAt: string | null;
  walletCount: number | null;
  txCount: number | null;
  batchSize: number | null;
  completed: boolean | null;
  submitted: number | null;
  target: number | null;
  sender: string | null;
  destinationToken: string | null;
  filePath: string;
};

export type Challenge4WindowSummary = {
  key: string;
  label: string;
  manifestPath: string;
  manifestWalletCount: number | null;
  shardDistribution: Record<string, number>;
  workloadKinds: string[];
  workloadSubmitted: number | null;
  workloadTarget: number | null;
  fundingSubmitted: number | null;
  fundingTarget: number | null;
  lastUpdatedAt: string | null;
  runs: Challenge4WindowRun[];
};

export type Challenge4DashboardData = {
  windows: Challenge4WindowSummary[];
  recoveryArtifacts: ControlRoomArtifact[];
  submissionArtifacts: ControlRoomArtifact[];
  totalWorkloadSubmitted: number | null;
  totalWorkloadTarget: number | null;
  lastUpdatedAt: string | null;
};

export type Challenge5RouteCheck = {
  route: string;
  healthy: boolean;
  reason: string;
};

export type Challenge5Preflight = {
  checkedAt: string | null;
  manifest: string | null;
  selectedRoute: string | null;
  sampleFundedWallets: number | null;
  sampledWalletCount: number | null;
  walletCount: number | null;
  windowStartUtc: string | null;
  windowEndUtc: string | null;
  routeChecks: Challenge5RouteCheck[];
  sourcePath: string;
};

export type Challenge5Progress = {
  current: number | null;
  target: number | null;
  ratio: number | null;
};

export type Challenge5StatusSnapshot = {
  key: string;
  label: string;
  updatedAt: string | null;
  route: string | null;
  routeReason: string | null;
  progress: Challenge5Progress;
  overallTps: number | null;
  recentTps: number | null;
  projectedHours: number | null;
  batchOutcomes: Record<string, number>;
  workerActive: number | null;
  workerMax: number | null;
  sample: Record<string, number>;
  note: string | null;
  sourcePath: string;
};

export type Challenge5RunSummary = {
  label: string;
  manifestName: string;
  runDir: string;
  runFile: string;
  acceptedTarget: number | null;
  acceptedTransactions: number | null;
  notAcceptedTransactions: number | null;
  overallTps: number | null;
  recentTps: number | null;
  projectedHours: number | null;
  routeName: string | null;
  routeReason: string | null;
  walletCount: number | null;
  updatedAt: string | null;
  createdAt: string | null;
  batchOutcomes: Record<string, number>;
  sample: Record<string, number>;
  checkpointPath: string | null;
  errorSummary: Record<string, number>;
};

export type Challenge5FundingSummary = {
  label: string;
  manifestName: string;
  runDir: string;
  runFile: string;
  acceptedTransactions: number | null;
  transportAcceptedTransactions: number | null;
  notAcceptedTransactions: number | null;
  walletCount: number | null;
  deficitWalletCount: number | null;
  targetBalanceEgld: string | null;
  totalEgld: string | null;
  updatedAt: string | null;
  createdAt: string | null;
};

export type Challenge5DashboardData = {
  challengeRoot: string;
  runbookPath: string;
  objectiveTarget: number;
  bonusWindowHours: number;
  preflight: Challenge5Preflight | null;
  statuses: Challenge5StatusSnapshot[];
  latestRuns: Challenge5RunSummary[];
  latestFundingRuns: Challenge5FundingSummary[];
  trackedAcceptedCurrent: number | null;
  trackedAcceptedTarget: number | null;
  liveLaneCount: number;
  lastUpdatedAt: string | null;
};
