import type {
  Challenge4DashboardData,
  Challenge4WindowRun,
  ChallengeSpec,
} from "@/lib/control-room/types";
import { formatIso, formatNumber } from "@/lib/control-room/format";
import { ArtifactList } from "./ArtifactList";
import { MetricCard } from "./MetricCard";
import { ProgressBar } from "./ProgressBar";
import { SectionPanel } from "./SectionPanel";
import { StatusChip } from "./StatusChip";

type ChallengeFourViewProps = {
  challenge: ChallengeSpec;
  data: Challenge4DashboardData;
};

function formatShardDistribution(distribution: Record<string, number>) {
  const entries = Object.entries(distribution);
  if (entries.length === 0) {
    return "—";
  }

  return entries
    .sort((left, right) => left[0].localeCompare(right[0], undefined, { numeric: true }))
    .map(([shard, count]) => `s${shard} ${count}`)
    .join(" · ");
}

function RunLedger({
  rows,
}: {
  rows: Array<Challenge4WindowRun & { windowLabel: string }>;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/8">
          <thead className="bg-white/[0.03]">
            <tr className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/42">
              <th className="px-4 py-3 text-left">Window</th>
              <th className="px-4 py-3 text-left">Kind</th>
              <th className="px-4 py-3 text-left">Submitted</th>
              <th className="px-4 py-3 text-left">Wallets</th>
              <th className="px-4 py-3 text-left">Batch</th>
              <th className="px-4 py-3 text-left">Artifact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map((row) => (
              <tr key={`${row.windowLabel}-${row.key}`} className="align-top text-sm text-white/72">
                <td className="px-4 py-4">
                  <div className="font-semibold text-white">{row.windowLabel}</div>
                  <div className="mt-1 text-xs text-white/42">
                    {formatIso(row.updatedAt ?? row.createdAt)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-mono text-white">{row.kind}</div>
                  <div className="mt-1 text-xs text-white/42">
                    {row.destinationToken ?? row.sender ?? "no extra route data"}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-mono text-white">
                    {formatNumber(row.submitted)} / {formatNumber(row.target ?? row.txCount)}
                  </div>
                  <div className="mt-1 text-xs text-white/42">
                    completed {row.completed === null ? "—" : row.completed ? "yes" : "no"}
                  </div>
                </td>
                <td className="px-4 py-4">{formatNumber(row.walletCount)}</td>
                <td className="px-4 py-4">{formatNumber(row.batchSize)}</td>
                <td className="px-4 py-4 font-mono text-xs leading-6 text-white/45">
                  {row.filePath}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ChallengeFourView({
  challenge,
  data,
}: ChallengeFourViewProps) {
  const completedWindows = data.windows.filter((window) => {
    if (window.workloadTarget === null || window.workloadSubmitted === null) {
      return false;
    }

    return window.workloadSubmitted >= window.workloadTarget;
  }).length;
  const totalRatio =
    data.totalWorkloadSubmitted !== null &&
    data.totalWorkloadTarget !== null &&
    data.totalWorkloadTarget > 0
      ? data.totalWorkloadSubmitted / data.totalWorkloadTarget
      : null;
  const allRuns = data.windows.flatMap((window) =>
    window.runs.map((run) => ({
      ...run,
      windowLabel: window.label,
    })),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip label={challenge.phase} tone="muted" />
          <StatusChip label="live adapter" tone="live" />
          <StatusChip
            label={`${completedWindows}/${data.windows.length} windows clear`}
            tone={completedWindows === data.windows.length ? "live" : "warning"}
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
              Stress Window Control Room
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">
              {challenge.summary}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
              {challenge.scoringFocus}
            </p>
            <div className="mt-6">
              <ProgressBar ratio={totalRatio} accent={challenge.accent} />
              <div className="mt-2 text-sm text-white/54">
                Tracked window workload is currently {formatNumber(data.totalWorkloadSubmitted)} /{" "}
                {formatNumber(data.totalWorkloadTarget)} submitted.
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/42">
              Window snapshot
            </div>
            <div className="mt-3 font-mono text-3xl font-black text-white">
              {formatNumber(data.windows.length)}
            </div>
            <div className="mt-3 text-sm leading-6 text-white/56">
              Official windows with funded manifests, workload runs, and packaged submissions.
            </div>
            <div className="mt-4 text-xs text-white/42">
              last proof {formatIso(data.lastUpdatedAt)}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Windows"
          value={data.windows.length}
          hint="Each official window is treated as its own workload lane."
          accent={challenge.accent}
        />
        <MetricCard
          label="Target Ops"
          value={formatNumber(data.totalWorkloadTarget)}
          hint="Summed from the non-funding workload artifacts."
          accent={challenge.accent}
        />
        <MetricCard
          label="Submitted Ops"
          value={formatNumber(data.totalWorkloadSubmitted)}
          hint="Transport submission totals captured from window run artifacts."
          accent={challenge.accent}
        />
        <MetricCard
          label="Recovery Files"
          value={data.recoveryArtifacts.filter((artifact) => artifact.present).length}
          hint="Sweep plan and sweep-submit evidence."
          accent={challenge.accent}
        />
      </div>

      <SectionPanel
        title="Window Control"
        description="Every official window has its own manifest, shard mix, funding lane, and workload mix. Keeping them separate makes recovery decisions much cleaner."
        accent={challenge.accent}
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {data.windows.map((window) => {
            const ratio =
              window.workloadSubmitted !== null &&
              window.workloadTarget !== null &&
              window.workloadTarget > 0
                ? window.workloadSubmitted / window.workloadTarget
                : null;

            return (
              <div
                key={window.key}
                className="rounded-[24px] border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-lg font-semibold text-white">{window.label}</div>
                  <StatusChip
                    label={
                      ratio !== null && ratio >= 1 ? "cleared" : "in review"
                    }
                    tone={ratio !== null && ratio >= 1 ? "live" : "warning"}
                  />
                </div>
                <div className="mt-3">
                  <ProgressBar ratio={ratio} accent={challenge.accent} />
                </div>
                <div className="mt-3 text-sm leading-6 text-white/62">
                  workload {formatNumber(window.workloadSubmitted)} /{" "}
                  {formatNumber(window.workloadTarget)} · funding{" "}
                  {formatNumber(window.fundingSubmitted)} /{" "}
                  {formatNumber(window.fundingTarget)}
                </div>
                <div className="mt-3 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-6 text-white/48">
                  <div>manifest: {window.manifestPath}</div>
                  <div className="mt-1">
                    wallets {formatNumber(window.manifestWalletCount)} ·{" "}
                    {formatShardDistribution(window.shardDistribution)}
                  </div>
                  <div className="mt-1">
                    workloads {window.workloadKinds.join(" · ") || "—"}
                  </div>
                  <div className="mt-1">last update {formatIso(window.lastUpdatedAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Run Ledger"
        description="Funding, cross-shard, relayed, and swap workloads are all rendered from the run files so nothing depends on handwritten notes."
        accent={challenge.accent}
      >
        <RunLedger rows={allRuns} />
      </SectionPanel>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionPanel
          title="Recovery Artifacts"
          description="These are the recovery-side planning and submit artifacts captured after the official windows."
          accent={challenge.accent}
        >
          <ArtifactList artifacts={data.recoveryArtifacts} />
        </SectionPanel>

        <SectionPanel
          title="Submission Bundles"
          description="Packaged challenge-4 zips and logs stay visible here so the repo can stay code-only while the live workspace keeps the evidence."
          accent={challenge.accent}
        >
          <ArtifactList artifacts={data.submissionArtifacts} />
        </SectionPanel>
      </div>
    </div>
  );
}
