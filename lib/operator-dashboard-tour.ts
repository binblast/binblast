import type { CustomerSubTab } from "@/lib/operator-customers";

export type OperatorTourTab = "overview" | "employees" | "customers" | "schedule" | "messages";

export type OperatorTourHighlight = {
  label: string;
  value: string;
};

export type OperatorTourExample = {
  scenario: string;
  action: string;
};

export type OperatorTourStep = {
  id: string;
  title: string;
  accent?: string;
  body: string;
  bullets?: string[];
  examples?: OperatorTourExample[];
  highlights?: OperatorTourHighlight[];
  preview: string;
  tab?: OperatorTourTab;
  customerSubTab?: CustomerSubTab;
};

export const OPERATOR_TOUR_STORAGE_KEY = "binblast_operator_tour_completed_v2";

export const OPERATOR_TOUR_STEPS: OperatorTourStep[] = [
  {
    id: "welcome",
    title: "Welcome to your operations",
    accent: "command center",
    body:
      "Blast Command is where you run Bin Blast day to day. This slideshow walks you through every area with real examples so you know exactly where to go, what to check, and how to keep routes running smoothly.",
    highlights: [
      { label: "5 main tabs", value: "Overview → Messages" },
      { label: "Live sync", value: "Map & fleet every 20–30s" },
      { label: "Daily checklist", value: "Built into the tour" },
    ],
    preview: "welcome",
    tab: "overview",
  },
  {
    id: "tabs",
    title: "Your five control areas",
    accent: "navigation tabs",
    body: "Each tab covers one part of the operation. You will move between these all day — think of them as your morning-to-close workflow.",
    bullets: [
      "Overview — live map and daily pulse",
      "Employees — fleet, flags, hours, and pay",
      "Customers — residential, commercial, quotes",
      "Schedule — assign routes and track jobs",
      "Messages — reach your team fast",
    ],
    examples: [
      {
        scenario: "It's 7:00 AM and you need a quick status check.",
        action: "Start on Overview → Live Map, then jump to Schedule.",
      },
      {
        scenario: "A driver texts that they are stuck on a stop.",
        action: "Go to Employees to find them, then Messages to reply.",
      },
    ],
    highlights: [
      { label: "Morning start", value: "Overview tab" },
      { label: "Route planning", value: "Schedule tab" },
      { label: "Team issues", value: "Employees tab" },
    ],
    preview: "tabs",
    tab: "overview",
  },
  {
    id: "live-map",
    title: "Live map — start every morning here",
    accent: "Live Map",
    body:
      "The map shows where every employee is and which stops are active. Open this first to confirm everyone is clocked in and routes are moving.",
    bullets: [
      "Blue markers = employees currently on shift",
      "Stop pins = scheduled cleanings on the route",
      "Refreshes automatically every 20 seconds",
    ],
    examples: [
      {
        scenario: "You see 3 drivers on the map but 4 are scheduled today.",
        action: "Go to Employees → Not Started and call the missing driver.",
      },
      {
        scenario: "A stop shows on the map but the driver hasn't moved in 30 min.",
        action: "Open their employee card → check flags or message them.",
      },
    ],
    highlights: [
      { label: "Check first", value: "Before 8 AM" },
      { label: "Watch for", value: "Drivers not moving" },
      { label: "Goal", value: "Everyone on route" },
    ],
    preview: "live-map",
    tab: "overview",
  },
  {
    id: "overview-stats",
    title: "Operations snapshot cards",
    accent: "overview stats",
    body:
      "These cards summarize customers, upcoming cleanings, completions, and open issues. If a number looks wrong, click through to the related tab.",
    examples: [
      {
        scenario: "Upcoming Cleanings shows 18 but Schedule → Today shows 12.",
        action: "Refresh the schedule board — some jobs may be unassigned or on a different date.",
      },
      {
        scenario: "Open Issues count jumped overnight.",
        action: "Go to Employees → Has Flags and resolve each one before routes go out.",
      },
    ],
    highlights: [
      { label: "Direct Customers", value: "Active vs paused" },
      { label: "Upcoming", value: "Today / week load" },
      { label: "Open Issues", value: "Needs attention" },
    ],
    preview: "overview-stats",
    tab: "overview",
  },
  {
    id: "employees-fleet",
    title: "Fleet status — your team on the ground",
    accent: "Fleet Status",
    body:
      "The Employees tab shows who is working, who hasn't started, and who needs help. Use the stat cards and filters to scan the whole crew in seconds.",
    bullets: [
      "On Shift — actively working right now",
      "Not Started — still need to clock in",
      "Has Flags — jobs or issues needing manager action",
    ],
    examples: [
      {
        scenario: "James shows Clocked In with 4 jobs assigned and 2 remaining.",
        action: "Normal — he's mid-route. Check back when Jobs Remaining hits 0.",
      },
      {
        scenario: "An employee shows Not Started at 9:00 AM.",
        action: "Call or message them. If no response, reassign their urgent stops.",
      },
    ],
    highlights: [
      { label: "On Shift", value: "Working now" },
      { label: "Not Started", value: "Call if late" },
      { label: "Open Flags", value: "Fix before EOD" },
    ],
    preview: "fleet-status",
    tab: "employees",
  },
  {
    id: "employee-cards",
    title: "Drill into any employee",
    accent: "employee profile",
    body:
      "Click any employee card to open their full profile — route map, stops, assignments, photos, training, and pay adjustments.",
    bullets: [
      "Open Route — see today's stop list and map",
      "Photos — verify proof-of-work",
      "Assign customers — make sure their route is complete",
    ],
    examples: [
      {
        scenario: "A driver says they are missing a stop on their route.",
        action: "Open their profile → Stop List → confirm the job is assigned to them.",
      },
      {
        scenario: "Commercial job needs a bonus for heavy cleaning.",
        action: "Open profile → find the stop → Adjust Pay on commercial/HOA jobs.",
      },
    ],
    highlights: [
      { label: "Open Route", value: "Full stop list" },
      { label: "Photos", value: "Proof of work" },
      { label: "Adjust Pay", value: "Commercial/HOA" },
    ],
    preview: "employee-card",
    tab: "employees",
  },
  {
    id: "open-flags",
    title: "Open flags — resolve issues fast",
    accent: "Open Flags",
    body:
      "Flags surface field problems: missed photos, rejected jobs, access issues, and more. Clear these during the day so nothing becomes a customer complaint.",
    examples: [
      {
        scenario: "Flag: 'Missing after photo — 123 Oak St'.",
        action: "Message the driver to re-upload, or mark resolved once fixed.",
      },
      {
        scenario: "Flag: 'Customer gate locked — cannot access bins'.",
        action: "Contact the customer, reschedule, or assign a return visit.",
      },
    ],
    highlights: [
      { label: "Filter", value: "Has Flags" },
      { label: "Priority", value: "Same-day fixes" },
      { label: "Goal", value: "Zero open flags EOD" },
    ],
    preview: "open-flags",
    tab: "employees",
  },
  {
    id: "hours-pay",
    title: "Hours & pay tracking",
    accent: "Hours & Pay",
    body:
      "Switch to Hours & Pay at the top of the Employees tab to see bins cleaned, hours worked, and earnings for today and this week.",
    examples: [
      {
        scenario: "Driver completed 6 bins today (4 two-bin stops).",
        action: "Pay shows per-bin: $8 first + $2 each additional = verify totals match.",
      },
      {
        scenario: "End of week payroll review.",
        action: "Export CSV from Hours & Pay and compare to completed jobs in Schedule.",
      },
    ],
    highlights: [
      { label: "Residential", value: "$8 + $2/bin" },
      { label: "Commercial", value: "Per container" },
      { label: "Export", value: "CSV / PDF" },
    ],
    preview: "hours-pay",
    tab: "employees",
  },
  {
    id: "schedule-board",
    title: "Schedule & route board",
    accent: "Schedule board",
    body:
      "Every cleaning must be assigned to an employee. This is where you plan the week, assign drivers, and track job status from scheduled to complete.",
    bullets: [
      "Assign employees directly from each job row",
      "Drag-and-drop or use the assign dropdown",
      "Track status: scheduled → in progress → completed",
    ],
    examples: [
      {
        scenario: "Monday schedule has 24 jobs but only 20 are assigned.",
        action: "Click Unassigned filter → assign the 4 open jobs before drivers leave.",
      },
      {
        scenario: "Customer called — move their cleaning to Thursday.",
        action: "Find the job → change date → reassign if the original driver is unavailable.",
      },
    ],
    highlights: [
      { label: "Rule #1", value: "No unassigned jobs" },
      { label: "Morning", value: "Check Today filter" },
      { label: "Dispatch", value: "Ready Today first" },
    ],
    preview: "schedule-board",
    tab: "schedule",
  },
  {
    id: "schedule-filters",
    title: "Daily schedule filters",
    accent: "quick filters",
    body:
      "These filters are your daily shortcuts. Build your morning routine around Unassigned, Today, and Ready Today.",
    bullets: [
      "Unassigned — jobs with no driver (fix first)",
      "Today — full route load for the day",
      "Ready Today — cleared for service",
      "In Progress — actively being worked",
    ],
    examples: [
      {
        scenario: "7:30 AM morning dispatch.",
        action: "Unassigned → assign all → Today → confirm count → Ready Today → release routes.",
      },
    ],
    highlights: [
      { label: "Step 1", value: "Unassigned = 0" },
      { label: "Step 2", value: "Today count matches map" },
      { label: "Step 3", value: "Ready Today cleared" },
    ],
    preview: "schedule-filters",
    tab: "schedule",
  },
  {
    id: "customers",
    title: "Customers & accounts",
    accent: "Customers tab",
    body:
      "Manage residential subscribers, commercial/HOA accounts, and service details. Watch for paused accounts and special instructions before assigning routes.",
    examples: [
      {
        scenario: "Customer note says 'Gate code 4521 — bins behind garage'.",
        action: "Confirm the note is on their profile before the driver is dispatched.",
      },
      {
        scenario: "Account shows Paused but still on tomorrow's schedule.",
        action: "Remove from schedule or contact customer before assigning.",
      },
    ],
    highlights: [
      { label: "Residential", value: "Subscribers" },
      { label: "Commercial", value: "HOA & business" },
      { label: "Watch", value: "Paused accounts" },
    ],
    preview: "customers",
    tab: "customers",
    customerSubTab: "residential",
  },
  {
    id: "quotes",
    title: "Quote leads — respond fast",
    accent: "Quote Leads",
    body:
      "New custom quote requests land here. A yellow banner appears at the top when new quotes arrive — respond quickly to win the business.",
    examples: [
      {
        scenario: "Banner shows '2 New Custom Quote Requests'.",
        action: "Customers → Quote Leads → review property details → create and send offer.",
      },
      {
        scenario: "Commercial lead for a 40-unit HOA.",
        action: "Review bin count, frequency, and access — set up as commercial account if accepted.",
      },
    ],
    highlights: [
      { label: "Banner alert", value: "New quotes" },
      { label: "Tab", value: "Quote Leads" },
      { label: "Goal", value: "Same-day response" },
    ],
    preview: "quotes",
    tab: "customers",
    customerSubTab: "quotes",
  },
  {
    id: "messages",
    title: "Team messages",
    accent: "Messages",
    body:
      "Use Messages to reach employees when they are in the field — stuck on a stop, running late, or needing a route change mid-day.",
    examples: [
      {
        scenario: "Driver texts: 'Customer not home, bins in backyard'.",
        action: "Reply in Messages with instructions or call the customer from their profile.",
      },
    ],
    highlights: [
      { label: "Use for", value: "Route changes" },
      { label: "Use for", value: "Access issues" },
      { label: "Use for", value: "Late arrivals" },
    ],
    preview: "messages",
    tab: "messages",
  },
  {
    id: "daily-checklist",
    title: "Your daily morning checklist",
    accent: "morning routine",
    body: "Run through this list every morning before routes go out. It takes about 10 minutes and prevents most day-of issues.",
    bullets: [
      "Overview → Live Map: all drivers clocked in?",
      "Schedule → Unassigned: every job has a driver?",
      "Schedule → Today / Ready Today: route count looks right?",
      "Employees → Has Flags: any open issues to clear?",
      "Customers → Quote Leads: new requests to answer?",
      "End of day → Hours & Pay: spot-check bins and earnings",
    ],
    examples: [
      {
        scenario: "Everything passes the checklist.",
        action: "Routes are ready — monitor the map and flags through the day.",
      },
    ],
    highlights: [
      { label: "Time", value: "~10 min each AM" },
      { label: "Critical", value: "Unassigned = 0" },
      { label: "Critical", value: "Flags cleared" },
    ],
    preview: "checklist",
    tab: "overview",
  },
  {
    id: "complete",
    title: "You're ready to run operations",
    accent: "Blast Command",
    body:
      "Reopen this slideshow anytime with the ? button or Take a Tour. The dashboard stays synced in real time — map, fleet, and payroll update automatically while you work.",
    highlights: [
      { label: "Reopen tour", value: "? button" },
      { label: "Live data", value: "Auto-refresh" },
      { label: "Need help?", value: "Message the owner" },
    ],
    preview: "complete",
  },
];

export function getOperatorTourTargetSelector(target?: string): string | null {
  if (!target) return null;
  return `[data-operator-tour="${target}"]`;
}
