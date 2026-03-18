import type { ControlRoomTxArtifact } from "@/lib/control-room/types";
import { shortAddress } from "@/lib/control-room/format";

type TxArtifactTableProps = {
  rows: ControlRoomTxArtifact[];
};

export function TxArtifactTable({
  rows,
}: TxArtifactTableProps) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/20">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/8">
          <thead className="bg-white/[0.03]">
            <tr className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/42">
              <th className="px-4 py-3 text-left">Step</th>
              <th className="px-4 py-3 text-left">Method</th>
              <th className="px-4 py-3 text-left">Value</th>
              <th className="px-4 py-3 text-left">Receiver</th>
              <th className="px-4 py-3 text-left">Tx</th>
              <th className="px-4 py-3 text-left">Artifact</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {rows.map((row) => (
              <tr key={row.key} className="align-top text-sm text-white/72">
                <td className="px-4 py-4">
                  <div className="font-semibold text-white">{row.label}</div>
                  <div className="mt-1 text-xs text-white/42">
                    nonce {row.nonce ?? "—"} · gas {row.gasLimit ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-mono text-white">{row.method ?? "—"}</div>
                  <div className="mt-1 text-xs leading-6 text-white/42">
                    {row.arguments.length > 0 ? row.arguments.join(" · ") : "no args"}
                  </div>
                </td>
                <td className="px-4 py-4">
                  <div className="font-mono text-white">
                    {row.valueEgld ?? "0"} EGLD
                  </div>
                </td>
                <td className="px-4 py-4 font-mono text-xs leading-6 text-white/56">
                  {shortAddress(row.receiver, 14, 8)}
                </td>
                <td className="px-4 py-4 font-mono text-xs leading-6 text-white/56">
                  {shortAddress(row.txHash, 12, 8)}
                </td>
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
