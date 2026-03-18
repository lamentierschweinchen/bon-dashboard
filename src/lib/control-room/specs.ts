import type { ChallengeId, ChallengeSpec } from "./types";

const rel = (...segments: string[]) => segments.join("/");

export const challengeSpecs: ChallengeSpec[] = [
  {
    id: "challenge-1",
    title: "Challenge 1: Validator Setup",
    shortTitle: "Validator Setup",
    phase: "setup",
    accent: "#23f0c7",
    summary:
      "Track the end-to-end provider bootstrap path: create provider, reach 2500 EGLD, add and stake the node, then verify heartbeat and sync proof.",
    objective:
      "Create a BoN staking provider, fund it to 2500 EGLD, attach the validator, and prove the node is live with BoN-compliant naming.",
    scoringFocus:
      "Verifier-first proof: tx success, provider state, node naming, heartbeat readiness, and logs showing bootstrap progress.",
    liveMode: "live-adapter",
    docPaths: [
      rel("Battle of Nodes Public", "AGENT-START-HERE.md"),
      rel("Battle of Nodes Public", "docs", "agent-onchain-sequence.md"),
      rel("Battle of Nodes Public", "docs", "agent-verification-checklist.md"),
      rel("Battle of Nodes Public", "docs", "bon-network-reference.md"),
    ],
    artifactRoots: [
      rel("Battle of Nodes", "live-wallet"),
      rel("Battle of Nodes", "native-node"),
      rel("Battle of Nodes", "node-challenge"),
    ],
    dataSources: [
      {
        label: "BoN provider state",
        kind: "api",
        value: "https://api.battleofnodes.com/providers/<provider>",
      },
      {
        label: "Local node status",
        kind: "api",
        value: "http://127.0.0.1:8080/node/status",
      },
      {
        label: "Heartbeat status",
        kind: "api",
        value: "http://127.0.0.1:8080/node/heartbeatstatus",
      },
      {
        label: "Provider tx payloads",
        kind: "file",
        value: rel("Battle of Nodes", "live-wallet"),
      },
    ],
    successRules: [
      "Provider creation, metadata, add-nodes, delegate top-up, and stake-nodes all confirmed successfully.",
      "Provider name and node display name both contain BoN.",
      "Provider stake reaches at least 2500 EGLD.",
      "Node status and heartbeat are available, with logs proving bootstrap progress.",
    ],
    widgets: [
      {
        id: "setup-hero",
        kind: "hero",
        title: "Setup Progress Hero",
        description: "Provider lifecycle state, current proof count, and stake progress to 2500 EGLD.",
      },
      {
        id: "setup-checklist",
        kind: "checklist",
        title: "On-Chain Checklist",
        description: "Create provider, set metadata, top up, add node, and stake node as separate verifier steps.",
      },
      {
        id: "setup-proof-matrix",
        kind: "proof-matrix",
        title: "Proof Matrix",
        description: "Cross-check tx hash, receiver, amount, and follow-up state query for each required action.",
      },
      {
        id: "setup-node-timeline",
        kind: "timeline",
        title: "Node Boot Timeline",
        description: "Show local status, heartbeat readiness, trie-sync evidence, and runtime milestones.",
      },
    ],
  },
  {
    id: "challenge-2",
    title: "Challenge 2: On-Chain Operations",
    shortTitle: "On-Chain Ops",
    phase: "operations",
    accent: "#00b4d8",
    summary:
      "Split the five tasks into separate proof lanes so delegation, undelegation, fee change, and governance are never blended together.",
    objective:
      "Complete the community delegation, self-delegation, undelegation, service-fee update, and governance vote with task-specific proof.",
    scoringFocus:
      "Exact receiver, exact method, exact encoded amount, and follow-up contract/API verification per task.",
    liveMode: "live-adapter",
    docPaths: [
      rel("Battle of Nodes Public", "docs", "challenge-2-playbook.md"),
      rel("Battle of Nodes Public", "docs", "challenge-2-learnings.md"),
      rel("Battle of Nodes Public", "docs", "community-delegation-task.md"),
      rel("Battle of Nodes Public", "docs", "agent-verification-checklist.md"),
    ],
    artifactRoots: [
      rel("Battle of Nodes", "live-wallet"),
      rel("Battle of Nodes", "laptop-dry-run"),
    ],
    dataSources: [
      {
        label: "Community delegation contract",
        kind: "contract",
        value: "erd1qqqqqqqqqqqqqpgqxwakt2g7u9atsnr03gqcgmhcv38pt7mkd94q6shuwt",
      },
      {
        label: "Provider state",
        kind: "api",
        value: "https://api.battleofnodes.com/providers/<provider>",
      },
      {
        label: "Governance proposals",
        kind: "api",
        value: "https://api.battleofnodes.com/governance/proposals?status=Active",
      },
    ],
    successRules: [
      "Task 1 uses stake on the legacy community contract, not generic delegate.",
      "Task 2 checks provider delegation cap before self-delegating.",
      "Task 3 proves unDelegate success instead of waiting for withdrawal.",
      "Task 4 verifies getServiceFee = 789 at contract level.",
      "Task 5 proves proposal freshness and successful vote on an active proposal.",
    ],
    widgets: [
      {
        id: "ops-task-lanes",
        kind: "telemetry-grid",
        title: "Task Lanes",
        description: "One lane per task with preflight, tx result, and verification source of truth.",
      },
      {
        id: "ops-proof-matrix",
        kind: "proof-matrix",
        title: "Call Shape Matrix",
        description: "Receiver, method, encoded value, success status, and follow-up query side by side.",
      },
      {
        id: "ops-artifacts",
        kind: "artifact-rail",
        title: "Proof Bundle Tracker",
        description: "Track whether each tx hash, query result, and JSON artifact has been captured.",
      },
    ],
  },
  {
    id: "challenge-3",
    title: "Challenge 3: Backup, Restart, Logs",
    shortTitle: "Backup + Logs",
    phase: "operations",
    accent: "#ff8c42",
    summary:
      "Center the page on proof surfaces that mattered in practice: backup registration, strict naming, restart timing, and required log phrases.",
    objective:
      "Register the backup node, follow the literal BoN naming pattern, prove the restart drill, and package the required redundancy and trie-sync logs.",
    scoringFocus:
      "Heartbeat presence, exact naming convention, real restart downtime, and uploaded archive completeness.",
    liveMode: "live-adapter",
    docPaths: [
      rel("Battle of Nodes Public", "docs", "challenge-3-learnings.md"),
      rel("Battle of Nodes Public", "docs", "agent-verification-checklist.md"),
    ],
    artifactRoots: [
      rel("Battle of Nodes", "native-node"),
      rel("Battle of Nodes", "node-challenge"),
    ],
    dataSources: [
      {
        label: "Heartbeat data",
        kind: "api",
        value: "http://127.0.0.1:8080/node/heartbeatstatus",
      },
      {
        label: "Main and backup logs",
        kind: "log",
        value: rel("Battle of Nodes", "native-node"),
      },
      {
        label: "Submitted log archive",
        kind: "file",
        value: rel("Battle of Nodes", "node-challenge"),
      },
    ],
    successRules: [
      "Main and backup nodes appear under the same provider.",
      "Names follow the exact BoN-before-suffix pattern.",
      "Restart proof uses real shutdown and startup logs with enough elapsed downtime.",
      "Submitted archive includes backup proof plus trie sync and redundancy handler phrases.",
    ],
    widgets: [
      {
        id: "backup-topology",
        kind: "topology",
        title: "Provider Topology",
        description: "Visualize the main and backup pair, provider relation, and heartbeat status.",
      },
      {
        id: "backup-timeline",
        kind: "timeline",
        title: "Restart Drill Timeline",
        description: "Show stop, downtime, restart, and post-recovery health as a verifier-friendly sequence.",
      },
      {
        id: "backup-logs",
        kind: "artifact-rail",
        title: "Log Phrase Watch",
        description: "Track the exact strings needed for log upload acceptance.",
      },
    ],
  },
  {
    id: "challenge-4",
    title: "Challenge 4: Stress Windows",
    shortTitle: "Stress Windows",
    phase: "load",
    accent: "#e8601c",
    summary:
      "Treat every official window as its own workload with separate funding, sender attribution, run artifacts, and proof.",
    objective:
      "Execute live MoveBalance, DEX, cross-shard, and relayed workloads with enough recoverability to prove real on-chain success inside the official windows.",
    scoringFocus:
      "Window discipline, fresh funded address sets, crash-safe artifacts, and success counts rather than submission counts.",
    liveMode: "live-adapter",
    docPaths: [
      rel("Battle of Nodes Public", "docs", "stress-window-learnings.md"),
      rel("Battle of Nodes Public", "docs", "tx-sprint-harness.md"),
      rel("Battle of Nodes Public", "docs", "agent-verification-checklist.md"),
      rel("Battle of Nodes", "stress-test", "README.md"),
    ],
    artifactRoots: [
      rel("Battle of Nodes", "stress-test"),
      rel("Battle of Nodes Public", "scripts", "tx-sprint"),
    ],
    dataSources: [
      {
        label: "BoN gateway",
        kind: "api",
        value: "https://gateway.battleofnodes.com",
      },
      {
        label: "BoN API",
        kind: "api",
        value: "https://api.battleofnodes.com",
      },
      {
        label: "Window run artifacts",
        kind: "file",
        value: rel("Battle of Nodes", "stress-test"),
      },
    ],
    successRules: [
      "Use a dedicated manifest and funding pass per official window.",
      "Checkpoint run artifacts during the send loop instead of only at the end.",
      "Distinguish submitted transport acceptance from confirmed success on-chain.",
      "Preserve pre- and post-window log bundles when the challenge requires restart proof.",
    ],
    widgets: [
      {
        id: "window-hero",
        kind: "hero",
        title: "Window Control Hero",
        description: "Countdown, route health, sender attribution, and current success shortfall.",
      },
      {
        id: "window-telemetry",
        kind: "telemetry-grid",
        title: "Load Telemetry",
        description: "Show funding state, transport acceptance, finality checks, and recovery guidance.",
      },
      {
        id: "window-runs",
        kind: "run-table",
        title: "Run Ledger",
        description: "Compare windows, manifests, and follow-up verification passes in one place.",
      },
    ],
  },
  {
    id: "challenge-5",
    title: "Challenge 5: Million Transaction Sprint",
    shortTitle: "Million Tx Sprint",
    phase: "load",
    accent: "#ffd166",
    summary:
      "A live control room for the validator load challenge, reading tranche status files, run artifacts, funding passes, and route-preflight state from the workspace.",
    objective:
      "Drive the 1,000,000 MoveBalance sprint with lane-level visibility into transport acceptance, route quality, funding waves, and recovery pressure.",
    scoringFocus:
      "Simple reliable send lanes, tranche comparison, route drift, batch-quality signals, and artifact-backed recovery decisions.",
    liveMode: "live-adapter",
    docPaths: [
      rel("Battle of Nodes", "challenge-5", "validator-challenge-5-runbook.md"),
      rel("Battle of Nodes", "challenge-5", "validator_challenge_5_runner.py"),
      rel("Battle of Nodes Public", "docs", "stress-window-learnings.md"),
    ],
    artifactRoots: [
      rel("Battle of Nodes", "challenge-5", "artifacts", "runs"),
      rel("Battle of Nodes", "challenge-5", "artifacts", "funding"),
      rel("Battle of Nodes", "challenge-5", "fleet"),
    ],
    dataSources: [
      {
        label: "Tranche status markdown",
        kind: "file",
        value: rel("Battle of Nodes", "challenge-5"),
      },
      {
        label: "Run summaries",
        kind: "file",
        value: rel("Battle of Nodes", "challenge-5", "artifacts", "runs"),
      },
      {
        label: "Funding summaries",
        kind: "file",
        value: rel("Battle of Nodes", "challenge-5", "artifacts", "funding"),
      },
      {
        label: "Route preflight",
        kind: "file",
        value: rel(
          "Battle of Nodes",
          "challenge-5",
          "validator-challenge-5-preflight.json",
        ),
      },
    ],
    successRules: [
      "Keep route selection explicit and visible, not implicit in runner defaults.",
      "Track each active tranche separately with its own progress, sample, and projection.",
      "Pair transport acceptance with sample-based finality signals before deciding on recovery load.",
      "Use artifact freshness to drive decisions instead of reconstructing status from memory.",
    ],
    widgets: [
      {
        id: "tx-hero",
        kind: "hero",
        title: "Sprint Hero",
        description: "Objective target, live tracked acceptance, lane count, and artifact freshness.",
      },
      {
        id: "tx-routes",
        kind: "telemetry-grid",
        title: "Lane Telemetry",
        description: "Route, TPS, batch outcomes, samples, and worker ceiling for each active lane.",
      },
      {
        id: "tx-runs",
        kind: "run-table",
        title: "Latest Runs",
        description: "Surface the newest run.json and funding summaries per manifest so recovery is based on artifacts.",
      },
      {
        id: "tx-artifacts",
        kind: "artifact-rail",
        title: "Artifact Roots",
        description: "Keep run files, checkpoints, and status markdown visible for quick drill-in.",
      },
    ],
  },
];

export function getChallengeSpec(challengeId: string): ChallengeSpec | null {
  return (
    challengeSpecs.find((challenge) => challenge.id === challengeId) ?? null
  );
}

export const challengeSpecMap = Object.fromEntries(
  challengeSpecs.map((challenge) => [challenge.id, challenge]),
) as Record<ChallengeId, ChallengeSpec>;
