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
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-center"
        >
          <div className="text-[9px] font-medium uppercase tracking-[2px] text-white/45">
            {stat.label}
          </div>
          <div className="mt-1.5 text-[22px] font-extrabold text-white">
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
