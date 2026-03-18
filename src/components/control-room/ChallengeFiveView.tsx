import Link from "next/link";
import type {
  Challenge5DashboardData,
  Challenge5FundingSummary,
  Challenge5RunSummary,
  Challenge5StatusSnapshot,
  ChallengeSpec,
} from "@/lib/control-room/types";
import { MetricCard } from "./MetricCard";
import { ProgressBar } from "./ProgressBar";
import { SectionPanel } from "./SectionPanel";
import { StatusChip } from "./StatusChip";

type ChallengeFiveViewProps = {
  challenge: ChallengeSpec;
  data: Challenge5DashboardData;
};

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number | null) {
  return value === null ? "—" : numberFormatter.format(value);
}

function formatHours(value: number | null) {
  return value === null ? "—" : `${value.toFixed(2)}h`;
}

function formatIso(value: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatSample(sample: Record<string, number>) {
  const entries = Object.entries(sample);
  if (entries.length === 0) {
    return "—";
  }

  return entries.map(([key, value]) => `${key} ${value}`).join(" · ");
}

function formatBatchOutcomes(outcomes: Record<string, number>) {
  const entries = Object.entries(outcomes);
  if (entries.length === 0) {
    return "—";
  }

  return entries.map(([key, value]) => `${key} ${numberFormatter.format(value)}`).join(" · ");
}

function formatErrorSummary(errorSummary: Record<string, number>) {
  const entries = Object.entries(errorSummary);
  if (entries.length === 0) {
    return "No hot errors captured";
  }

  return entries
    .slice(0, 3)
    .map(([label, count]) => `${label} ${count}`)
    .join(" · ");
}

function signalTone(status: Challenge5StatusSnapshot) {
  if ((status.sample.success ?? 0) > 0 && (status.sample.pending ?? 0) === 0) {
    return "live" as const;
  }
  if ((status.sample.pending ?? 0) > 0) {
    return "warning" as const;
  }
  return "muted" as const;
}

function modeHint(status: Challenge5StatusSnapshot) {
  if ((status.sample.pending ?? 0) > 0) {
    return "Finality lag visible in the sample set.";
  }
  if ((status.sample.success ?? 0) > 0) {
    return "Recent sampled hashes are landing successfully.";
  }
  return "Sample set has not confirmed success yet.";
}

function RunTable({
  rows,
}: {
  rows: Challenge5RunSummary[];
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/8">
          <thead className="bg-white/[0.03]">
            <tr className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/42">
              <th className="px-4 py-3 text-left">Lane</th>
              <th className="px-4 py-3 text-left">Accepted</th>
              <th className="px-4 py-3 text-left">TPS</th>
              <th className="px-4 py-3 text-left">Route</th>
              <th className="px-4 py-3 text-left">Sample</th>
              <th className="px-4 py-3 text-left">Hot Errors</th>
              <th className="px-4 py-3 text-left">Artifact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map((row) => (
              <tr key={row.runFile} className="align-top text-sm text-white/72">
                <td className="px-4 py-4">
                  <div className="font-semibold text-white">{row.label}</div>
                  <div className="mt-1 font-mono text-xs text-white/40">
                    {row.manifestName}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-mono text-white">
                    {formatNumber(row.acceptedTransactions)}
                    {row.acceptedTarget !== null ? (
                      <span className="text-white/38">
                        {" "}
                        / {formatNumber(row.acceptedTarget)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-white/42">
                    dropped {formatNumber(row.notAcceptedTransactions)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-mono text-white">
                    {row.overallTps?.toFixed(2) ?? "—"}
                  </div>
                  <div className="mt-1 text-xs text-white/42">
                    recent {row.recentTps?.toFixed(2) ?? "—"} · proj {formatHours(row.projectedHours)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>{row.routeName ?? "—"}</div>
                  <div className="mt-1 text-xs text-white/42">
                    {row.routeReason ?? "no route reason"}
                  </div>
                </td>
                <td className="px-4 py-4 text-xs leading-6 text-white/56">
                  {formatSample(row.sample)}
                </td>
                <td className="px-4 py-4 text-xs leading-6 text-white/56">
                  {formatErrorSummary(row.errorSummary)}
                </td>
                <td className="px-4 py-4">
                  <div className="font-mono text-xs leading-6 text-white/45">
                    {row.runDir}
                  </div>
                  {row.checkpointPath ? (
                    <div className="mt-1 font-mono text-xs text-white/35">
                      checkpoint: {row.checkpointPath}
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FundingTable({
  rows,
}: {
  rows: Challenge5FundingSummary[];
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/8">
          <thead className="bg-white/[0.03]">
            <tr className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/42">
              <th className="px-4 py-3 text-left">Lane</th>
              <th className="px-4 py-3 text-left">Accepted</th>
              <th className="px-4 py-3 text-left">Target Balance</th>
              <th className="px-4 py-3 text-left">Deficit Wallets</th>
              <th className="px-4 py-3 text-left">Artifact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map((row) => (
              <tr key={row.runFile} className="align-top text-sm text-white/72">
                <td className="px-4 py-4">
                  <div className="font-semibold text-white">{row.label}</div>
                  <div className="mt-1 font-mono text-xs text-white/40">
                    {row.manifestName}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-mono text-white">
                    {formatNumber(row.acceptedTransactions)}
                  </div>
                  <div className="mt-1 text-xs text-white/42">
                    transport {formatNumber(row.transportAcceptedTransactions)} · dropped{" "}
                    {formatNumber(row.notAcceptedTransactions)}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div>{row.targetBalanceEgld ?? "—"} EGLD</div>
                  <div className="mt-1 text-xs text-white/42">
                    total {row.totalEgld ?? "—"} EGLD
                  </div>
                </td>
                <td className="px-4 py-4">
                  {formatNumber(row.deficitWalletCount)}
                </td>
                <td className="px-4 py-4 font-mono text-xs leading-6 text-white/45">
                  {row.runDir}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function ChallengeFiveView({
  challenge,
  data,
}: ChallengeFiveViewProps) {
  const preflight = data.preflight;
  const trackedRatio =
    data.trackedAcceptedCurrent !== null &&
    data.trackedAcceptedTarget !== null &&
    data.trackedAcceptedTarget > 0
      ? data.trackedAcceptedCurrent / data.trackedAcceptedTarget
      : null;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip label={challenge.phase} tone="muted" />
          <StatusChip label="live adapter" tone="live" />
          <StatusChip
            label={`${data.liveLaneCount} live lanes`}
            tone={data.liveLaneCount > 0 ? "live" : "warning"}
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
              Battle Of Nodes Control Room
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">
              {challenge.summary}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
              {challenge.scoringFocus}
            </p>
            <div className="mt-6">
              <ProgressBar ratio={trackedRatio} accent={challenge.accent} />
              <div className="mt-2 text-sm text-white/54">
                Tracked lane acceptance is currently {formatNumber(data.trackedAcceptedCurrent)} /{" "}
                {formatNumber(data.trackedAcceptedTarget)}.
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/42">
              Artifact freshness
            </div>
            <div className="mt-3 font-mono text-3xl font-black text-white">
              {formatIso(data.lastUpdatedAt)}
            </div>
            <div className="mt-3 text-sm leading-6 text-white/56">
              Last observed update across preflight, status markdown, and run artifacts.
            </div>
            <div className="mt-5 space-y-2 font-mono text-xs leading-6 text-white/42">
              <div>runbook: {data.runbookPath}</div>
              <div>challenge root: {data.challengeRoot}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Objective Target"
          value={formatNumber(data.objectiveTarget)}
          hint={`Bonus clears if the target lands within ${data.bonusWindowHours} hours.`}
          accent={challenge.accent}
        />
        <MetricCard
          label="Tracked Accepted"
          value={formatNumber(data.trackedAcceptedCurrent)}
          hint={
            data.trackedAcceptedTarget !== null
              ? `Across the currently visible lane targets: ${formatNumber(data.trackedAcceptedTarget)}`
              : "No lane target files are visible yet."
          }
          accent={challenge.accent}
        />
        <MetricCard
          label="Live Lanes"
          value={data.liveLaneCount}
          hint="Derived from the visible tranche status files."
          accent={challenge.accent}
        />
        <MetricCard
          label="Selected Route"
          value={preflight?.selectedRoute ?? "—"}
          hint={`Preflight checked ${formatIso(preflight?.checkedAt ?? null)}.`}
          accent={challenge.accent}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionPanel
          title="Preflight"
          description="This is the route gating and wallet sampling state that should decide the starting lane before the send loop begins."
          accent={challenge.accent}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard
              label="Wallet Count"
              value={formatNumber(preflight?.walletCount ?? null)}
              hint="How many senders the selected manifest exposes."
              accent={challenge.accent}
            />
            <MetricCard
              label="Sample Funded"
              value={formatNumber(preflight?.sampleFundedWallets ?? null)}
              hint={
                preflight?.sampledWalletCount !== null &&
                preflight?.sampledWalletCount !== undefined
                  ? `Out of ${formatNumber(preflight.sampledWalletCount)} sampled wallets.`
                  : "No preflight sample captured."
              }
              accent={challenge.accent}
            />
            <MetricCard
              label="Window"
              value={
                <span className="text-lg font-semibold">
                  {formatIso(preflight?.windowStartUtc ?? null)} to{" "}
                  {formatIso(preflight?.windowEndUtc ?? null)}
                </span>
              }
              hint="UTC window from the runner preflight artifact."
              accent={challenge.accent}
            />
          </div>

          <div className="mt-4 space-y-3">
            {(preflight?.routeChecks ?? []).map((routeCheck) => (
              <div
                key={routeCheck.route}
                className="rounded-[22px] border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-lg font-semibold text-white">
                    {routeCheck.route}
                  </div>
                  <StatusChip
                    label={routeCheck.healthy ? "healthy" : "blocked"}
                    tone={routeCheck.healthy ? "live" : "warning"}
                  />
                </div>
                <div className="mt-2 text-sm leading-6 text-white/56">
                  {routeCheck.reason}
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Live Lane Telemetry"
          description="Every status file gets its own card so tranche drift is visible immediately instead of being buried in runner logs."
          accent={challenge.accent}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {data.statuses.map((status) => (
              <div
                key={status.key}
                className="rounded-[24px] border border-white/10 bg-black/20 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-white">
                      {status.label}
                    </div>
                    <div className="mt-1 font-mono text-xs text-white/42">
                      {formatIso(status.updatedAt)}
                    </div>
                  </div>
                  <StatusChip label={status.route ?? "no route"} tone={signalTone(status)} />
                </div>

                <div className="mt-4 font-mono text-2xl font-black text-white">
                  {formatNumber(status.progress.current)}
                  {status.progress.target !== null ? (
                    <span className="text-base font-medium text-white/42">
                      {" "}
                      / {formatNumber(status.progress.target)}
                    </span>
                  ) : null}
                </div>

                <div className="mt-3">
                  <ProgressBar ratio={status.progress.ratio} accent={challenge.accent} />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                      Throughput
                    </div>
                    <div className="mt-1 text-sm text-white/72">
                      overall {status.overallTps?.toFixed(2) ?? "—"} · recent{" "}
                      {status.recentTps?.toFixed(2) ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                      Projection
                    </div>
                    <div className="mt-1 text-sm text-white/72">
                      {formatHours(status.projectedHours)}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                      Batch outcomes
                    </div>
                    <div className="mt-1 text-xs leading-6 text-white/56">
                      {formatBatchOutcomes(status.batchOutcomes)}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                      Sample
                    </div>
                    <div className="mt-1 text-xs leading-6 text-white/56">
                      {formatSample(status.sample)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-6 text-white/48">
                  {modeHint(status)}
                  <div className="mt-1">
                    workers {formatNumber(status.workerActive)} / {formatNumber(status.workerMax)} ·{" "}
                    {status.routeReason ?? "no route reason"}
                  </div>
                  {status.note ? <div className="mt-1">{status.note}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      <SectionPanel
        title="Latest Run Artifacts"
        description="This table collapses the newest run.json per manifest so recovery decisions come from actual run state, not ad hoc notes."
        accent={challenge.accent}
      >
        <RunTable rows={data.latestRuns} />
      </SectionPanel>

      <SectionPanel
        title="Latest Funding Passes"
        description="Funding gets its own lane because underfunded manifests and transport acceptance shortfalls are a separate failure mode from the main send loop."
        accent={challenge.accent}
      >
        <FundingTable rows={data.latestFundingRuns} />
      </SectionPanel>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionPanel
          title="Modular Page Contract"
          description="This challenge uses the same registry-driven page model the other challenge pages will use once their live adapters are wired."
          accent={challenge.accent}
        >
          <div className="grid gap-4 md:grid-cols-2">
            {challenge.widgets.map((widget) => (
              <div
                key={widget.id}
                className="rounded-[22px] border border-white/10 bg-black/20 p-4"
              >
                <div
                  className="font-mono text-[11px] uppercase tracking-[0.24em]"
                  style={{ color: challenge.accent }}
                >
                  {widget.kind}
                </div>
                <div className="mt-2 text-lg font-semibold text-white">
                  {widget.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-white/56">
                  {widget.description}
                </p>
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Artifact Roots"
          description="These paths are the live workspace sources behind the page."
          accent={challenge.accent}
        >
          <div className="space-y-3">
            {challenge.artifactRoots.map((artifactRoot) => (
              <div
                key={artifactRoot}
                className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 font-mono text-xs leading-6 text-white/48"
              >
                {artifactRoot}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/control-room"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Back to overview
            </Link>
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
