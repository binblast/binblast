export const ACTIVE_CLEANING_STATUSES = new Set([
  "upcoming",
  "pending",
  "scheduled",
  "in-progress",
  "in_progress",
]);

export function isCleaningCancelled(status?: string, jobStatus?: string): boolean {
  return status === "cancelled" || jobStatus === "cancelled";
}

export function isCleaningCompleted(status?: string, jobStatus?: string): boolean {
  return status === "completed" || jobStatus === "completed";
}

export function isActiveCleaningStatus(status?: string, jobStatus?: string): boolean {
  if (isCleaningCancelled(status, jobStatus) || isCleaningCompleted(status, jobStatus)) {
    return false;
  }

  const normalizedStatus = (status || "").toLowerCase();
  const normalizedJobStatus = (jobStatus || "").toLowerCase();

  if (ACTIVE_CLEANING_STATUSES.has(normalizedStatus)) {
    return true;
  }

  if (ACTIVE_CLEANING_STATUSES.has(normalizedJobStatus)) {
    return true;
  }

  return !normalizedStatus && !normalizedJobStatus;
}
