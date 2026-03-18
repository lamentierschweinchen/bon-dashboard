import path from "node:path";
import { loadArtifact } from "./artifacts";
import { loadTxArtifact, parseHexAtomicToDisplay } from "./transactions";
import type { Challenge2DashboardData, Challenge2Task } from "./types";
import { pickLatestTimestamp, workspacePath } from "./workspace";

const LIVE_WALLET_ROOT = workspacePath("Battle of Nodes", "live-wallet");

const taskFileDefs = {
  communityStake: path.join(
    LIVE_WALLET_ROOT,
    "stake-10-egld-multiversx-community.json",
  ),
  providerCap: path.join(LIVE_WALLET_ROOT, "modify-own-provider-cap-2510.json"),
  selfDelegate: path.join(LIVE_WALLET_ROOT, "delegate-10-egld-own-provider.json"),
  undelegate: path.join(
    LIVE_WALLET_ROOT,
    "undelegate-1-egld-own-provider.json",
  ),
  serviceFee: path.join(LIVE_WALLET_ROOT, "change-service-fee-789.json"),
  governanceVote: path.join(
    LIVE_WALLET_ROOT,
    "governance-vote-proposal-4-yes.json",
  ),
} as const;

export async function getChallenge2DashboardData(): Promise<Challenge2DashboardData> {
  const [
    communityStake,
    providerCap,
    selfDelegate,
    undelegate,
    serviceFee,
    governanceVote,
    artifactWatch,
  ] = await Promise.all([
    loadTxArtifact("community-stake", "Task 1: Community delegation", taskFileDefs.communityStake),
    loadTxArtifact("provider-cap", "Task 2 Preflight: Provider cap", taskFileDefs.providerCap),
    loadTxArtifact("self-delegate", "Task 2: Self delegation", taskFileDefs.selfDelegate),
    loadTxArtifact("undelegate", "Task 3: Undelegate", taskFileDefs.undelegate),
    loadTxArtifact("service-fee", "Task 4: Service fee", taskFileDefs.serviceFee),
    loadTxArtifact("governance-vote", "Task 5: Governance vote", taskFileDefs.governanceVote),
    Promise.all([
      loadArtifact("Community delegation artifact", taskFileDefs.communityStake),
      loadArtifact("Provider cap artifact", taskFileDefs.providerCap),
      loadArtifact("Self-delegation artifact", taskFileDefs.selfDelegate),
      loadArtifact("Undelegation artifact", taskFileDefs.undelegate),
      loadArtifact("Service-fee artifact", taskFileDefs.serviceFee),
      loadArtifact("Governance vote artifact", taskFileDefs.governanceVote),
    ]),
  ]);

  const tasks: Challenge2Task[] = [
    {
      id: "task-1",
      title: "Task 1: Community delegation",
      summary:
        "Stake 10 EGLD on the MultiversX community contract with the legacy `stake` call shape.",
      primaryArtifact: communityStake,
      supportingArtifacts: [],
      verificationTarget:
        "Receiver must be the legacy community provider contract, not your own provider.",
      successSignal: "Method `stake` with 10 EGLD captured locally.",
      status: communityStake.present ? "captured" : "missing",
    },
    {
      id: "task-2",
      title: "Task 2: Self delegation",
      summary:
        "Raise your total delegation cap to 2510 EGLD, then self-delegate 10 EGLD to your provider.",
      primaryArtifact: selfDelegate,
      supportingArtifacts: [providerCap],
      verificationTarget:
        "Cap preflight must show 2510 EGLD before the self-delegate call is used as proof.",
      successSignal: "Cap adjustment plus `delegate` to your provider both captured.",
      status:
        providerCap.present && selfDelegate.present ? "captured" : "missing",
    },
    {
      id: "task-3",
      title: "Task 3: Undelegation",
      summary:
        "Prove the `unDelegate` call itself landed instead of waiting on withdrawal completion.",
      primaryArtifact: undelegate,
      supportingArtifacts: [],
      verificationTarget:
        "Encoded amount should match 1 EGLD and the provider receiver should stay the same.",
      successSignal: "Method `unDelegate` with 1 EGLD encoded in the call data.",
      status: undelegate.present ? "captured" : "missing",
    },
    {
      id: "task-4",
      title: "Task 4: Service fee update",
      summary:
        "Change the provider fee to 789 and keep the contract-level expectation visible.",
      primaryArtifact: serviceFee,
      supportingArtifacts: [],
      verificationTarget: "Call data should encode `changeServiceFee@0315`.",
      successSignal: "Fee update artifact captured with target 789 basis points.",
      status: serviceFee.present ? "captured" : "missing",
    },
    {
      id: "task-5",
      title: "Task 5: Governance vote",
      summary:
        "Vote yes on proposal 4 and preserve the proposal id and choice in the payload.",
      primaryArtifact: governanceVote,
      supportingArtifacts: [],
      verificationTarget: "Call data should encode `vote@04@796573` (`yes`).",
      successSignal: "Governance vote artifact captured against proposal 4.",
      status: governanceVote.present ? "captured" : "missing",
    },
  ];

  const lastUpdatedAt = pickLatestTimestamp(
    ...artifactWatch.map((artifact) => artifact.updatedAt),
  );

  return {
    providerAddress: selfDelegate.receiver ?? providerCap.receiver ?? null,
    providerCapEgld: parseHexAtomicToDisplay(providerCap.arguments[0] ?? null),
    tasks,
    callMatrix: [
      communityStake,
      providerCap,
      selfDelegate,
      undelegate,
      serviceFee,
      governanceVote,
    ],
    artifactWatch,
    lastUpdatedAt,
  };
}
