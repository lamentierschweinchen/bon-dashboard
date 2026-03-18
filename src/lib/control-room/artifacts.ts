import type { ControlRoomArtifact } from "./types";
import { displayPath, statIfExists } from "./workspace";

export async function loadArtifact(
  label: string,
  filePath: string,
  note?: string | null,
): Promise<ControlRoomArtifact> {
  const stat = await statIfExists(filePath);

  return {
    label,
    path: displayPath(filePath) ?? filePath,
    present: Boolean(stat),
    note: note ?? null,
    updatedAt: stat?.mtime.toISOString() ?? null,
  };
}
