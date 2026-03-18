import type { Challenge1DashboardData, ChallengeSpec } from "@/lib/control-room/types";
import {
  formatIso,
  formatNumber,
  formatPercent,
  shortAddress,
} from "@/lib/control-room/format";
import { ArtifactList } from "./ArtifactList";
import { MetricCard } from "./MetricCard";
import { NodeRuntimeCard } from "./NodeRuntimeCard";
import { ProgressBar } from "./ProgressBar";
import { SectionPanel } from "./SectionPanel";
import { StatusChip } from "./StatusChip";
import { TxArtifactTable } from "./TxArtifactTable";

type ChallengeOneViewProps = {
  challenge: ChallengeSpec;
  data: Challenge1DashboardData;
};

export function ChallengeOneView({
  challenge,
  data,
}: ChallengeOneViewProps) {
  const completedSteps = data.setupSteps.filter((step) => step.present).length;
  const stakeRatio =
    data.providerStakeCurrent !== null && data.providerStakeTarget > 0
      ? data.providerStakeCurrent / data.providerStakeTarget
      : null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip label={challenge.phase} tone="muted" />
          <StatusChip label="live adapter" tone="live" />
          <StatusChip
            label={`${completedSteps}/${data.setupSteps.length} setup proofs`}
            tone={completedSteps === data.setupSteps.length ? "live" : "warning"}
          />
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div
              className="font-mono text-[12px] uppercase tracking-[0.35em]"
              style={{ color: challenge.accent }}
            >
              {challenge.shortTitle}
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              Provider Bootstrap Control Room
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">
              {challenge.summary}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
              {challenge.scoringFocus}
            </p>
            <div className="mt-6">
              <ProgressBar ratio={stakeRatio} accent={challenge.accent} />
              <div className="mt-2 text-sm text-white/54">
                Provider funding is tracking {formatNumber(data.providerStakeCurrent)} /{" "}
                {formatNumber(data.providerStakeTarget)} EGLD.
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/42">
              Setup snapshot
            </div>
            <div className="mt-3 font-mono text-3xl font-black text-white">
              {formatPercent(stakeRatio)}
            </div>
            <div className="mt-3 text-sm leading-6 text-white/56">
              Provider {shortAddress(data.providerAddress)} · operator{" "}
              {shortAddress(data.operatorAddress)}
            </div>
            <div className="mt-4 text-xs leading-6 text-white/42">
              last proof {formatIso(data.lastUpdatedAt)}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Stake"
          value={`${formatNumber(data.providerStakeCurrent)} EGLD`}
          hint={`Target ${formatNumber(data.providerStakeTarget)} EGLD`}
          accent={challenge.accent}
        />
        <MetricCard
          label="Setup Steps"
          value={`${completedSteps}/${data.setupSteps.length}`}
          hint="Create provider, metadata, top-up, add node, stake node."
          accent={challenge.accent}
        />
        <MetricCard
          label="Main Node"
          value={data.mainNode?.displayName ?? "—"}
          hint={
            data.mainNode?.localApi
              ? `syncing ${data.mainNode.localApi.syncing ? "yes" : "no"}`
              : "Using file artifacts only."
          }
          accent={challenge.accent}
        />
        <MetricCard
          label="Latest Artifact"
          value={formatIso(data.lastUpdatedAt)}
          hint="Freshness across setup tx files and node runtime evidence."
          accent={challenge.accent}
        />
      </div>

      <SectionPanel
        title="On-Chain Checklist"
        description="Every required setup action is broken out as its own verifier surface with the exact call shape preserved."
        accent={challenge.accent}
      >
        <TxArtifactTable rows={data.setupSteps} />
      </SectionPanel>

      <SectionPanel
        title="Node Runtime"
        description="Local node telemetry is blended with file-backed evidence so the page still works when the local API is offline."
        accent={challenge.accent}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <NodeRuntimeCard label="Primary validator" node={data.mainNode} />
          <NodeRuntimeCard label="Backup preview" node={data.backupNode} />
        </div>
      </SectionPanel>

      <SectionPanel
        title="Artifact Watch"
        description="Only the explicit proof files are watched here; wallet keystores and personal credentials stay out of scope."
        accent={challenge.accent}
      >
        <ArtifactList artifacts={data.artifactWatch} />
      </SectionPanel>
    </div>
  );
}
