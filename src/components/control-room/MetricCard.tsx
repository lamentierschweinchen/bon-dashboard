import type { ReactNode } from "react";

type MetricCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: string;
};

export function MetricCard({
  label,
  value,
  hint,
  accent = "#23f0c7",
}: MetricCardProps) {
  return (
    <div
      className="rounded-[24px] border border-white/10 bg-black/20 p-4"
      style={{
        background: `linear-gradient(180deg, ${accent}16 0%, rgba(255,255,255,0.03) 100%)`,
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.05), 0 0 18px ${accent}14`,
      }}
    >
      <div
        className="font-mono text-[11px] uppercase tracking-[0.24em]"
        style={{ color: accent }}
      >
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-black text-white">
        {value}
      </div>
      {hint ? <div className="mt-2 text-sm text-white/55">{hint}</div> : null}
    </div>
  );
}
