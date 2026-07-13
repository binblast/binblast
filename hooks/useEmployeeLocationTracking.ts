"use client";

import { useEffect, useRef } from "react";

type UseEmployeeLocationTrackingOptions = {
  employeeId?: string;
  enabled?: boolean;
  intervalMs?: number;
};

export function useEmployeeLocationTracking({
  employeeId,
  enabled = false,
  intervalMs = 30000,
}: UseEmployeeLocationTrackingOptions) {
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!employeeId || !enabled || typeof window === "undefined") {
      return;
    }

    if (!navigator.geolocation) {
      console.warn("[Location] Geolocation not supported");
      return;
    }

    const postLocation = (position: GeolocationPosition) => {
      fetch("/api/employee/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading,
          speed: position.coords.speed,
        }),
      }).catch((error) => {
        console.error("[Location] Failed to post employee location:", error);
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn("[Location] Geolocation error:", error.message);
    };

    navigator.geolocation.getCurrentPosition(postLocation, handleError, {
      enableHighAccuracy: true,
      maximumAge: 15000,
      timeout: 10000,
    });

    watchIdRef.current = navigator.geolocation.watchPosition(
      postLocation,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: intervalMs,
        timeout: 15000,
      }
    );

    const interval = window.setInterval(() => {
      navigator.geolocation.getCurrentPosition(postLocation, handleError, {
        enableHighAccuracy: true,
        maximumAge: intervalMs,
        timeout: 10000,
      });
    }, intervalMs);

    return () => {
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      window.clearInterval(interval);
    };
  }, [employeeId, enabled, intervalMs]);
}
