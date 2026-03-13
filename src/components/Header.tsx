"use client";

import { LiveIndicator } from "./LiveIndicator";

type Props = {
  stale: boolean;
};

export function Header({ stale }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-white/[0.08] pb-4">
      <div className="flex items-center gap-2">
        <LiveIndicator stale={stale} />
        <div className="hidden font-mono text-[11px] tracking-[2px] text-white/40 sm:block">
          LIVE TELEMETRY
        </div>
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
    </header>
  );
}
