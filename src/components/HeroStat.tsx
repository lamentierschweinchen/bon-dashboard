"use client";

import Image from "next/image";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  value: number | null;
};

export function HeroStat({ value }: Props) {
  return (
    <div className="relative py-8 text-center sm:py-12">
      {/* Radial burst behind the logo + number */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden="true"
      >
        <div
          className="h-[400px] w-[500px] rounded-full opacity-60"
          style={{
            background:
              "radial-gradient(ellipse, rgba(232,96,28,0.18) 0%, rgba(255,140,66,0.1) 25%, rgba(255,140,66,0.04) 45%, transparent 65%)",
          }}
        />
      </div>

      {/* BoN Logotype — the hero visual */}
      <div className="relative mb-6 flex justify-center sm:mb-8">
        <Image
          src="/bon-logotype.png"
          alt="Battle of Nodes"
          width={192}
          height={82}
          className="h-20 w-auto sm:h-28 md:h-32"
          priority
          unoptimized
        />
      </div>

      {/* Node count */}
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
