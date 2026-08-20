"use client";

// P4.AI — useBadges hook (P6-FE-1).
//
// Client fetcher for the badge endpoints. Lightweight (no SWR/TanStack dep —
// the project has none yet; P6-FE-2 may introduce a revalidation layer).
// Exposes data + loading + error + retry for every data view.

import { useCallback, useEffect, useState } from "react";
import {
  fetchBadges,
  fetchStudentBadges,
  type Badge,
  type StudentBadge,
} from "@/types/badges";

type Status = "idle" | "loading" | "ready" | "error";

/** Fetch the badge catalog (GET /api/badges). */
export function useBadges() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      setBadges(await fetchBadges());
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat badge");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { badges, status, error, retry: load };
}

/** Fetch a student's earned badges (GET /api/students/[id]/badges). */
export function useStudentBadges(studentId: string | null | undefined) {
  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    setStatus("loading");
    setError(null);
    try {
      setBadges(await fetchStudentBadges(studentId));
      setStatus("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat badge");
      setStatus("error");
    }
  }, [studentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { badges, status, error, retry: load };
}
