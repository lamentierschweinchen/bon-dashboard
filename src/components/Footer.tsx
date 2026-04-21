"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { STALE_THRESHOLD_MS } from "@/lib/constants";

type Props = {
  generatedAt: string | null;
};

export function Footer({ generatedAt }: Props) {
  const [secondsAgo, setSecondsAgo] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!generatedAt) return;

    const updateAge = () => {
      const age = Date.now() - new Date(generatedAt).getTime();
      setSecondsAgo(Math.floor(age / 1000));
    };

    updateAge();
    timerRef.current = setInterval(updateAge, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [generatedAt]);

  const isStale =
    secondsAgo !== null && secondsAgo * 1000 > STALE_THRESHOLD_MS;

  const freshnessText =
    secondsAgo === null
      ? ""
      : secondsAgo <= 1
        ? "Updated just now"
        : `Updated ${secondsAgo}s ago`;

  return (
    <footer className="mt-8 border-t border-white/[0.08] pt-6 pb-4">
      {/* MultiversX logo + Built with love */}
      <div className="mb-4 flex flex-col items-center gap-3">
        <a
          href="https://multiversx.com"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-40 transition-opacity hover:opacity-60"
        >
          <Image
            src="/multiversx-logo.svg"
            alt="MultiversX"
            width={140}
            height={23}
            className="h-5 w-auto"
          />
        </a>
        <span className="text-[11px] text-white/35">
          Built with ❤️ on{" "}
          <span className="text-white/60">MultiversX</span>
        </span>
      </div>

      {/* Links and freshness */}
      <div className="flex flex-col items-center gap-2 text-[11px] text-white/35 sm:flex-row sm:justify-between">
        <a
          href="https://bon.multiversx.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono underline decoration-white/20 hover:text-white/50"
        >
          bon.multiversx.com
        </a>
        <a
          href="/perf-stats"
          className="font-mono underline decoration-white/20 hover:text-white/50"
        >
          Performance Stats
        </a>
        <a
          href="https://api.battleofnodes.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono underline decoration-white/20 hover:text-white/50"
        >
          BoN API Docs
        </a>
        <span className={`font-mono ${isStale ? "text-amber-400/70" : ""}`}>
          {freshnessText}
          {isStale && " · Data may be stale"}
        </span>
      </div>
    </footer>
  );
}
