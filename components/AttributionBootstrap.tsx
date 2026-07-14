"use client";

import { useEffect } from "react";
import { persistAttributionFromLocation } from "@/lib/site-leads";

/** Captures partner/referral codes from the URL on every page load and hash change. */
export function AttributionBootstrap() {
  useEffect(() => {
    const syncAttribution = () => {
      persistAttributionFromLocation();
    };

    syncAttribution();
    window.addEventListener("hashchange", syncAttribution);
    window.addEventListener("popstate", syncAttribution);

    return () => {
      window.removeEventListener("hashchange", syncAttribution);
      window.removeEventListener("popstate", syncAttribution);
    };
  }, []);

  return null;
}
