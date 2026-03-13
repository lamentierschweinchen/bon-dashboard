"use client";

import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  value: number | null;
};

export function HeroStat({ value }: Props) {
  return (
    <div className="py-8 text-center">
      <div
        className="text-[10px] font-medium uppercase tracking-[3px]"
        style={{ color: "#ff8c42" }}
      >
        Nodes Online Now
      </div>
      <div
        className="mt-2 text-[44px] font-black leading-none tracking-tight text-white
                    md:text-[48px] lg:text-[56px]"
        style={{
          textShadow:
            "0 0 40px rgba(255,255,255,0.3), 0 0 80px rgba(232,96,28,0.15)",
        }}
      >
        {value !== null ? (
          <AnimatedNumber value={value} />
        ) : (
          <span className="inline-block h-14 w-32 animate-pulse rounded bg-white/10" />
        )}
      </div>
      <div className="mt-1 text-[13px] text-white/40">across 4 shards</div>
    </div>
  );
}
