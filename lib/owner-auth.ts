// lib/owner-auth.ts
// Shared access checks for owner, admin, and operator tooling.

export const ADMIN_EMAIL = "binblastcompany@gmail.com";

export function canAccessBusinessCommandCenter(
  email: string | null | undefined,
  role?: string | null
): boolean {
  return (
    role === "owner" ||
    role === "admin" ||
    role === "operator" ||
    email === ADMIN_EMAIL
  );
}

export function canAccessAdminPages(
  email: string | null | undefined,
  role?: string | null
): boolean {
  return role === "owner" || role === "admin" || email === ADMIN_EMAIL;
}
