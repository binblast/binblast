import type { CustomerSubTab } from "@/lib/operator-customers";

export type OperatorTourTab = "overview" | "employees" | "customers" | "schedule" | "messages";

export type OperatorTourPlacement = "top" | "bottom" | "left" | "right" | "center";

export type OperatorTourStep = {
  id: string;
  title: string;
  body: string;
  bullets?: string[];
  target?: string;
  tab?: OperatorTourTab;
  customerSubTab?: CustomerSubTab;
  placement?: OperatorTourPlacement;
  navDelayMs?: number;
};

export const OPERATOR_TOUR_STORAGE_KEY = "binblast_operator_tour_completed_v1";

export const OPERATOR_TOUR_STEPS: OperatorTourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Blast Command",
    body:
      "This is your operator dashboard — the home base for running Bin Blast day to day. This tour walks you through each area so you know where to go, what to watch, and how to keep routes, employees, and customers on track.",
    placement: "center",
  },
  {
    id: "tabs",
    title: "Main Navigation",
    body: "Use these tabs to move between the five core areas of daily operations.",
    bullets: [
      "Overview — morning pulse check and live map",
      "Employees — who's on shift, flags, hours, and pay",
      "Customers — residential, commercial, and quote leads",
      "Schedule — assign routes and track job status",
      "Messages — reach your team quickly",
    ],
    target: "tabs",
    tab: "overview",
    placement: "bottom",
  },
  {
    id: "live-map",
    title: "Live Map — Start Here Every Morning",
    body:
      "The live map shows employee locations, today's stops, and upcoming routes. Open this first each day to confirm everyone is clocked in and moving through their route.",
    bullets: [
      "Blue markers = employees on shift",
      "Stop markers = scheduled cleanings",
      "Map refreshes automatically every 20 seconds",
    ],
    target: "live-map",
    tab: "overview",
    placement: "bottom",
    navDelayMs: 350,
  },
  {
    id: "overview-stats",
    title: "Operations Snapshot",
    body:
      "These cards give you a quick read on customers, upcoming cleanings, completions, and open issues. If a number looks off, click through to the related tab.",
    target: "overview-stats",
    tab: "overview",
    placement: "top",
    navDelayMs: 200,
  },
  {
    id: "employees-fleet",
    title: "Fleet Status — Your Team on the Ground",
    body:
      "The Employees tab is where you monitor the whole crew. See who is clocked in, who hasn't started, and who has open flags that need attention.",
    bullets: [
      "On Shift — active employees working right now",
      "Not Started — employees who still need to clock in",
      "Has Flags — jobs or issues that need manager action",
    ],
    target: "fleet-status",
    tab: "employees",
    placement: "bottom",
    navDelayMs: 450,
  },
  {
    id: "employee-cards",
    title: "Drill Into Any Employee",
    body:
      "Click an employee card to open their full profile — route map, stop list, customer assignments, photos, training status, and more. This is how you make sure each person has what they need for the day.",
    bullets: [
      "Assign or reassign customers and stops",
      "Review proof-of-work photos",
      "Message the employee directly",
      "Adjust commercial/HOA pay when needed",
    ],
    target: "employee-cards",
    tab: "employees",
    placement: "top",
    navDelayMs: 300,
  },
  {
    id: "open-flags",
    title: "Open Flags — Resolve Issues Fast",
    body:
      "Flags surface problems from the field: missed photos, rejected jobs, access issues, and more. Clear these during the day so nothing carries over to customer complaints.",
    target: "open-flags",
    tab: "employees",
    placement: "bottom",
    navDelayMs: 200,
  },
  {
    id: "hours-pay",
    title: "Hours & Pay",
    body:
      "Switch to Hours & Pay at the top of the Employees tab to see bins cleaned, hours worked, and earnings for today and this week. Use this to verify payroll before end of day.",
    target: "employee-view-toggle",
    tab: "employees",
    placement: "bottom",
    navDelayMs: 200,
  },
  {
    id: "schedule-board",
    title: "Schedule & Route Board",
    body:
      "Every cleaning must be assigned to an employee. The schedule board is where you plan the week, assign routes, and track job progress.",
    bullets: [
      "Use Unassigned to find jobs with no driver",
      "Use Today and Ready Today for morning dispatch",
      "Assign employees directly from each job row",
    ],
    target: "schedule-board",
    tab: "schedule",
    placement: "bottom",
    navDelayMs: 500,
  },
  {
    id: "schedule-filters",
    title: "Schedule Filters You Should Use Daily",
    body:
      "These quick filters are your daily workflow shortcuts. Make Unassigned and Today part of your morning routine.",
    bullets: [
      "Unassigned — assign every open job before routes go out",
      "Today — confirm today's full route load",
      "Ready Today — jobs cleared for service",
      "In Progress — jobs currently being worked",
    ],
    target: "schedule-filters",
    tab: "schedule",
    placement: "bottom",
    navDelayMs: 300,
  },
  {
    id: "customers",
    title: "Customers & Accounts",
    body:
      "Manage residential subscribers, commercial/HOA accounts, and incoming quote requests. Check for paused accounts, special instructions, and new leads that need a response.",
    target: "customers-hub",
    tab: "customers",
    customerSubTab: "residential",
    placement: "bottom",
    navDelayMs: 500,
  },
  {
    id: "quotes",
    title: "Quote Leads",
    body:
      "New custom quote requests land here. Respond quickly — operators often see a banner at the top when new quotes arrive. Review details and create offers from this tab.",
    target: "customers-tabs",
    tab: "customers",
    customerSubTab: "quotes",
    placement: "bottom",
    navDelayMs: 350,
  },
  {
    id: "messages",
    title: "Team Messages",
    body:
      "Use Messages to contact employees or coordinate with the team. Helpful when someone is stuck on a stop, running late, or needs a route change mid-day.",
    target: "messages-panel",
    tab: "messages",
    placement: "bottom",
    navDelayMs: 300,
  },
  {
    id: "daily-checklist",
    title: "Daily Morning Checklist",
    body: "Run through this list each morning to keep operations smooth:",
    bullets: [
      "Overview → Live Map: confirm all drivers are clocked in",
      "Schedule → Unassigned: assign every job to an employee",
      "Schedule → Today / Ready Today: verify today's route is complete",
      "Employees → Has Flags: resolve open field issues",
      "Customers → Quote Leads: respond to new requests",
      "Employees → Hours & Pay: spot-check bins and earnings at end of day",
    ],
    placement: "center",
    tab: "overview",
    navDelayMs: 200,
  },
  {
    id: "complete",
    title: "You're Ready to Run Operations",
    body:
      "You can reopen this tour anytime with the ? button next to the dashboard title. Blast Command stays synced in real time — maps, fleet status, and payroll update automatically while you work.",
    placement: "center",
  },
];

export function getOperatorTourTargetSelector(target?: string): string | null {
  if (!target) return null;
  return `[data-operator-tour="${target}"]`;
}
