import Link from "next/link";
import { MetricCard } from "@/components/control-room/MetricCard";
import { ProgressBar } from "@/components/control-room/ProgressBar";
import { SectionPanel } from "@/components/control-room/SectionPanel";
import { StatusChip } from "@/components/control-room/StatusChip";
import { getChallenge1DashboardData } from "@/lib/control-room/challenge1";
import { getChallenge2DashboardData } from "@/lib/control-room/challenge2";
import { getChallenge3DashboardData } from "@/lib/control-room/challenge3";
import { getChallenge4DashboardData } from "@/lib/control-room/challenge4";
import { getChallenge5DashboardData } from "@/lib/control-room/challenge5";
import { formatIso, formatNumber } from "@/lib/control-room/format";
import { challengeSpecs } from "@/lib/control-room/specs";
import { pickLatestTimestamp } from "@/lib/control-room/workspace";

export const dynamic = "force-dynamic";

function formatMode(mode: string) {
  return mode.replace(/-/g, " ");
}

function modeTone(mode: string) {
  if (mode === "live-adapter") {
    return "live" as const;
  }
  if (mode === "design-ready") {
    return "planned" as const;
  }
  return "muted" as const;
}

export default async function ControlRoomHome() {
  const [challenge1, challenge2, challenge3, challenge4, challenge5] =
    await Promise.all([
      getChallenge1DashboardData(),
      getChallenge2DashboardData(),
      getChallenge3DashboardData(),
      getChallenge4DashboardData(),
      getChallenge5DashboardData(),
    ]);

  const liveAdapterCount = challengeSpecs.filter(
    (challenge) => challenge.liveMode === "live-adapter",
  ).length;
  const overallLatest = pickLatestTimestamp(
    challenge1.lastUpdatedAt,
    challenge2.lastUpdatedAt,
    challenge3.lastUpdatedAt,
    challenge4.lastUpdatedAt,
    challenge5.lastUpdatedAt,
  );
  const sprintRatio =
    challenge5.trackedAcceptedCurrent !== null &&
    challenge5.trackedAcceptedTarget !== null &&
    challenge5.trackedAcceptedTarget > 0
      ? challenge5.trackedAcceptedCurrent / challenge5.trackedAcceptedTarget
      : null;
  const challengeDetails = {
    "challenge-1": {
      primary: `${challenge1.setupSteps.filter((step) => step.present).length}/${challenge1.setupSteps.length} setup proofs`,
      secondary: `${formatNumber(challenge1.providerStakeCurrent)} / ${formatNumber(challenge1.providerStakeTarget)} EGLD`,
    },
    "challenge-2": {
      primary: `${challenge2.tasks.filter((task) => task.status === "captured").length}/${challenge2.tasks.length} task lanes`,
      secondary: `cap ${challenge2.providerCapEgld ?? "—"} EGLD`,
    },
    "challenge-3": {
      primary: `${challenge3.archiveArtifacts.filter((artifact) => artifact.present).length}/${challenge3.archiveArtifacts.length} archive proofs`,
      secondary: `${challenge3.mainNode?.displayName ?? "main missing"} · ${challenge3.backupNode?.displayName ?? "backup missing"}`,
    },
    "challenge-4": {
      primary: `${challenge4.windows.filter((window) => {
        if (window.workloadSubmitted === null || window.workloadTarget === null) {
          return false;
        }
        return window.workloadSubmitted >= window.workloadTarget;
      }).length}/${challenge4.windows.length} windows clear`,
      secondary: `${formatNumber(challenge4.totalWorkloadSubmitted)} / ${formatNumber(challenge4.totalWorkloadTarget)} workload ops`,
    },
    "challenge-5": {
      primary: `${challenge5.liveLaneCount} live lanes`,
      secondary: `${formatNumber(challenge5.trackedAcceptedCurrent)} / ${formatNumber(challenge5.trackedAcceptedTarget)} accepted`,
    },
  } as const;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex flex-wrap gap-3">
          <StatusChip label="challenge registry" tone="live" />
          <StatusChip label="artifact adapters" tone="live" />
          <StatusChip label="repo-safe paths" tone="live" />
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div>
            <div className="font-mono text-[12px] uppercase tracking-[0.35em] text-[#23f0c7]">
              Overview
            </div>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-white">
              All Five Challenges Are Now Live In The Control Room
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-white/68">
              The control room is now challenge-aware end to end: provider
              setup, on-chain ops, backup/log proofing, official stress windows,
              and the million-transaction sprint all read real workspace
              artifacts instead of static placeholders.
            </p>
            <div className="mt-6">
              <ProgressBar ratio={sprintRatio} accent="#ffd166" />
              <div className="mt-2 text-sm text-white/54">
                The sprint page is currently tracking{" "}
                {formatNumber(challenge5.trackedAcceptedCurrent)} /{" "}
                {formatNumber(challenge5.trackedAcceptedTarget)} accepted
                transactions across its visible lanes.
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
            <div className="font-mono text-[11px] uppercase tracking-[0.24em] text-white/42">
              Registry health
            </div>
            <div className="mt-4 space-y-4">
              <MetricCard
                label="Live adapters"
                value={liveAdapterCount}
                hint="Every current challenge page is reading local proof artifacts."
                accent="#23f0c7"
              />
              <MetricCard
                label="Latest evidence"
                value={formatIso(overallLatest)}
                hint="Freshness across setup, ops, node runtime, stress windows, and sprint files."
                accent="#ffd166"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Setup Proofs"
          value={`${challenge1.setupSteps.filter((step) => step.present).length}/${challenge1.setupSteps.length}`}
          hint="Challenge 1 setup checklist visibility."
          accent="#23f0c7"
        />
        <MetricCard
          label="Ops Tasks"
          value={`${challenge2.tasks.filter((task) => task.status === "captured").length}/${challenge2.tasks.length}`}
          hint="Challenge 2 task lanes currently captured."
          accent="#00b4d8"
        />
        <MetricCard
          label="Stress Windows"
          value={challenge4.windows.length}
          hint={`${formatNumber(challenge4.totalWorkloadTarget)} total workload ops tracked.`}
          accent="#e8601c"
        />
        <MetricCard
          label="Sprint Lanes"
          value={challenge5.liveLaneCount}
          hint="Challenge 5 tranche status files currently visible."
          accent="#ffd166"
        />
      </div>

      <SectionPanel
        title="Challenge Registry"
        description="Each card is now backed by live challenge-specific data, so the registry doubles as a real ops index and not just a design blueprint."
        accent="#23f0c7"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {challengeSpecs.map((challenge) => {
            const detail = challengeDetails[challenge.id];

            return (
              <article
                key={challenge.id}
                className="rounded-[26px] border border-white/10 bg-black/20 p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <StatusChip label={challenge.phase} tone="muted" />
                  <StatusChip
                    label={formatMode(challenge.liveMode)}
                    tone={modeTone(challenge.liveMode)}
                  />
                </div>

                <div className="mt-4">
                  <div
                    className="font-mono text-[11px] uppercase tracking-[0.24em]"
                    style={{ color: challenge.accent }}
                  >
                    {challenge.shortTitle}
                  </div>
                  <h3 className="mt-2 text-2xl font-semibold text-white">
                    {challenge.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-white/62">
                    {challenge.summary}
                  </p>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/42">
                      Live state
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/68">
                      {detail.primary}
                    </div>
                  </div>
                  <div className="rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                    <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/42">
                      Focus
                    </div>
                    <div className="mt-2 text-sm leading-6 text-white/68">
                      {detail.secondary}
                    </div>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/control-room/challenges/${challenge.id}`}
                    className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/72 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    Open page
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </SectionPanel>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <SectionPanel
          title="Review Ready"
          description="The control room is set up so you can hand it to a review/publish workflow without bundling your live workspace into the repo."
          accent="#00b4d8"
        >
          <div className="space-y-3">
            {[
              "Paths shown in the UI are workspace-relative, not personal absolute filesystem paths.",
              "Adapters only read explicit proof files, logs, manifests, and run artifacts; wallet secrets are not scanned or copied into the app.",
              "If the local workspace is missing on Vercel, the pages degrade gracefully into missing-artifact states instead of crashing the build.",
              "The same typed ChallengeSpec registry still drives the page architecture, so prompt-to-spec generation can plug in later without rewiring the UI.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/68"
              >
                {item}
              </div>
            ))}
          </div>
        </SectionPanel>

        <SectionPanel
          title="Live Inputs"
          description="This is the current local data footprint the control room is already using."
          accent="#ffd166"
        >
          <div className="space-y-3">
            {[
              `Challenge 1: ${challenge1.setupSteps.length} setup tx artifacts + node runtime evidence`,
              `Challenge 2: ${challenge2.callMatrix.length} operation artifacts across five task lanes`,
              `Challenge 3: ${challenge3.archiveArtifacts.length} archive proofs + main/backup runtime state`,
              `Challenge 4: ${challenge4.windows.length} official windows + ${challenge4.recoveryArtifacts.length} recovery artifacts`,
              `Challenge 5: ${challenge5.statuses.length} status files + ${challenge5.latestRuns.length} run summaries + ${challenge5.latestFundingRuns.length} funding summaries`,
            ].map((item) => (
              <div
                key={item}
                className="rounded-[20px] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm leading-6 text-white/68"
              >
                {item}
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>
    </div>
  );
}
