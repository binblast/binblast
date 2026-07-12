"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LeadCaptureModal } from "@/components/LeadCaptureModal";
import {
  hasDismissedSiteLeadCapture,
  hasSubmittedSiteLeadCapture,
  shouldShowSiteLeadCapture,
} from "@/lib/site-leads";

export function SiteLeadCaptureGate() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !pathname) return;

    const allowedRoute = shouldShowSiteLeadCapture(pathname);
    const dismissed = hasDismissedSiteLeadCapture();
    const submitted = hasSubmittedSiteLeadCapture();

    setIsOpen(allowedRoute && !dismissed && !submitted);
  }, [pathname, ready]);

  if (!ready) return null;

  return <LeadCaptureModal isOpen={isOpen} onClose={() => setIsOpen(false)} />;
}
