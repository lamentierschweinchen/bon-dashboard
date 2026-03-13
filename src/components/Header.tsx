"use client";

import { LiveIndicator } from "./LiveIndicator";

type Props = {
  stale: boolean;
};

export function Header({ stale }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-white/[0.08] pb-4">
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Supernova logo mark */}
        <div
          className="h-7 w-7 shrink-0 rounded-full sm:h-8 sm:w-8"
          style={{
            background:
              "radial-gradient(circle, #ffffff 10%, #ffe0b0 25%, #ff8c42 45%, #e8601c 70%, transparent 100%)",
            boxShadow:
              "0 0 20px rgba(255,140,66,0.6), 0 0 40px rgba(232,96,28,0.3), 0 0 60px rgba(232,96,28,0.15)",
          }}
        />
        <span className="text-sm font-extrabold tracking-wide text-gradient-supernova sm:text-lg">
          Battle of Nodes
        </span>
        <span className="hidden sm:inline-flex">
          <LiveIndicator stale={stale} />
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="hidden font-mono text-[11px] tracking-[2px] text-white/40 sm:block">
          LIVE TELEMETRY
        </div>
        <a
          href="https://bon.multiversx.com"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-[#e8601c]/40 bg-[#e8601c]/10 px-2 py-1 sm:px-3 sm:py-1.5
                     font-mono text-[10px] sm:text-[11px] font-medium tracking-wide text-[#ff8c42]
                     transition-all duration-300 whitespace-nowrap
                     hover:border-[#e8601c]/60 hover:bg-[#e8601c]/20 hover:text-white"
        >
          Join the Battle →
        </a>
      </div>
    </header>
  );
}
