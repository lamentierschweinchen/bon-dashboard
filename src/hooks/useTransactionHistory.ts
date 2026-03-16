"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TransactionHistory } from "@/lib/types";

const HISTORY_POLL_MS = 600_000;

export function useTransactionHistory() {
  const [history, setHistory] = useState<TransactionHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/transactions-history");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TransactionHistory = await res.json();
      setHistory(data);
      setError(null);
    } catch (err) {
      console.error("[useTransactionHistory] fetch failed:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, []);

  useEffect(() => {
    fetchHistory();
    intervalRef.current = setInterval(fetchHistory, HISTORY_POLL_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchHistory]);

  return { history, error };
}
