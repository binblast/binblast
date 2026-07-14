"use client";

import { useCallback, useState } from "react";
import type { Toast } from "@/components/EmployeeDashboard/Toast";

export function useAdminToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (message: string, type: Toast["type"] = "success", duration = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    },
    []
  );

  return { toasts, notify, removeToast };
}
