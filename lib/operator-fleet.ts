import { formatTime } from "@/lib/employee-utils";

export type FleetQuickFilter = "on_shift" | "not_started" | "done" | "flags" | "all";

export interface FleetEmployee {
  id: string;
  name: string;
  email: string;
  serviceArea: string[];
  clockInStatus: {
    isActive: boolean;
    clockInTime?: unknown;
    clockOutTime?: unknown | null;
  } | null;
  jobsAssigned: number;
  jobsCompleted: number;
  jobsRemaining: number;
  openIssueCount?: number;
}

export interface FleetStats {
  onShift: number;
  notStarted: number;
  jobsRemaining: number;
  openFlags: number;
  onRoute: number;
}

export function formatEmployeeName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function isClockedIn(employee: FleetEmployee): boolean {
  return employee.clockInStatus?.isActive === true;
}

export function isNotStarted(employee: FleetEmployee): boolean {
  return !isClockedIn(employee) && employee.jobsAssigned > 0 && employee.jobsRemaining > 0;
}

export function isDoneForDay(employee: FleetEmployee): boolean {
  return employee.jobsAssigned > 0 && employee.jobsRemaining <= 0;
}

export function hasOpenFlags(employee: FleetEmployee): boolean {
  return (employee.openIssueCount ?? 0) > 0;
}

export function buildFleetStats(employees: FleetEmployee[]): FleetStats {
  return {
    onShift: employees.filter(isClockedIn).length,
    notStarted: employees.filter(isNotStarted).length,
    jobsRemaining: employees.reduce((sum, employee) => sum + Math.max(employee.jobsRemaining, 0), 0),
    openFlags: employees.reduce((sum, employee) => sum + (employee.openIssueCount ?? 0), 0),
    onRoute: employees.filter((employee) => isClockedIn(employee) && employee.jobsRemaining > 0).length,
  };
}

export function getAttentionLabel(employee: FleetEmployee): string | null {
  if (hasOpenFlags(employee)) {
    return `${employee.openIssueCount} open flag${employee.openIssueCount === 1 ? "" : "s"}`;
  }
  if (isNotStarted(employee)) {
    return `Not started · ${employee.jobsRemaining} job${employee.jobsRemaining === 1 ? "" : "s"} waiting`;
  }
  if (isClockedIn(employee) && employee.jobsAssigned === 0) {
    return "On shift · no route today";
  }
  if (isClockedIn(employee) && employee.jobsRemaining > 0) {
    return `${employee.jobsRemaining} stop${employee.jobsRemaining === 1 ? "" : "s"} left`;
  }
  if (isDoneForDay(employee)) {
    return "Route complete";
  }
  return null;
}

export function getAttentionTone(employee: FleetEmployee): "danger" | "warning" | "success" | "neutral" {
  if (hasOpenFlags(employee) || isNotStarted(employee)) return "danger";
  if (isClockedIn(employee) && employee.jobsAssigned === 0) return "warning";
  if (isDoneForDay(employee)) return "success";
  return "neutral";
}

export function filterFleetEmployees(
  employees: FleetEmployee[],
  filter: FleetQuickFilter
): FleetEmployee[] {
  switch (filter) {
    case "on_shift":
      return employees.filter(isClockedIn);
    case "not_started":
      return employees.filter(isNotStarted);
    case "done":
      return employees.filter(isDoneForDay);
    case "flags":
      return employees.filter(hasOpenFlags);
    default:
      return employees;
  }
}

export function sortFleetEmployees(employees: FleetEmployee[]): FleetEmployee[] {
  const priority = (employee: FleetEmployee) => {
    if (hasOpenFlags(employee)) return 0;
    if (isNotStarted(employee)) return 1;
    if (isClockedIn(employee) && employee.jobsRemaining > 0) return 2;
    if (isClockedIn(employee) && employee.jobsAssigned === 0) return 3;
    if (isDoneForDay(employee)) return 4;
    return 5;
  };

  return [...employees].sort((a, b) => {
    const priorityDiff = priority(a) - priority(b);
    if (priorityDiff !== 0) return priorityDiff;
    return formatEmployeeName(a.name).localeCompare(formatEmployeeName(b.name));
  });
}

export function getClockStatusLabel(employee: FleetEmployee): string {
  if (isClockedIn(employee)) {
    const clockInTime = employee.clockInStatus?.clockInTime
      ? formatTime(employee.clockInStatus.clockInTime)
      : null;
    return clockInTime ? `Clocked In · ${clockInTime}` : "Clocked In";
  }

  if (employee.clockInStatus && !employee.clockInStatus.isActive) {
    return "Clocked Out";
  }

  return "Not Clocked In";
}

export function getClockStatusStyle(employee: FleetEmployee): {
  background: string;
  color: string;
  border: string;
} {
  if (isClockedIn(employee)) {
    return { background: "#ecfdf5", color: "#166534", border: "#bbf7d0" };
  }
  if (employee.clockInStatus && !employee.clockInStatus.isActive) {
    return { background: "#f3f4f6", color: "#4b5563", border: "#e5e7eb" };
  }
  return { background: "#fef2f2", color: "#991b1b", border: "#fecaca" };
}
