"use client";

import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  epoch: {
    number: number;
    roundsPassed: number;
    roundsPerEpoch: number;
    progressPct: number;
    remainingMs: number | null;
  } | null;
};

function formatRemaining(ms: number | null): string {
  if (ms === null || ms <= 0) return "";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `~${hours}h ${minutes}m remaining`;
  return `~${minutes}m remaining`;
}

export function EpochProgress({ epoch }: Props) {
  if (!epoch) {
    return (
      <div
        className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
        style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.03)" }}
      >
        <div className="h-24 animate-pulse rounded bg-white/5" />
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
      style={{ boxShadow: "inset 0 1px 1px rgba(255,255,255,0.03)" }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="font-mono text-[10px] font-medium uppercase tracking-[2px] text-white/50">
          Epoch {epoch.number.toLocaleString()}
        </div>
        <div className="font-mono text-xs text-white/40">
          {formatRemaining(epoch.remainingMs)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.min(epoch.progressPct, 100)}%`,
            background: "linear-gradient(90deg, #c44a10, #e8601c, #ff8c42, #ffd4a8)",
            animation: "bar-glow 3s ease-in-out infinite",
          }}
        >
          {/* Leading edge dot */}
          <div
            className="absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white"
            style={{
              boxShadow:
                "0 0 8px #fff, 0 0 16px #fff, 0 0 30px rgba(232,96,28,0.7)",
            }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="font-mono text-2xl font-bold text-white">
          <AnimatedNumber value={epoch.progressPct} percentage />
        </div>
        <div className="font-mono text-[11px] text-white/35">
          {epoch.roundsPassed.toLocaleString()} /{" "}
          {epoch.roundsPerEpoch.toLocaleString()} rounds
        </div>
      </div>
    </div>
  );
}
