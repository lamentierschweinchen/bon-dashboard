import type { Challenge3DashboardData, ChallengeSpec } from "@/lib/control-room/types";
import { formatIso, shortAddress } from "@/lib/control-room/format";
import { ArtifactList } from "./ArtifactList";
import { MetricCard } from "./MetricCard";
import { NodeRuntimeCard } from "./NodeRuntimeCard";
import { SectionPanel } from "./SectionPanel";
import { StatusChip } from "./StatusChip";
import { TxArtifactTable } from "./TxArtifactTable";

type ChallengeThreeViewProps = {
  challenge: ChallengeSpec;
  data: Challenge3DashboardData;
};

export function ChallengeThreeView({
  challenge,
  data,
}: ChallengeThreeViewProps) {
  const namingPass = Boolean(data.mainNode?.namingPass && data.backupNode?.namingPass);
  const archiveReadyCount = data.archiveArtifacts.filter((artifact) => artifact.present).length;
  const backupRegistrationRows = data.backupRegistration
    ? [data.backupRegistration]
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-black/20 p-6 shadow-[0_32px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-3">
          <StatusChip label={challenge.phase} tone="muted" />
          <StatusChip label="live adapter" tone="live" />
          <StatusChip
            label={namingPass ? "pair naming ok" : "naming check"}
            tone={namingPass ? "live" : "warning"}
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
              Backup And Log Proof Room
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
              Backup registration
            </div>
            <div className="mt-3 font-mono text-xl font-black text-white">
              {shortAddress(data.backupRegistration?.txHash ?? null, 12, 8)}
            </div>
            <div className="mt-3 text-sm leading-6 text-white/56">
              Provider {shortAddress(data.providerAddress, 14, 8)}
            </div>
            <div className="mt-4 text-xs text-white/42">
              latest proof {formatIso(data.lastUpdatedAt)}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Archive Pack"
          value={`${archiveReadyCount}/${data.archiveArtifacts.length}`}
          hint="Primary archive plus the two submission zips."
          accent={challenge.accent}
        />
        <MetricCard
          label="Main Node"
          value={data.mainNode?.displayName ?? "—"}
          hint={data.mainNode?.latestLogPath ?? "No main-node runtime found."}
          accent={challenge.accent}
        />
        <MetricCard
          label="Backup Node"
          value={data.backupNode?.displayName ?? "—"}
          hint={data.backupNode?.latestLogPath ?? "No backup-node runtime found."}
          accent={challenge.accent}
        />
        <MetricCard
          label="Naming"
          value={namingPass ? "Pass" : "Check"}
          hint="Main expects `<name>-BoN-n`; backup expects `<name>-backup-BoN-n`."
          accent={challenge.accent}
        />
      </div>

      <SectionPanel
        title="Provider Topology"
        description="Main and backup runtimes are surfaced separately so naming, redundancy, and local heartbeat evidence stay easy to audit."
        accent={challenge.accent}
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <NodeRuntimeCard label="Primary validator" node={data.mainNode} />
          <NodeRuntimeCard label="Backup validator" node={data.backupNode} />
        </div>
      </SectionPanel>

      <SectionPanel
        title="Backup Registration"
        description="The add-node transaction is kept visible alongside the runtime pair so the topology proof never loses its on-chain anchor."
        accent={challenge.accent}
      >
        <TxArtifactTable rows={backupRegistrationRows} />
      </SectionPanel>

      <SectionPanel
        title="Submission Archives"
        description="These are the packaged artifacts you can hand to a reviewer without dragging local runtime state or private material into the repo."
        accent={challenge.accent}
      >
        <ArtifactList artifacts={data.archiveArtifacts} />
      </SectionPanel>
    </div>
  );
}
