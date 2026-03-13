"use client";

import { LiveIndicator } from "./LiveIndicator";

type Props = {
  stale: boolean;
};

export function Header({ stale }: Props) {
  return (
    <header className="flex items-center justify-between border-b border-white/[0.06] pb-4">
      <div className="flex items-center gap-3">
        {/* Supernova logo mark */}
        <div
          className="h-7 w-7 rounded-full"
          style={{
            background:
              "radial-gradient(circle, #ffffff 15%, #ff8c42 40%, #e8601c 65%, transparent 100%)",
            boxShadow: "0 0 20px rgba(232,96,28,0.5)",
          }}
        />
        <span className="text-base font-bold tracking-wide text-white">
          Battle of Nodes
        </span>
        <LiveIndicator stale={stale} />
      </div>
      <div className="hidden text-[11px] tracking-[1px] text-white/30 sm:block">
        SHADOW FORK ANALYTICS
      </div>
    </header>
  );
}
