"use client";

import { AnimatedNumber } from "./AnimatedNumber";

type TxStat = {
  label: string;
  value: number | null;
};

type Props = {
  stats: TxStat[];
};

export function TransactionRow({ stats }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center
                     backdrop-blur-sm transition-all duration-300
                     hover:-translate-y-0.5 hover:border-white/20"
          style={{
            boxShadow: "inset 0 1px 1px rgba(255,255,255,0.03)",
          }}
        >
          <div className="font-mono text-[10px] font-medium uppercase tracking-[2px] text-white/50">
            {stat.label}
          </div>
          <div className="mt-1.5 font-mono text-[22px] font-extrabold text-white">
            {stat.value !== null ? (
              <AnimatedNumber value={stat.value} />
            ) : (
              <span className="inline-block h-6 w-16 animate-pulse rounded bg-white/10" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
