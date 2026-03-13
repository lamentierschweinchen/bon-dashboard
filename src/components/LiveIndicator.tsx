"use client";

type Props = {
  stale?: boolean;
};

export function LiveIndicator({ stale }: Props) {
  const color = stale ? "#f59e0b" : "#23f0c7";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="relative flex h-2 w-2"
        aria-label={stale ? "Data may be stale" : "Live"}
      >
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
          style={{ backgroundColor: color }}
        />
        <span
          className="relative inline-flex h-2 w-2 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}
        />
      </span>
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
        {stale ? "STALE" : "LIVE"}
      </span>
    </span>
  );
}
