"use client";

// P4.AI — useAutoRefresh hook (DASH-12, NFR-01).
// Lightweight revalidation: calls router.refresh() on a fixed interval so
// server components re-fetch from the DB without adding SWR/TanStack.
// ponytail: replace with SWR's revalidateOnFocus + dedupingInterval when
// the project adopts a data-fetching library. Until then this is the
// smallest correct implementation for RSC auto-refresh.

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Options = {
  /** Interval in milliseconds. Default 30s. */
  intervalMs?: number;
  /** Pause when the tab is hidden (saves battery + DB load). Default true. */
  pauseOnHidden?: boolean;
};

export function useAutoRefresh({
  intervalMs = 30_000,
  pauseOnHidden = true,
}: Options = {}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function tick() {
      if (pauseOnHidden && document.hidden) return;
      router.refresh();
    }

    timer.current = setInterval(tick, intervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [router, intervalMs, pauseOnHidden]);
}
