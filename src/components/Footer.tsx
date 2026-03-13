"use client";

import { useState, useEffect, useRef } from "react";
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
    <footer className="mt-8 border-t border-white/[0.06] pt-4 text-center text-[11px] text-white/30">
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <span>
          Powered by{" "}
          <span className="text-white/50">MultiversX</span>
        </span>
        <a
          href="https://api.battleofnodes.com/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-white/20 hover:text-white/50"
        >
          BoN API Docs
        </a>
        <span className={isStale ? "text-amber-400/70" : ""}>
          {freshnessText}
          {isStale && " · Data may be stale"}
        </span>
      </div>
    </footer>
  );
}
