import type { Challenge2DashboardData, ChallengeSpec } from "@/lib/control-room/types";
import { formatIso, shortAddress } from "@/lib/control-room/format";
import { ArtifactList } from "./ArtifactList";
import { MetricCard } from "./MetricCard";
import { SectionPanel } from "./SectionPanel";
import { StatusChip } from "./StatusChip";
import { TxArtifactTable } from "./TxArtifactTable";

type ChallengeTwoViewProps = {
  challenge: ChallengeSpec;
  data: Challenge2DashboardData;
};

export function ChallengeTwoView({
  challenge,
  data,
}: ChallengeTwoViewProps) {
  const completedTasks = data.tasks.filter((task) => task.status === "captured").length;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip label={challenge.phase} tone="muted" />
          <StatusChip label="live adapter" tone="live" />
          <StatusChip
            label={`${completedTasks}/${data.tasks.length} task lanes`}
            tone={completedTasks === data.tasks.length ? "live" : "warning"}
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
              Task-Lane Operations Room
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">
              {challenge.summary}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/52">
              {challenge.scoringFocus}
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/42">
              Provider context
            </div>
            <div className="mt-3 font-mono text-xl font-black text-white">
              {shortAddress(data.providerAddress, 14, 8)}
            </div>
            <div className="mt-3 text-sm leading-6 text-white/56">
              Delegation cap preflight: {data.providerCapEgld ?? "—"} EGLD
            </div>
            <div className="mt-4 text-xs text-white/42">
              last proof {formatIso(data.lastUpdatedAt)}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Tasks"
          value={`${completedTasks}/${data.tasks.length}`}
          hint="Each task keeps its own proof lane and follow-up target."
          accent={challenge.accent}
        />
        <MetricCard
          label="Cap Preflight"
          value={`${data.providerCapEgld ?? "—"} EGLD`}
          hint="Used to validate self-delegation headroom."
          accent={challenge.accent}
        />
        <MetricCard
          label="Artifacts"
          value={data.artifactWatch.filter((artifact) => artifact.present).length}
          hint="Whitelisted task artifacts currently visible in the workspace."
          accent={challenge.accent}
        />
      </div>

      <SectionPanel
        title="Task Lanes"
        description="These cards keep the intent, the exact call shape, and the success signal together so each scoreboard proof stays isolated."
        accent={challenge.accent}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {data.tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-[24px] border border-white/10 bg-black/20 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-lg font-semibold text-white">{task.title}</div>
                <StatusChip
                  label={task.status}
                  tone={task.status === "captured" ? "live" : "warning"}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-white/62">{task.summary}</p>
              <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-6 text-white/48">
                <div>target: {task.verificationTarget}</div>
                <div className="mt-1">signal: {task.successSignal}</div>
                <div className="mt-1">
                  primary: {task.primaryArtifact?.filePath ?? "missing"}
                </div>
                {task.supportingArtifacts.map((artifact) => (
                  <div key={artifact.key} className="mt-1">
                    support: {artifact.filePath}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionPanel>

      <SectionPanel
        title="Call Shape Matrix"
        description="Receiver, method, value, and artifact path are all visible side by side so you can sanity-check a lane in seconds."
        accent={challenge.accent}
      >
        <TxArtifactTable rows={data.callMatrix} />
      </SectionPanel>

      <SectionPanel
        title="Artifact Watch"
        description="Only the explicit operation proofs are in scope here, which keeps the repo clean and the dashboard reviewer-friendly."
        accent={challenge.accent}
      >
        <ArtifactList artifacts={data.artifactWatch} />
      </SectionPanel>
    </div>
  );
}
