import { PLAN_CONFIGS } from "@/lib/stripe-config";
import { SERVICE_AREAS, SERVICE_AREA_SUMMARY } from "@/lib/service-areas";

export const SUPPORT_PHONE = "(470) 305-0823";
export const SUPPORT_PHONE_TEL = "+14703050823";
export const SUPPORT_EMAIL = "support@binblastco.com";
export const BUSINESS_HOURS = "Monday – Saturday: 8:00 AM – 6:00 PM. Sunday: closed.";

export interface AssistantResponse {
  text: string;
  quickReplies?: string[];
}

type IntentHandler = (input: string) => AssistantResponse | null;

function hasAny(input: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(input));
}

function pricingResponse(): AssistantResponse {
  const plans = Object.values(PLAN_CONFIGS);
  let text = "Here are our current plans:\n\n";

  plans.forEach((plan) => {
    if (plan.id === "commercial") {
      text += `• ${plan.name}: custom quote\n`;
    } else {
      text += `• ${plan.name}: $${plan.price}${plan.priceSuffix}\n`;
    }
  });

  text +=
    "\nAdditional bins are +$10 each.\n\nReady to get started? Pick a plan on our pricing section and we'll walk you through booking.";

  return {
    text,
    quickReplies: ["Schedule a cleaning", "What areas do you serve?", "How does it work?"],
  };
}

const INTENTS: IntentHandler[] = [
  // Greetings
  (input) => {
    if (!hasAny(input, [/^(hi|hello|hey|good\s+(morning|afternoon|evening))\b/, /\bhowdy\b/])) {
      return null;
    }
    return {
      text: "Hey there! I'm your Bin Blast Co. assistant — think of me as your on-site helper. I can help with pricing, booking, your account, billing, cancellations, service areas, and more.\n\nWhat can I help you with today?",
      quickReplies: ["What are your prices?", "Schedule a cleaning", "How do I cancel?"],
    };
  },

  // Thanks
  (input) => {
    if (!hasAny(input, [/\b(thank|thanks|thx|appreciate)\b/])) return null;
    return {
      text: "You're welcome! If you need anything else — booking, billing, or your dashboard — just ask. We're here to help.",
      quickReplies: ["Schedule a cleaning", "Go to my dashboard", "Contact support"],
    };
  },

  // Cancellation — must run before generic "how" / "work" matchers
  (input) => {
    if (
      !hasAny(input, [
        /\bcancel(lation|ing|led)?\b/,
        /\bunsubscribe\b/,
        /\bstop\s+(my\s+)?(service|subscription|plan|cleaning)\b/,
        /\bend\s+(my\s+)?(subscription|plan|service)\b/,
        /\bhow\s+to\s+cancel\b/,
        /\bhow\s+do\s+i\s+cancel\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "You can cancel anytime — here's how:\n\n" +
        "1. Log in at binblastco.com/login\n" +
        "2. Open your customer dashboard\n" +
        "3. Click Manage Billing (secure Stripe billing portal)\n" +
        "4. Cancel your subscription there\n\n" +
        "Cancellation stops future renewals. You keep service through the end of your current paid billing period.\n\n" +
        "Yearly prepaid or one-time purchases are generally non-refundable once service is scheduled or delivered. " +
        "Contact us before your next visit if you have unused prepaid cleanings.\n\n" +
        `Questions? Call ${SUPPORT_PHONE} or email ${SUPPORT_EMAIL}.`,
      quickReplies: ["Go to my dashboard", "View cancellation policy", "Contact support"],
    };
  },

  // Refunds
  (input) => {
    if (!hasAny(input, [/\brefund\b/, /\bmoney\s+back\b/, /\bget\s+my\s+money\b/])) return null;
    return {
      text:
        "Here's our refund policy:\n\n" +
        "• Subscriptions: cancel anytime via Manage Billing in your dashboard. Future charges stop; you keep access through your paid period.\n" +
        "• Yearly prepaid & one-time purchases: generally non-refundable once service is scheduled or delivered.\n" +
        "• Missed cleanings (our fault): contact us within 7 days and we'll reschedule or credit that visit.\n\n" +
        `For billing questions or unused prepaid cleanings, reach out before your next scheduled visit — ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}.`,
      quickReplies: ["View cancellation policy", "Contact support", "Go to my dashboard"],
    };
  },

  // Billing & payments
  (input) => {
    if (
      !hasAny(input, [
        /\bbilling\b/,
        /\bpayment\b/,
        /\bcard\b/,
        /\binvoice\b/,
        /\bcharge[ds]?\b/,
        /\bfailed\s+payment\b/,
        /\bupdate\s+(my\s+)?(card|payment)\b/,
        /\bmanage\s+billing\b/,
        /\bpay\s+my\b/,
        /\bhow\s+(do\s+i\s+)?pay\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "You can manage all billing from your customer dashboard:\n\n" +
        "1. Log in at binblastco.com/login\n" +
        "2. Click Manage Billing on your dashboard\n" +
        "3. Update your card, view invoices, or cancel your plan in the secure Stripe portal\n\n" +
        "Subscriptions renew automatically on your plan's billing cycle. If a payment fails, service may pause until your payment method is updated — we'll notify you by email and/or SMS.\n\n" +
        `Need help? ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}.`,
      quickReplies: ["Go to my dashboard", "How do I cancel?", "Contact support"],
    };
  },

  // Account & login
  (input) => {
    if (
      !hasAny(input, [
        /\blogin\b/,
        /\blog\s*in\b/,
        /\bsign\s*in\b/,
        /\bdashboard\b/,
        /\bmy\s+account\b/,
        /\baccount\b/,
        /\bpassword\b/,
        /\bforgot\s+password\b/,
        /\breset\s+password\b/,
      ])
    ) {
      return null;
    }
    const forgotPassword = /\b(forgot|reset)\s+password\b/.test(input);
    return {
      text: forgotPassword
        ? "To reset your password:\n\n1. Go to binblastco.com/forgot-password\n2. Enter the email on your account\n3. Follow the reset link we send you\n\nOnce you're in, your dashboard lets you view upcoming cleanings, manage billing, update your address, and more."
        : "Your customer dashboard is where you manage everything:\n\n• Upcoming and past cleanings\n• Subscription and plan details\n• Manage Billing (update card, invoices, cancel)\n• Account and service address updates\n\nLog in at binblastco.com/login — new customers can book from our pricing section and create an account during checkout.",
      quickReplies: ["Go to my dashboard", "Manage billing help", "Schedule a cleaning"],
    };
  },

  // Contact & human support
  (input) => {
    if (
      !hasAny(input, [
        /\bcontact\b/,
        /\bsupport\b/,
        /\bphone\b/,
        /\bcall\b/,
        /\bemail\b/,
        /\btalk\s+to\b/,
        /\bspeak\s+to\b/,
        /\bhuman\b/,
        /\brepresentative\b/,
        /\breal\s+person\b/,
        /\bget\s+help\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        `We're happy to help personally!\n\n` +
        `Phone: ${SUPPORT_PHONE}\n` +
        `Email: ${SUPPORT_EMAIL}\n` +
        `Hours: ${BUSINESS_HOURS}\n\n` +
        "For account changes, billing, cancellations, or service issues, our team can usually get you sorted quickly. " +
        "If you're logged in, your dashboard is the fastest way to manage billing and cleanings.",
      quickReplies: ["Go to my dashboard", "Schedule a cleaning", "What are your prices?"],
    };
  },

  // Service areas
  (input) => {
    if (
      !hasAny(input, [
        /\bservice\s+area/,
        /\bareas?\s+(do\s+you|you)\s+serv/,
        /\bdo\s+you\s+serv/,
        /\bwhere\s+do\s+you\s+serv/,
        /\blocation\b/,
        /\bnear\s+me\b/,
        /\bin\s+my\s+(area|city|neighborhood)\b/,
        /\bpeachtree\b/,
        /\bfayetteville\b/,
        /\btyrone\b/,
        /\bsharpsburg\b/,
        /\bsenoia\b/,
        /\bsouth\s+metro\b/,
        /\batlanta\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        `${SERVICE_AREA_SUMMARY}\n\nWe currently serve:\n` +
        SERVICE_AREAS.map((area) => `• ${area}`).join("\n") +
        "\n\nDon't see your city? Book a cleaning or contact us — we're expanding and may already be in your neighborhood.",
      quickReplies: ["Schedule a cleaning", "What are your prices?", "Contact support"],
    };
  },

  // Partner / commercial
  (input) => {
    if (
      !hasAny(input, [
        /\bpartner\b/,
        /\breferral\b/,
        /\bhoa\b/,
        /\bcommercial\b/,
        /\bbusiness\s+opportunit/,
        /\bbecome\s+a\s+partner\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "We offer a partner program for businesses, HOAs, and referral partners who want to offer bin cleaning to their customers.\n\n" +
        "• Learn more: binblastco.com/partners\n" +
        "• Apply to partner: binblastco.com/partners/apply\n" +
        "• Commercial & HOA plans: custom pricing — contact us for a quote\n\n" +
        `Questions? Email ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE}.`,
      quickReplies: ["Partner program info", "Schedule a cleaning", "Contact support"],
    };
  },

  // Pricing
  (input) => {
    if (!hasAny(input, [/\bprice/, /\bcost\b/, /\bhow\s+much\b/, /\bpricing\b/, /\bplan\b/, /\brate\b/])) {
      return null;
    }
    return pricingResponse();
  },

  // Booking
  (input) => {
    if (
      !hasAny(input, [
        /\bbook\b/,
        /\bschedule\b/,
        /\bsign\s+up\b/,
        /\bget\s+started\b/,
        /\bnew\s+customer\b/,
        /\bstart\s+service\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "Getting started is easy:\n\n" +
        "1. Scroll to our pricing section and pick a plan\n" +
        "2. Click Book Now or Get Started\n" +
        "3. Enter your address and trash day\n" +
        "4. Complete checkout — your account and dashboard are set up automatically\n\n" +
        "On your trash day, leave your bins curbside and we'll handle the rest. Want me to take you to pricing?",
      quickReplies: ["Yes, show me pricing", "What areas do you serve?", "How does it work?"],
    };
  },

  // Availability & scheduling
  (input) => {
    if (
      !hasAny(input, [
        /\bavailab/,
        /\bwhen\b/,
        /\bnext\s+clean/,
        /\btrash\s+day\b/,
        /\bwhat\s+day\b/,
        /\bdate\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "We typically schedule new customers within 2–3 business days. Your exact date depends on your location and trash day.\n\n" +
        "During booking you'll pick your trash day — that's when we come each cycle. Subscribers are scheduled automatically; you can view upcoming visits in your dashboard.\n\n" +
        "Want to check availability for your address?",
      quickReplies: ["Schedule a cleaning", "Go to my dashboard", "What are your prices?"],
    };
  },

  // Plan changes
  (input) => {
    if (!hasAny(input, [/\bchange\s+plan\b/, /\bupgrade\b/, /\bdowngrade\b/, /\bswitch\s+plan\b/, /\bchange\s+subscription\b/])) {
      return null;
    }
    return {
      text:
        "To change your plan:\n\n" +
        "1. Log in to your customer dashboard\n" +
        "2. Open subscription or plan settings\n" +
        "3. Select your new plan — prorated charges or credits may apply mid-cycle\n\n" +
        "You can also use Manage Billing for payment updates. Not sure which plan fits? I can walk you through pricing.",
      quickReplies: ["What are your prices?", "Go to my dashboard", "Contact support"],
    };
  },

  // Service issues
  (input) => {
    if (
      !hasAny(input, [
        /\bmissed\b/,
        /\breschedule\b/,
        /\bskip\b/,
        /\bcomplaint\b/,
        /\bproblem\b/,
        /\bissue\b/,
        /\bnot\s+cleaned\b/,
        /\bunsatisfactory\b/,
        /\bdidn'?t\s+come\b/,
        /\bno\s+show\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "Sorry to hear something didn't go right — let's fix it.\n\n" +
        "If we missed a cleaning due to our operations (not inaccessible bins or incorrect info on your account), contact us within 7 days and we'll reschedule or credit that visit.\n\n" +
        "Please make sure bins are curbside and accessible on your trash day, and that your dashboard address is up to date.\n\n" +
        `Reach us at ${SUPPORT_PHONE} or ${SUPPORT_EMAIL} — include your name and service address so we can help fast.`,
      quickReplies: ["Contact support", "Go to my dashboard", "How does it work?"],
    };
  },

  // Bin types
  (input) => {
    if (!hasAny(input, [/\bwhat\s+bins\b/, /\bbin\s+type/, /\bdumpster\b/, /\brecycl/, /\btrash\s+bin/])) {
      return null;
    }
    return {
      text:
        "We clean residential curbside trash, recycling, and organics bins. Most standard roll-out bins used on trash day are fine.\n\n" +
        "Not sure about your setup? Book a one-time clean or contact us with your bin type — we likely cover it. Commercial and HOA properties can get a custom quote.",
      quickReplies: ["Schedule a cleaning", "Commercial plans", "Contact support"],
    };
  },

  // How it works — exclude cancel/billing/account questions that also contain "how"
  (input) => {
    if (
      hasAny(input, [
        /\bcancel/,
        /\bbilling\b/,
        /\bpayment\b/,
        /\blogin\b/,
        /\blog\s*in\b/,
        /\bpassword\b/,
        /\brefund\b/,
      ])
    ) {
      return null;
    }
    if (!hasAny(input, [/\bhow\b/, /\bwork\b/, /\bprocess\b/, /\bwhat\s+do\s+you\s+do\b/])) {
      return null;
    }
    return {
      text:
        "Here's how Bin Blast Co. works:\n\n" +
        "1. You pick a plan and book online\n" +
        "2. On your trash day, leave bins curbside\n" +
        "3. Our truck arrives — high-pressure wash, sanitize, and deodorize\n" +
        "4. We place bins back fresh and clean\n" +
        "5. Subscribers are auto-scheduled each cycle — track everything in your dashboard\n\n" +
        "Simple, hands-off, and no more smelly bins. Ready to get started?",
      quickReplies: ["Schedule a cleaning", "What are your prices?", "What areas do you serve?"],
    };
  },

  // Legal
  (input) => {
    if (!hasAny(input, [/\bterms\b/, /\bprivacy\b/, /\blegal\b/, /\bpolicy\b/])) return null;
    return {
      text:
        "You can review our policies anytime:\n\n" +
        "• Terms of Service: binblastco.com/terms\n" +
        "• Privacy Policy: binblastco.com/privacy\n" +
        "• Cancellation & Refunds: binblastco.com/cancellation\n\n" +
        `Specific questions? ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}.`,
      quickReplies: ["View cancellation policy", "Contact support", "Go to my dashboard"],
    };
  },

  // Hours
  (input) => {
    if (!hasAny(input, [/\bhours\b/, /\bopen\b/, /\bclosed\b/, /\bwhen\s+are\s+you\b/])) return null;
    return {
      text: `Our support hours are ${BUSINESS_HOURS}\n\nYou can book online anytime. For urgent service issues, call ${SUPPORT_PHONE}.`,
      quickReplies: ["Contact support", "Schedule a cleaning", "Go to my dashboard"],
    };
  },
];

export function generateAssistantResponse(userInput: string): AssistantResponse {
  const normalized = userInput.trim().toLowerCase();

  for (const intent of INTENTS) {
    const response = intent(normalized);
    if (response) return response;
  }

  return {
    text:
      "I'm here to help with anything Bin Blast Co. — pricing, booking, your dashboard, billing, cancellations, service areas, and more.\n\n" +
      `If I can't answer something specific, our team can: ${SUPPORT_PHONE} or ${SUPPORT_EMAIL} (${BUSINESS_HOURS})`,
    quickReplies: [
      "What are your prices?",
      "Schedule a cleaning",
      "How do I cancel?",
      "Contact support",
    ],
  };
}

export type QuickReplyAction =
  | { type: "message"; text: string }
  | { type: "navigate"; href: string }
  | { type: "scroll"; targetId: string }
  | { type: "call"; tel: string };

export function resolveQuickReplyAction(reply: string): QuickReplyAction {
  const lower = reply.toLowerCase();

  if (lower.includes("pricing") || lower.includes("show me") || lower.includes("book now")) {
    return { type: "scroll", targetId: "pricing" };
  }
  if (lower.includes("dashboard") || lower.includes("log in") || lower.includes("login")) {
    return { type: "navigate", href: "/login" };
  }
  if (lower.includes("cancellation") || lower.includes("cancel policy")) {
    return { type: "navigate", href: "/cancellation" };
  }
  if (lower.includes("partner")) {
    return { type: "navigate", href: "/partners" };
  }
  if (lower.includes("call")) {
    return { type: "call", tel: SUPPORT_PHONE_TEL };
  }
  if (lower === "contact support") {
    return { type: "message", text: "How do I contact support?" };
  }
  if (lower.includes("billing")) {
    return { type: "message", text: "How do I manage billing?" };
  }
  if (lower.includes("commercial")) {
    return { type: "message", text: "Tell me about commercial plans" };
  }
  if (lower.includes("areas") || lower.includes("serve")) {
    return { type: "message", text: "What areas do you serve?" };
  }

  return { type: "message", text: reply };
}
