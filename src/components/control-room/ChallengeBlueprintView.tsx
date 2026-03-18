import type { ChallengeSpec } from "@/lib/control-room/types";
import { MetricCard } from "./MetricCard";
import { SectionPanel } from "./SectionPanel";
import { StatusChip } from "./StatusChip";

type ChallengeBlueprintViewProps = {
  challenge: ChallengeSpec;
};

function modeTone(mode: ChallengeSpec["liveMode"]) {
  if (mode === "live-adapter") {
    return "live" as const;
  }
  if (mode === "design-ready") {
    return "planned" as const;
  }
  return "muted" as const;
}

function formatMode(mode: ChallengeSpec["liveMode"]) {
  return mode.replace(/-/g, " ");
}

export function ChallengeBlueprintView({
  challenge,
}: ChallengeBlueprintViewProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip label={challenge.phase} tone="muted" />
          <StatusChip
            label={formatMode(challenge.liveMode)}
            tone={modeTone(challenge.liveMode)}
          />
        </div>

        <div className="mt-5 max-w-4xl">
          <div
            className="font-mono text-[12px] uppercase tracking-[0.35em]"
            style={{ color: challenge.accent }}
          >
            {challenge.shortTitle}
          </div>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            {challenge.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-white/68">
            {challenge.summary}
          </p>
          <p className="mt-3 text-sm leading-6 text-white/52">
            {challenge.scoringFocus}
          </p>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Objective"
          value={<span className="text-lg font-semibold">{challenge.objective}</span>}
          hint="This is the scoreboard-facing outcome the page should optimize for."
          accent={challenge.accent}
        />
        <MetricCard
          label="Widgets"
          value={challenge.widgets.length}
          hint="Modular panels already mapped for this challenge."
          accent={challenge.accent}
        />
        <MetricCard
          label="Data Sources"
          value={challenge.dataSources.length}
          hint="Files, APIs, logs, and contract reads the page should watch."
          accent={challenge.accent}
        />
      </div>

      <SectionPanel
        title="Dashboard Modules"
        description="These widget blueprints are the stable contract between challenge instructions and the rendered page."
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
              <p className="mt-2 text-sm leading-6 text-white/58">
                {widget.description}
              </p>
            </div>
          ))}
        </div>
      </SectionPanel>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionPanel
          title="Success Rules"
          description="These are the scoreboard-critical checks the page should keep visible at all times."
          accent={challenge.accent}
        >
          <div className="space-y-3">
            {challenge.successRules.map((rule) => (
              <div
                key={rule}
                className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/68"
              >
                {rule}
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Watched Inputs"
          description="These are the first adapters to wire up when we activate live telemetry for this page."
          accent={challenge.accent}
        >
          <div className="space-y-3">
            {challenge.dataSources.map((source) => (
              <div
                key={`${source.kind}-${source.label}`}
                className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-white">
                    {source.label}
                  </div>
                  <StatusChip label={source.kind} tone="muted" />
                </div>
                <div className="mt-2 break-all font-mono text-xs leading-6 text-white/45">
                  {source.value}
                </div>
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionPanel
          title="Artifact Roots"
          description="Workspace directories the page should surface directly so proof bundles are never hidden."
          accent={challenge.accent}
        >
          <div className="space-y-3">
            {challenge.artifactRoots.map((artifactRoot) => (
              <div
                key={artifactRoot}
                className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 font-mono text-xs leading-6 text-white/52"
              >
                {artifactRoot}
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Reference Docs"
          description="These docs are the prompt-to-spec source material for this challenge."
          accent={challenge.accent}
        >
          <div className="space-y-3">
            {challenge.docPaths.map((docPath) => (
              <div
                key={docPath}
                className="rounded-[18px] border border-white/8 bg-black/20 px-4 py-3 font-mono text-xs leading-6 text-white/52"
              >
                {docPath}
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
