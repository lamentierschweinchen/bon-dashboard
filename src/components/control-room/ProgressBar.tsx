type ProgressBarProps = {
  ratio: number | null;
  accent?: string;
};

export function ProgressBar({
  ratio,
  accent = "#23f0c7",
}: ProgressBarProps) {
  const width = ratio === null ? 0 : Math.max(0, Math.min(100, ratio * 100));

  return (
    <div className="h-2 overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-[width] duration-500"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, ${accent} 0%, rgba(255,255,255,0.95) 100%)`,
          boxShadow: `0 0 12px ${accent}`,
        }}
      />
    </div>
  );
}
