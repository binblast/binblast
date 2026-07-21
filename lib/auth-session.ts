// lib/auth-session.ts
// Helpers for waiting on Firebase auth restoration and preserving redirect URLs.

export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback: string
): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export function appendRedirectParam(
  basePath: string,
  redirect: string | null | undefined
): string {
  const safeRedirect = redirect ? getSafeRedirectPath(redirect, "") : "";
  if (!safeRedirect) return basePath;

  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}redirect=${encodeURIComponent(safeRedirect)}`;
}

export function getCurrentPathWithSearch(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

export async function subscribeAuthState(
  callback: (user: { uid: string; email: string | null } | null) => void
): Promise<() => void> {
  const { onAuthStateChanged } = await import("@/lib/firebase");
  return onAuthStateChanged(callback);
}
