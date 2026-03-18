import type { ControlRoomArtifact } from "@/lib/control-room/types";
import { formatIso } from "@/lib/control-room/format";
import { StatusChip } from "./StatusChip";

type ArtifactListProps = {
  artifacts: ControlRoomArtifact[];
};

export function ArtifactList({
  artifacts,
}: ArtifactListProps) {
  return (
    <div className="space-y-3">
      {artifacts.map((artifact) => (
        <div
          key={`${artifact.label}-${artifact.path}`}
          className="rounded-[20px] border border-white/8 bg-black/20 p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-white">
              {artifact.label}
            </div>
            <StatusChip
              label={artifact.present ? "present" : "missing"}
              tone={artifact.present ? "live" : "warning"}
            />
          </div>
          <div className="mt-2 font-mono text-xs leading-6 text-white/45">
            {artifact.path}
          </div>
          {artifact.note ? (
            <div className="mt-2 text-sm leading-6 text-white/56">
              {artifact.note}
            </div>
          ) : null}
          {artifact.updatedAt ? (
            <div className="mt-2 text-xs text-white/42">
              Updated {formatIso(artifact.updatedAt)}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
