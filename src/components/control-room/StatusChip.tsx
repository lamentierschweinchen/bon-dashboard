type StatusChipProps = {
  label: string;
  tone?: "live" | "planned" | "warning" | "muted";
};

const toneStyles: Record<NonNullable<StatusChipProps["tone"]>, string> = {
  live: "border-emerald-400/35 bg-emerald-400/10 text-emerald-200",
  planned: "border-sky-400/35 bg-sky-400/10 text-sky-200",
  warning: "border-amber-400/35 bg-amber-400/10 text-amber-200",
  muted: "border-white/10 bg-white/5 text-white/55",
};

export function StatusChip({
  label,
  tone = "muted",
}: StatusChipProps) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] ${toneStyles[tone]}`}
    >
      {label}
    </span>
  );
}
