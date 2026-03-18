import type { ControlRoomNodeRuntime } from "@/lib/control-room/types";
import { formatIso, formatNumber } from "@/lib/control-room/format";
import { StatusChip } from "./StatusChip";

type NodeRuntimeCardProps = {
  label: string;
  node: ControlRoomNodeRuntime | null;
};

export function NodeRuntimeCard({
  label,
  node,
}: NodeRuntimeCardProps) {
  if (!node) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-white">{label}</div>
          <StatusChip label="missing" tone="warning" />
        </div>
        <div className="mt-3 text-sm leading-6 text-white/56">
          No runtime evidence was found for this node.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-white">{label}</div>
          <div className="mt-1 font-mono text-xs text-white/42">
            {node.displayName ?? "unknown display name"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusChip
            label={node.namingPass ? "name ok" : "name check"}
            tone={node.namingPass ? "live" : "warning"}
          />
          <StatusChip
            label={node.startEvidence ? "started" : "log missing"}
            tone={node.startEvidence ? "live" : "warning"}
          />
          <StatusChip
            label={node.trieSyncEvidence ? "trie sync" : "no trie proof"}
            tone={node.trieSyncEvidence ? "live" : "warning"}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            Runtime
          </div>
          <div className="mt-1 text-sm leading-6 text-white/68">
            shard {node.shardId ?? "—"} · redundancy{" "}
            {formatNumber(node.redundancyLevel ?? node.sessionRedundancyLevel)}
          </div>
          <div className="text-sm leading-6 text-white/56">
            API {node.restApiInterface ?? "—"}
          </div>
          <div className="text-sm leading-6 text-white/56">
            {node.appVersion ?? "No app version captured"}
          </div>
        </div>

        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
            Local API
          </div>
          <div className="mt-1 text-sm leading-6 text-white/68">
            {node.localApi
              ? `syncing ${
                  node.localApi.syncing === null
                    ? "—"
                    : node.localApi.syncing
                      ? "yes"
                      : "no"
                } · nonce ${formatNumber(node.localApi.nonce)}`
              : "Local node API not reachable"}
          </div>
          <div className="text-sm leading-6 text-white/56">
            {node.localApi
              ? `highest ${formatNumber(node.localApi.highestNonce)} · active heartbeats ${formatNumber(
                  node.localApi.heartbeatActive,
                )}`
              : "Control room falls back to file artifacts when the API is offline."}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-[18px] border border-white/8 bg-white/[0.03] px-3 py-2 text-xs leading-6 text-white/48">
        {node.namingRule ?? "No naming rule available"}
        <div className="mt-1">
          latest log {node.latestLogPath ?? "—"} · {formatIso(node.latestLogTimestamp)}
        </div>
        <div className="mt-1">
          log files {formatNumber(node.logCount)} · redundancy phrase{" "}
          {node.redundancyKeyEvidence ? "seen" : "not seen"}
        </div>
      </div>
    </div>
  );
}
