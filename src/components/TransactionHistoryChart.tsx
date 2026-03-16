"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";

const WIDTH = 960;
const HEIGHT = 280;
const PAD_X = 18;
const PAD_TOP = 24;
const PAD_BOTTOM = 34;
const PAD_Y = 18;

type ChartPoint = {
  x: number;
  y: number;
  value: number;
  timestamp: string;
};

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

function formatFull(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMoment(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TransactionHistoryChart() {
  const { history } = useTransactionHistory();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [chartWidth, setChartWidth] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      setChartWidth(entry.contentRect.width);
    });

    observer.observe(containerRef.current);
    setChartWidth(containerRef.current.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  const chart = useMemo(() => {
    if (!history || history.points.length === 0) return null;

    const values = history.points.map((point) => point.cumulativeTransactions);
    const maxValue = Math.max(...values, 1);
    const plotWidth = WIDTH - PAD_X * 2;
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM - PAD_Y;

    const points: ChartPoint[] = history.points.map((point, index) => {
      const x = PAD_X + (index / Math.max(history.points.length - 1, 1)) * plotWidth;
      const y =
        PAD_TOP + PAD_Y + (1 - point.cumulativeTransactions / maxValue) * plotHeight;

      return {
        x,
        y,
        value: point.cumulativeTransactions,
        timestamp: point.timestamp,
      };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const areaPath = `${linePath} L ${PAD_X + plotWidth} ${HEIGHT - PAD_BOTTOM} L ${PAD_X} ${HEIGHT - PAD_BOTTOM} Z`;

    return {
      maxValue,
      points,
      linePath,
      areaPath,
    };
  }, [history]);

  const activeIndex =
    hoveredIndex ?? (chart ? Math.max(chart.points.length - 1, 0) : null);
  const activePoint =
    activeIndex !== null && chart ? chart.points[activeIndex] : null;

  function updateHoveredIndex(clientX: number) {
    if (!chart || !containerRef.current || chartWidth <= 0) return;

    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const svgX = (relativeX / rect.width) * WIDTH;

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    chart.points.forEach((point, index) => {
      const distance = Math.abs(point.x - svgX);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setHoveredIndex(nearestIndex);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    updateHoveredIndex(event.clientX);
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-4 backdrop-blur-lg sm:p-5"
      style={{
        background: "#23f0c712",
        borderColor: "#23f0c740",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.04), 0 0 20px #23f0c70d",
      }}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[10px] font-medium uppercase tracking-[2px] text-[#23f0c7]">
            Network Wake
          </div>
          <div className="mt-1 text-lg font-semibold text-white">
            Transactions from ignition to now
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] text-white/50">
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
            Resolution {history ? history.bucketLabel : "1h"}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">
            Refresh ~10m
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative mt-5"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredIndex(null)}
      >
        {!chart || !history ? (
          <div className="h-[280px] animate-pulse rounded-2xl bg-white/5" />
        ) : (
          <>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full overflow-visible">
              <defs>
                <linearGradient id="tx-area" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(35,240,199,0.34)" />
                  <stop offset="100%" stopColor="rgba(35,240,199,0)" />
                </linearGradient>
                <linearGradient id="tx-line" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#23f0c7" />
                  <stop offset="100%" stopColor="#8ffff0" />
                </linearGradient>
                <filter id="tx-glow" x="-20%" y="-80%" width="140%" height="260%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <line
                x1={PAD_X}
                y1={HEIGHT - PAD_BOTTOM}
                x2={WIDTH - PAD_X}
                y2={HEIGHT - PAD_BOTTOM}
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="1"
              />
              <line
                x1={PAD_X}
                y1={PAD_TOP + PAD_Y}
                x2={PAD_X}
                y2={HEIGHT - PAD_BOTTOM}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />

              {[0.25, 0.5, 0.75].map((ratio) => {
                const y = PAD_TOP + PAD_Y + ratio * (HEIGHT - PAD_TOP - PAD_BOTTOM - PAD_Y);
                return (
                  <line
                    key={ratio}
                    x1={PAD_X}
                    y1={y}
                    x2={WIDTH - PAD_X}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 10"
                    strokeWidth="1"
                  />
                );
              })}

              <path d={chart.areaPath} fill="url(#tx-area)" />
              <path
                d={chart.linePath}
                fill="none"
                stroke="url(#tx-line)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#tx-glow)"
              />

              {activePoint && (
                <>
                  <line
                    x1={activePoint.x}
                    y1={PAD_TOP}
                    x2={activePoint.x}
                    y2={HEIGHT - PAD_BOTTOM}
                    stroke="rgba(143,255,240,0.35)"
                    strokeDasharray="5 7"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="6"
                    fill="#8ffff0"
                    opacity="0.22"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="3.5"
                    fill="#dffffa"
                    stroke="#23f0c7"
                    strokeWidth="1.5"
                  />
                </>
              )}

              <text
                x={PAD_X}
                y={HEIGHT - 8}
                fill="rgba(255,255,255,0.45)"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                Inception
              </text>
              <text
                x={WIDTH - PAD_X}
                y={HEIGHT - 8}
                textAnchor="end"
                fill="rgba(255,255,255,0.45)"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                Now
              </text>
              <text
                x={PAD_X}
                y={16}
                fill="rgba(255,255,255,0.45)"
                fontSize="11"
                fontFamily="var(--font-mono)"
              >
                {formatCompact(chart.maxValue)} tx
              </text>
            </svg>

            {activePoint && (
              <div
                className="pointer-events-none absolute top-3 rounded-xl border border-[#23f0c740] bg-[#0a1628ee] px-3 py-2 text-left backdrop-blur-md"
                style={{
                  left: `${Math.min(
                    Math.max((activePoint.x / WIDTH) * 100, 14),
                    84,
                  )}%`,
                  transform: "translateX(-50%)",
                  boxShadow: "0 0 20px rgba(35,240,199,0.10)",
                }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[2px] text-[#8ffff0]">
                  {formatMoment(activePoint.timestamp)}
                </div>
                <div className="mt-1 font-mono text-lg font-bold text-white">
                  {formatFull(activePoint.value)}
                </div>
                <div className="text-[11px] text-white/45">cumulative transactions</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
