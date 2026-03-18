import type { ReactNode } from "react";

type SectionPanelProps = {
  title: string;
  description?: string;
  accent?: string;
  children: ReactNode;
  className?: string;
};

export function SectionPanel({
  title,
  description,
  accent = "#23f0c7",
  children,
  className = "",
}: SectionPanelProps) {
  return (
    <section
      className={`rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl ${className}`}
      style={{
        boxShadow: `inset 0 1px 1px rgba(255,255,255,0.06), 0 0 40px ${accent}12, 0 24px 80px rgba(0,0,0,0.28)`,
      }}
    >
      <div className="mb-4">
        <div
          className="font-mono text-[11px] uppercase tracking-[0.28em]"
          style={{ color: accent }}
        >
          Module
        </div>
        <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
        {description ? (
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
