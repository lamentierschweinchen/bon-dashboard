"use client";

import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  label: string;
  value: number | null;
  subtitle?: string;
  accentColor: string;
  percentage?: boolean;
  tooltip?: string;
};

export function StatCard({
  label,
  value,
  subtitle,
  accentColor,
  percentage,
  tooltip,
}: Props) {
  return (
    <div
      className="rounded-2xl border p-5 backdrop-blur-md transition-colors hover:border-opacity-50"
      style={{
        background: `${accentColor}0a`,
        borderColor: `${accentColor}3d`,
      }}
    >
      <div className="flex items-center gap-1.5">
        <div
          className="text-[10px] font-medium uppercase tracking-[2px]"
          style={{ color: accentColor }}
        >
          {label}
        </div>
        {tooltip && (
          <span
            className="cursor-help text-[10px] opacity-40 hover:opacity-70"
            title={tooltip}
          >
            &#9432;
          </span>
        )}
      </div>
      <div className="mt-1.5 text-3xl font-extrabold text-white">
        {value !== null ? (
          <AnimatedNumber value={value} percentage={percentage} />
        ) : (
          <span className="inline-block h-8 w-20 animate-pulse rounded bg-white/10" />
        )}
      </div>
      {subtitle && (
        <div className="mt-1 text-[11px] text-white/35">{subtitle}</div>
      )}
    </div>
  );
}
