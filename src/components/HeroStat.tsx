"use client";

import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  value: number | null;
};

export function HeroStat({ value }: Props) {
  return (
    <div className="relative py-10 text-center">
      {/* Radial burst behind the number */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="h-[280px] w-[400px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(ellipse, rgba(232,96,28,0.15) 0%, rgba(255,140,66,0.08) 30%, rgba(255,140,66,0.03) 50%, transparent 70%)",
          }}
        />
      </div>

      <div
        className="font-mono text-[10px] font-medium uppercase tracking-[3px]"
        style={{ color: "#ff8c42" }}
      >
        Nodes Online
      </div>
      <div
        className="relative mt-2 font-mono text-[48px] font-black leading-none tracking-tight text-white
                    md:text-[56px] lg:text-[64px]"
        style={{
          textShadow:
            "0 0 30px rgba(255,255,255,0.5), 0 0 60px rgba(255,255,255,0.2), 0 0 100px rgba(232,96,28,0.3), 0 0 150px rgba(232,96,28,0.15)",
        }}
      >
        {value !== null ? (
          <AnimatedNumber value={value} />
        ) : (
          <span className="inline-block h-16 w-36 animate-pulse rounded bg-white/10" />
        )}
      </div>
      <div className="mt-2 text-[13px] text-white/50">
        powering the shadow fork
      </div>
    </div>
  );
}
