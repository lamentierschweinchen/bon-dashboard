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
      className="rounded-2xl border p-5 backdrop-blur-lg hover:-translate-y-0.5"
      style={{
        background: `${accentColor}12`,
        borderColor: `${accentColor}40`,
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.04), 0 0 20px ${accentColor}0d`,
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = `${accentColor}6a`;
        el.style.boxShadow = `inset 0 1px 2px rgba(255,255,255,0.06), 0 0 30px ${accentColor}1a, 0 4px 20px rgba(0,0,0,0.3)`;
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget;
        el.style.borderColor = `${accentColor}40`;
        el.style.boxShadow = `inset 0 1px 1px rgba(255,255,255,0.04), 0 0 20px ${accentColor}0d`;
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
      <div className="mt-1.5 font-mono text-3xl font-extrabold text-white">
        {value !== null ? (
          <AnimatedNumber value={value} percentage={percentage} />
        ) : (
          <span className="inline-block h-8 w-20 animate-pulse rounded bg-white/10" />
        )}
      </div>
      {subtitle && (
        <div className="mt-1 text-[11px] text-white/40">{subtitle}</div>
      )}
    </div>
  );
}
