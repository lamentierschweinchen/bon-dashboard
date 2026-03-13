"use client";

import { useState, useEffect } from "react";
import { useSnapshot } from "@/hooks/useSnapshot";
import { STALE_THRESHOLD_MS } from "@/lib/constants";
import { Header } from "./Header";
import { HeroStat } from "./HeroStat";
import { StatCard } from "./StatCard";
import { TransactionRow } from "./TransactionRow";
import { EpochProgress } from "./EpochProgress";
import { AnimatedNumber } from "./AnimatedNumber";
import { Footer } from "./Footer";

export function Dashboard() {
  const { snapshot } = useSnapshot();
  const [isStale, setIsStale] = useState(false);

  useEffect(() => {
    const check = () => {
      if (!snapshot) return setIsStale(false);
      const age = Date.now() - new Date(snapshot.generatedAt).getTime();
      setIsStale(age > STALE_THRESHOLD_MS);
    };
    check();
    const timer = setInterval(check, 1000);
    return () => clearInterval(timer);
  }, [snapshot]);

  const s = snapshot;

  return (
    <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6">
      <Header stale={isStale} />

      {/* Hero: Nodes Online */}
      <HeroStat value={s?.nodesOnline ?? null} />

      {/* Primary Stat Grid 2x2 */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label="Fully Synced"
          value={s?.nodesSynced ?? null}
          subtitle={
            s ? `${((s.nodesSynced / s.nodesOnline) * 100).toFixed(0)}% of online` : undefined
          }
          accentColor="#23f0c7"
        />
        <StatCard
          label="Community Nodes"
          value={s?.communityRunNodesOnline ?? null}
          subtitle="independent operators"
          accentColor="#00b4d8"
          tooltip="Excludes known official MultiversX infrastructure nodes. Counts online nodes not matching official identity patterns."
        />
        <StatCard
          label="Backup Coverage"
          value={s?.backupCoveragePct ?? null}
          subtitle={
            s
              ? `${s.backupCoverageProviders.covered} / ${s.backupCoverageProviders.total} providers`
              : undefined
          }
          accentColor="#e8601c"
          percentage
        />
        <StatCard
          label="Active Operators"
          value={s?.distinctActiveOperators ?? null}
          subtitle="distinct owners"
          accentColor="#ff8c42"
        />
      </div>

      {/* Transaction Stats Row */}
      <div className="mt-3">
        <TransactionRow
          stats={[
            { label: "TX Since Launch", value: s?.transactionsSinceLaunch ?? null },
            { label: "Successful TX 24h", value: s?.successfulTxLast24h ?? null },
            { label: "SC Calls 24h", value: s?.scCallsLast24h ?? null },
          ]}
        />
      </div>

      {/* Epoch Progress */}
      <div className="mt-3">
        <EpochProgress epoch={s?.epoch ?? null} />
      </div>

      {/* Blocks Since Launch */}
      <div className="mt-3 text-center">
        <span className="text-[10px] font-medium uppercase tracking-[2px] text-white/30">
          Blocks Since Launch
        </span>
        <span className="ml-2 text-sm font-bold text-white/70">
          {s ? (
            <AnimatedNumber value={s.blocksSinceLaunch} />
          ) : (
            <span className="inline-block h-4 w-20 animate-pulse rounded bg-white/10" />
          )}
        </span>
      </div>

      <Footer generatedAt={s?.generatedAt ?? null} />
    </div>
  );
}
