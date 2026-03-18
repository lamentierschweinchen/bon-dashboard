import Link from "next/link";
import type { ReactNode } from "react";
import { AutoRefresh } from "@/components/control-room/AutoRefresh";
import { StatusChip } from "@/components/control-room/StatusChip";
import { challengeSpecs } from "@/lib/control-room/specs";

export default function ControlRoomLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen tech-grid">
      <AutoRefresh intervalMs={15_000} />
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-[32px] border border-white/10 bg-black/20 px-5 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <StatusChip label="local workspace" tone="live" />
                <StatusChip label="artifact adapters" tone="live" />
                <StatusChip label="repo-safe paths" tone="live" />
                <StatusChip label="15s refresh" tone="muted" />
              </div>
              <div className="mt-4">
                <div className="font-mono text-[11px] uppercase tracking-[0.35em] text-[#23f0c7]">
                  Control Room
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  Battle Of Nodes Competition Dashboard
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
                  Separate from the public chain monitor, this route tree is the
                  modular competition workspace: challenge registry, widget
                  registry, and local artifact adapters for verifier-first load
                  ops.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Chain Monitor
              </Link>
              <Link
                href="/control-room"
                className="rounded-full border border-[#e8601c]/35 bg-[#e8601c]/10 px-4 py-2 text-sm text-[#ffb07a] transition hover:border-[#e8601c]/55 hover:bg-[#e8601c]/20 hover:text-white"
              >
                Control Room Home
              </Link>
            </div>
          </div>

          <nav className="mt-5 flex flex-wrap gap-2">
            {challengeSpecs.map((challenge) => (
              <Link
                key={challenge.id}
                href={`/control-room/challenges/${challenge.id}`}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-white/58 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                {challenge.shortTitle}
              </Link>
            ))}
          </nav>
        </header>

        <div className="mt-6">{children}</div>
      </div>
    </main>
  );
}
