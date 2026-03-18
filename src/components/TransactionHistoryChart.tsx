"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useTransactionHistory } from "@/hooks/useTransactionHistory";
import { SUPERNOVA_ACTIVATION_TS } from "@/lib/constants";

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
    const baseline = HEIGHT - PAD_BOTTOM;

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

    // Find supernova split — index of the first point at or after activation
    const supernovaMs = SUPERNOVA_ACTIVATION_TS * 1000;
    let splitIndex = points.findIndex(
      (p) => new Date(p.timestamp).getTime() >= supernovaMs,
    );

    // Interpolate an exact split point on the line
    let splitPoint: { x: number; y: number } | null = null;
    if (splitIndex > 0) {
      const prev = points[splitIndex - 1];
      const curr = points[splitIndex];
      const prevMs = new Date(prev.timestamp).getTime();
      const currMs = new Date(curr.timestamp).getTime();
      const t = (supernovaMs - prevMs) / (currMs - prevMs);
      splitPoint = {
        x: prev.x + t * (curr.x - prev.x),
        y: prev.y + t * (curr.y - prev.y),
      };
    } else if (splitIndex === 0) {
      splitPoint = { x: points[0].x, y: points[0].y };
    }
    // If splitIndex is -1, supernova hasn't happened in the data yet

    // Build before/after paths
    let beforeLinePath = "";
    let beforeAreaPath = "";
    let afterLinePath = "";
    let afterAreaPath = "";

    if (splitIndex === -1 || !splitPoint) {
      // All points are before supernova
      beforeLinePath = points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");
      const last = points[points.length - 1];
      beforeAreaPath = `${beforeLinePath} L ${last.x} ${baseline} L ${points[0].x} ${baseline} Z`;
    } else {
      // Before segment: up to and including the interpolated split point
      const beforePoints = points.slice(0, splitIndex);
      if (beforePoints.length > 0) {
        beforeLinePath = beforePoints
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ");
        beforeLinePath += ` L ${splitPoint.x} ${splitPoint.y}`;
        beforeAreaPath = `${beforeLinePath} L ${splitPoint.x} ${baseline} L ${beforePoints[0].x} ${baseline} Z`;
      }

      // After segment: from split point through remaining points
      const afterPoints = points.slice(splitIndex);
      afterLinePath = `M ${splitPoint.x} ${splitPoint.y}`;
      afterLinePath += afterPoints
        .map((p) => ` L ${p.x} ${p.y}`)
        .join("");
      const last = afterPoints[afterPoints.length - 1];
      afterAreaPath = `${afterLinePath} L ${last.x} ${baseline} L ${splitPoint.x} ${baseline} Z`;
    }

    return {
      maxValue,
      points,
      splitPoint,
      splitIndex,
      beforeLinePath,
      beforeAreaPath,
      afterLinePath,
      afterAreaPath,
    };
  }, [history]);

  const activeIndex =
    hoveredIndex ?? (chart ? Math.max(chart.points.length - 1, 0) : null);
  const activePoint =
    activeIndex !== null && chart ? chart.points[activeIndex] : null;
  const isAfterSupernova =
    activeIndex !== null && chart && chart.splitIndex !== -1
      ? activeIndex >= chart.splitIndex
      : false;

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
                {/* Before supernova — cool cyan */}
                <linearGradient id="tx-area-before" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(35,240,199,0.24)" />
                  <stop offset="100%" stopColor="rgba(35,240,199,0)" />
                </linearGradient>
                <linearGradient id="tx-line-before" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#23f0c7" />
                  <stop offset="100%" stopColor="#8ffff0" />
                </linearGradient>
                {/* After supernova — warm orange */}
                <linearGradient id="tx-area-after" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgba(232,96,28,0.30)" />
                  <stop offset="100%" stopColor="rgba(232,96,28,0)" />
                </linearGradient>
                <linearGradient id="tx-line-after" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#e8601c" />
                  <stop offset="100%" stopColor="#ff8c42" />
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

              {/* Before supernova */}
              {chart.beforeAreaPath && (
                <>
                  <path d={chart.beforeAreaPath} fill="url(#tx-area-before)" />
                  <path
                    d={chart.beforeLinePath}
                    fill="none"
                    stroke="url(#tx-line-before)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#tx-glow)"
                  />
                </>
              )}

              {/* After supernova */}
              {chart.afterAreaPath && (
                <>
                  <path d={chart.afterAreaPath} fill="url(#tx-area-after)" />
                  <path
                    d={chart.afterLinePath}
                    fill="none"
                    stroke="url(#tx-line-after)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#tx-glow)"
                  />
                </>
              )}

              {/* Supernova activation marker */}
              {chart.splitPoint && (
                <>
                  <line
                    x1={chart.splitPoint.x}
                    y1={PAD_TOP}
                    x2={chart.splitPoint.x}
                    y2={HEIGHT - PAD_BOTTOM}
                    stroke="rgba(232,96,28,0.5)"
                    strokeDasharray="4 6"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={chart.splitPoint.x}
                    cy={chart.splitPoint.y}
                    r="4"
                    fill="#e8601c"
                    opacity="0.6"
                  />
                  <text
                    x={chart.splitPoint.x}
                    y={PAD_TOP - 4}
                    textAnchor="middle"
                    fill="#ff8c42"
                    fontSize="10"
                    fontFamily="var(--font-mono)"
                    fontWeight="600"
                    letterSpacing="1.5"
                  >
                    SUPERNOVA
                  </text>
                </>
              )}

              {activePoint && (
                <>
                  <line
                    x1={activePoint.x}
                    y1={PAD_TOP}
                    x2={activePoint.x}
                    y2={HEIGHT - PAD_BOTTOM}
                    stroke={isAfterSupernova ? "rgba(255,140,66,0.35)" : "rgba(143,255,240,0.35)"}
                    strokeDasharray="5 7"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="6"
                    fill={isAfterSupernova ? "#ff8c42" : "#8ffff0"}
                    opacity="0.22"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="3.5"
                    fill={isAfterSupernova ? "#ffd4b0" : "#dffffa"}
                    stroke={isAfterSupernova ? "#e8601c" : "#23f0c7"}
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
                className="pointer-events-none absolute top-3 rounded-lg border bg-[#0a1628ee] px-2 py-1.5 text-left backdrop-blur-md sm:rounded-xl sm:px-3 sm:py-2"
                style={{
                  left: `${Math.min(
                    Math.max((activePoint.x / WIDTH) * 100, 14),
                    84,
                  )}%`,
                  transform: "translateX(-50%)",
                  borderColor: isAfterSupernova ? "rgba(232,96,28,0.25)" : "rgba(35,240,199,0.25)",
                  boxShadow: isAfterSupernova
                    ? "0 0 20px rgba(232,96,28,0.10)"
                    : "0 0 20px rgba(35,240,199,0.10)",
                }}
              >
                <div
                  className="font-mono text-[8px] uppercase tracking-[1.5px] sm:text-[10px] sm:tracking-[2px]"
                  style={{ color: isAfterSupernova ? "#ff8c42" : "#8ffff0" }}
                >
                  {formatMoment(activePoint.timestamp)}
                </div>
                <div className="font-mono text-sm font-bold text-white sm:mt-1 sm:text-base">
                  {formatFull(activePoint.value)}
                </div>
                <div className="text-[9px] text-white/45 sm:text-[11px]">cumulative tx</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
