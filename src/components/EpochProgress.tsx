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
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
        <div className="h-24 animate-pulse rounded bg-white/5" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] font-medium uppercase tracking-[2px] text-white/50">
          Epoch {epoch.number.toLocaleString()}
        </div>
        <div className="text-xs text-white/40">
          {formatRemaining(epoch.remainingMs)}
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${Math.min(epoch.progressPct, 100)}%`,
            background: "linear-gradient(90deg, #e8601c, #ff8c42, #ffffff)",
          }}
        >
          {/* Leading edge dot */}
          <div
            className="absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white"
            style={{
              boxShadow:
                "0 0 12px #fff, 0 0 24px rgba(232,96,28,0.6)",
            }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-xl font-bold text-white">
          <AnimatedNumber value={epoch.progressPct} percentage />
        </div>
        <div className="text-[11px] text-white/30">
          {epoch.roundsPassed.toLocaleString()} /{" "}
          {epoch.roundsPerEpoch.toLocaleString()} rounds
        </div>
      </div>
    </div>
  );
}
