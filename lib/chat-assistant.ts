import { PLAN_CONFIGS } from "@/lib/stripe-config";
import {
  PRIMARY_SERVICE_AREAS,
  ADDITIONAL_METRO_ATLANTA_AREAS,
  SERVICE_AREA_SUMMARY,
} from "@/lib/service-areas";
import { BUSINESS_HOURS_DISPLAY } from "@/lib/business-hours";

export const SUPPORT_PHONE = "(470) 305-0823";
export const SUPPORT_PHONE_TEL = "+14703050823";
export const SUPPORT_EMAIL = "support@binblastco.com";
export const BUSINESS_HOURS = BUSINESS_HOURS_DISPLAY;

export interface AssistantResponse {
  text: string;
  quickReplies?: string[];
}

type IntentHandler = (input: string) => AssistantResponse | null;

function hasAny(input: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(input));
}

function hasHowToAction(input: string): boolean {
  return /\bhow\s+(to|do\s+i|can\s+i)\b/.test(input);
}

function pricingResponse(): AssistantResponse {
  const plans = Object.values(PLAN_CONFIGS);
  let text = "Here are our current plans (each includes 1 bin; extra bins are +$10/bin per visit):\n\n";

  plans.forEach((plan) => {
    if (plan.id === "commercial") {
      text += `• ${plan.name}: custom quote\n`;
    } else {
      text += `• ${plan.name}: $${plan.price}${plan.priceSuffix}\n`;
    }
  });

  text +=
    "\nAll plans include eco-friendly high-pressure cleaning, disinfecting, and deodorizing.\n\n" +
    "New customers: go to the pricing section, pick a plan, and complete the booking wizard + checkout.";

  return {
    text,
    quickReplies: ["How do I sign up?", "Add a bin", "What areas do you serve?"],
  };
}

const addExtraBinResponse = (): AssistantResponse => ({
  text:
    "Every plan includes 1 bin per cleaning. Extra bins are $10 each per visit.\n\n" +
    "To add bins to your account:\n\n" +
    "1. Log in at binblastco.com/login (Customer Portal)\n" +
    "2. Open your dashboard\n" +
    "3. Go to Your Plan\n" +
    "4. Use the − / + buttons to choose how many extra bins to add\n" +
    "5. Click Add Extra Bin(s) — you'll complete a quick Stripe checkout ($10 per bin)\n" +
    "6. After payment, your Bins Per Cleaning count updates automatically\n\n" +
    "You can also set the number of bins when scheduling an individual cleaning in the Schedule a Cleaning form.",
  quickReplies: ["Go to my dashboard", "What are your prices?", "Schedule a cleaning"],
});

const scheduleCleaningResponse = (): AssistantResponse => ({
  text:
    "To schedule or book a cleaning:\n\n" +
    "**New customers:**\n" +
    "1. Go to the pricing section and pick a plan\n" +
    "2. Complete the 4-step booking wizard (info, address, preferred date & time, review)\n" +
    "3. Pay through Stripe checkout\n" +
    "4. Create your password on the registration page\n" +
    "5. Your dashboard opens — confirm or adjust your first cleaning date\n\n" +
    "**Existing customers:**\n" +
    "1. Log in → dashboard\n" +
    "2. In Schedule a Cleaning, click Schedule Cleaning\n" +
    "3. Pick your cleaning day, time window (6 AM–6 PM slots), address, number of bins, and any special instructions (gate codes, bin location)\n" +
    "4. Submit — you'll get a confirmation and it appears under Your Cleanings → Upcoming\n\n" +
    "Leave bins at the curb during your scheduled window.",
  quickReplies: ["Go to my dashboard", "Reschedule a cleaning", "What are your prices?"],
});

const rescheduleResponse = (): AssistantResponse => ({
  text:
    "To reschedule an upcoming cleaning:\n\n" +
    "1. Log in → dashboard\n" +
    "2. Option A: In Schedule a Cleaning, click Reschedule on your upcoming visit banner\n" +
    "3. Option B: Under Your Cleanings → Upcoming, click Edit on the cleaning card\n" +
    "4. Pick a new date and time window, then save\n\n" +
    "Changes must be made at least 24 hours before your scheduled cleaning time (the site enforces this). " +
    "For urgent changes inside that window, call us at " +
    SUPPORT_PHONE +
    ".\n\n" +
    "Make sure your service address and special instructions are correct when you reschedule.",
  quickReplies: ["Go to my dashboard", "Contact support", "View my cleanings"],
});

const INTENTS: IntentHandler[] = [
  // Greetings
  (input) => {
    if (!hasAny(input, [/^(hi|hello|hey|good\s+(morning|afternoon|evening))\b/, /\bhowdy\b/])) {
      return null;
    }
    return {
      text:
        "Hey! I'm your Bin Blast Co. assistant — I know this site inside and out.\n\n" +
        "I can help you book service, manage your dashboard, add bins, change plans, billing, cancellations, referrals, service areas, and more.\n\n" +
        "What do you need help with?",
      quickReplies: ["How do I sign up?", "Go to my dashboard", "How do I add a bin?", "Contact support"],
    };
  },

  // Thanks
  (input) => {
    if (!hasAny(input, [/\b(thank|thanks|thx|appreciate)\b/])) return null;
    return {
      text: "You're welcome! Anything else — booking, your dashboard, billing, or scheduling — just ask.",
      quickReplies: ["Go to my dashboard", "Schedule a cleaning", "Contact support"],
    };
  },

  // Add extra bins — before any generic "how" matcher
  (input) => {
    if (
      !hasAny(input, [
        /\b(add|adding|extra|another|second|more|additional)\b.*\bbin/,
        /\bbin.*\b(add|extra|another|more|additional)\b/,
        /\bhow\s+(to|do\s+i)\s+add\s+(a\s+)?bin/,
        /\bhow\s+many\s+bins\b/,
        /\bmultiple\s+bins\b/,
        /\bextra\s+bin\b/,
        /\b\+\$10\b/,
      ])
    ) {
      return null;
    }
    return addExtraBinResponse();
  },

  // Cancellation
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
        "You can cancel anytime:\n\n" +
        "1. Log in at binblastco.com/login\n" +
        "2. Open your dashboard → Your Plan\n" +
        "3. Click Manage Billing (secure Stripe billing portal)\n" +
        "4. Cancel your subscription there\n\n" +
        "Future renewals stop. You keep service through the end of your current paid billing period.\n\n" +
        "Yearly prepaid or one-time purchases are generally non-refundable once service is scheduled or delivered. " +
        "Contact us before your next visit if you have unused prepaid cleanings.\n\n" +
        `Questions? ${SUPPORT_PHONE} or ${SUPPORT_EMAIL}. Full policy: binblastco.com/cancellation`,
      quickReplies: ["Go to my dashboard", "View cancellation policy", "Contact support"],
    };
  },

  // Refunds
  (input) => {
    if (!hasAny(input, [/\brefund\b/, /\bmoney\s+back\b/, /\bget\s+my\s+money\b/])) return null;
    return {
      text:
        "Refund policy:\n\n" +
        "• Subscriptions: cancel via Manage Billing — future charges stop; access continues through your paid period.\n" +
        "• Yearly prepaid & one-time purchases: generally non-refundable once scheduled or delivered.\n" +
        "• Missed cleanings (our fault): contact us within 7 days for a reschedule or credit.\n\n" +
        `Billing questions: ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}. Policy: binblastco.com/cancellation`,
      quickReplies: ["View cancellation policy", "Contact support", "Go to my dashboard"],
    };
  },

  // Reschedule
  (input) => {
    if (!hasAny(input, [/\breschedule\b/, /\bchange\s+(my\s+)?(date|time|appointment)\b/, /\bmove\s+my\s+cleaning\b/])) {
      return null;
    }
    return rescheduleResponse();
  },

  // View upcoming / past cleanings
  (input) => {
    if (
      !hasAny(input, [
        /\bupcoming\s+clean/,
        /\bnext\s+clean/,
        /\bwhen\s+(is|are)\s+my\b/,
        /\bmy\s+appointments?\b/,
        /\bcleaning\s+history\b/,
        /\bpast\s+clean/,
        /\bview\s+(my\s+)?clean/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "To see your cleanings:\n\n" +
        "1. Log in → dashboard\n" +
        "2. Scroll to Your Cleanings\n" +
        "3. Upcoming shows your next visits (date, time window, address, bins, Edit button)\n" +
        "4. History shows your last 5 completed or cancelled cleanings\n\n" +
        "No cleanings yet? Use Schedule a Cleaning at the top of your dashboard.",
      quickReplies: ["Schedule a cleaning", "Reschedule a cleaning", "Go to my dashboard"],
    };
  },

  // Change service address
  (input) => {
    if (
      !hasAny(input, [
        /\bchange\s+(my\s+)?address\b/,
        /\bupdate\s+(my\s+)?address\b/,
        /\bnew\s+address\b/,
        /\bmoved\b/,
        /\bwrong\s+address\b/,
        /\bservice\s+address\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "To update your service address:\n\n" +
        "1. Log in → dashboard\n" +
        "2. Open Schedule a Cleaning (or click Edit on an upcoming cleaning)\n" +
        "3. Update the address fields and save\n\n" +
        "Note: Edit Account Info only changes your name and phone — not your service address or email. " +
        `To change email, contact ${SUPPORT_EMAIL}.`,
      quickReplies: ["Go to my dashboard", "Schedule a cleaning", "Contact support"],
    };
  },

  // Edit account info
  (input) => {
    if (
      !hasAny(input, [
        /\bchange\s+(my\s+)?(name|phone)\b/,
        /\bupdate\s+(my\s+)?(name|phone|profile)\b/,
        /\bedit\s+(my\s+)?(account|profile|info)\b/,
        /\bchange\s+email\b/,
      ])
    ) {
      return null;
    }
    const wantsEmail = /\bemail\b/.test(input);
    return {
      text: wantsEmail
        ? `Email cannot be changed from the dashboard. Contact ${SUPPORT_EMAIL} or call ${SUPPORT_PHONE} and we'll help update it.`
        : "To edit your account info:\n\n1. Log in → dashboard\n2. Expand Account Information\n3. Click Edit Account Info\n4. Update your first name, last name, or phone → Save\n\nService address is updated through Schedule a Cleaning or Edit on an upcoming visit.",
      quickReplies: ["Go to my dashboard", "Change my address", "Contact support"],
    };
  },

  // Customer referral program (not business partner)
  (input) => {
    if (
      !hasAny(input, [
        /\brefer\s+a\s+friend\b/,
        /\breferral\s+(link|code|credit|program|reward)/,
        /\bshare\s+(my\s+)?(link|code)\b/,
        /\b\$10\s+off\b/,
        /\bearn\s+\$10\b/,
        /\bfriend\s+discount\b/,
      ]) ||
      /\bpartner\s+program\b/.test(input)
    ) {
      return null;
    }
    return {
      text:
        "Customer referral program:\n\n" +
        "• Share your link → earn $10 when a friend completes their first paid service\n" +
        "• Your friend gets $10 off at signup\n" +
        "• Up to $10 in referral credits apply automatically on each renewal while you have a balance\n\n" +
        "To get your link:\n" +
        "1. Log in → dashboard\n" +
        "2. Scroll to Referral Rewards\n" +
        "3. Copy your referral link or code and share it\n\n" +
        "Referral codes are created when you first register. Friends can also enter your code at checkout or arrive via your ?ref= link.",
      quickReplies: ["Go to my dashboard", "How do I sign up?", "What are your prices?"],
    };
  },

  // Loyalty & badges
  (input) => {
    if (!hasAny(input, [/\bloyalty\b/, /\bbadge/, /\brewards?\s+level\b/, /\branking\b/, /\bclean\s+freak\b/])) {
      return null;
    }
    return {
      text:
        "Loyalty levels (based on completed cleanings):\n\n" +
        "• Clean Freak — 1 cleaning\n" +
        "• Bin Boss — 5 cleanings\n" +
        "• Sparkle Specialist — 15 cleanings\n" +
        "• Sanitation Superstar — 30 cleanings\n" +
        "• Bin Royalty — 50 cleanings\n\n" +
        "Track your progress in your dashboard under Loyalty & Badges.",
      quickReplies: ["Go to my dashboard", "Schedule a cleaning", "Referral program"],
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
        "Manage billing from your dashboard:\n\n" +
        "1. Log in at binblastco.com/login\n" +
        "2. Your Plan → Manage Billing\n" +
        "3. In the Stripe portal: update your card, view invoices, or cancel\n\n" +
        "Subscriptions renew automatically. Failed payments may pause service until your card is updated — we'll notify you by email and/or SMS. " +
        "Mid-cycle plan changes may include prorated charges or credits.",
      quickReplies: ["Go to my dashboard", "How do I cancel?", "Change my plan"],
    };
  },

  // Login, password, dashboard overview
  (input) => {
    if (
      !hasAny(input, [
        /\blogin\b/,
        /\blog\s*in\b/,
        /\bsign\s*in\b/,
        /\bdashboard\b/,
        /\bmy\s+account\b/,
        /\bpassword\b/,
        /\bforgot\s+password\b/,
        /\breset\s+password\b/,
        /\bwhat\s+can\s+i\s+do\b/,
        /\bwhat\s+does\s+(the\s+)?dashboard\b/,
      ])
    ) {
      return null;
    }
    if (/\b(forgot|reset)\s+password\b/.test(input)) {
      return {
        text:
          "Reset your password:\n\n" +
          "1. Go to binblastco.com/forgot-password\n" +
          "2. Enter your account email → Send Reset Link\n" +
          "3. Check your inbox (link expires in 1 hour; check spam)\n" +
          "4. Set a new password (min 6 characters) on the reset page\n" +
          "5. Log back in at binblastco.com/login",
        quickReplies: ["Go to my dashboard", "Contact support", "How do I sign up?"],
      };
    }
    return {
      text:
        "Customer login & dashboard:\n\n" +
        "1. Go to binblastco.com/login\n" +
        "2. Choose Customer Portal → binblastco.com/customer\n" +
        "3. Sign in with email + password → your dashboard\n\n" +
        "From your dashboard you can:\n" +
        "• Schedule or reschedule cleanings\n" +
        "• View upcoming & past cleanings\n" +
        "• Change plan, Manage Billing, add extra bins\n" +
        "• Edit account info (name, phone)\n" +
        "• Referral rewards & loyalty badges\n\n" +
        "New here? Book from the pricing section first — payment creates your account.",
      quickReplies: ["How do I sign up?", "Schedule a cleaning", "How do I add a bin?"],
    };
  },

  // New customer signup flow
  (input) => {
    if (
      !hasAny(input, [
        /\bhow\s+do\s+i\s+sign\s+up\b/,
        /\bhow\s+to\s+sign\s+up\b/,
        /\bcreate\s+(an\s+)?account\b/,
        /\bnew\s+customer\b/,
        /\bfirst\s+time\b/,
        /\bregister\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "New customer signup:\n\n" +
        "1. Go to the pricing section and choose a plan\n" +
        "2. Complete the booking wizard:\n" +
        "   • Personal info (name, email, phone)\n" +
        "   • Service address\n" +
        "   • Preferred first cleaning date & time window\n" +
        "   • Optional notes (gate code, bin location)\n" +
        "3. Review → Stripe checkout (card payment)\n" +
        "4. After payment, create your password on the registration page (min 6 characters)\n" +
        "5. You're redirected to your dashboard — confirm your first cleaning date\n\n" +
        "Optional: enter a referral code at checkout for $10 off. Payment is required before account creation.",
      quickReplies: ["Yes, show me pricing", "What are your prices?", "What areas do you serve?"],
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
        `Reach our team:\n\n` +
        `Phone: ${SUPPORT_PHONE}\n` +
        `Email: ${SUPPORT_EMAIL}\n` +
        `Hours: ${BUSINESS_HOURS}\n\n` +
        "For billing, cancellations, missed cleanings, or account help — include your name and service address so we can assist quickly. " +
        "Many tasks (schedule, billing, add bins, change plan) can be done instantly from your dashboard.",
      quickReplies: ["Go to my dashboard", "Schedule a cleaning", "How do I cancel?"],
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
        /\bnear\s+me\b/,
        /\bin\s+my\s+(area|city|neighborhood)\b/,
        /\bpeachtree\b/,
        /\bfayetteville\b/,
        /\btyrone\b/,
        /\bsharpsburg\b/,
        /\bsenoia\b/,
        /\bsouth\s+metro\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        `${SERVICE_AREA_SUMMARY}\n\nPrimary service area:\n` +
        PRIMARY_SERVICE_AREAS.map((area) => `• ${area}`).join("\n") +
        `\n\nAdditional Metro Atlanta areas we are expanding into:\n` +
        ADDITIONAL_METRO_ATLANTA_AREAS.map((area) => `• ${area}`).join("\n") +
        "\n\nDon't see your city? Book from the pricing section or contact us — we're expanding.",
      quickReplies: ["Schedule a cleaning", "What are your prices?", "Contact support"],
    };
  },

  // Commercial & HOA quotes
  (input) => {
    if (
      !hasAny(input, [
        /\bcommercial\b/,
        /\bhoa\b/,
        /\bapartment\b/,
        /\brestaurant\b/,
        /\bcustom\s+quote\b/,
        /\bschedule\s+consultation\b/,
        /\bbulk\s+pricing\b/,
        /\bproperty\s+manager\b/,
      ]) ||
      /\bpartner\b/.test(input)
    ) {
      return null;
    }
    return {
      text:
        "Commercial & HOA plans use custom pricing:\n\n" +
        "1. Go to the pricing section\n" +
        "2. Click Commercial & HOA Plans → Schedule Consultation\n" +
        "3. Complete the custom quote wizard (property type, bins, frequency, contact info)\n" +
        "4. Our team follows up with pricing tailored to your property\n\n" +
        `Questions? ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}.`,
      quickReplies: ["What are your prices?", "Contact support", "Partner program"],
    };
  },

  // Business partner program
  (input) => {
    if (
      !hasAny(input, [
        /\bpartner\s+program\b/,
        /\bbecome\s+a\s+partner\b/,
        /\bbusiness\s+partner\b/,
        /\brevenue\s+share\b/,
        /\bapply\s+to\s+partner\b/,
        /\bpartner\s+with\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "Bin Blast partner program (for businesses, not customer referrals):\n\n" +
        "• Earn revenue share on bookings through your partner link\n" +
        "• Get a branded booking link tied to your account\n" +
        "• No upfront costs or monthly fees\n\n" +
        "Learn more: binblastco.com/partners\n" +
        "Apply: binblastco.com/partners/apply (reviewed in 1–2 business days)\n\n" +
        `Questions? ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}.`,
      quickReplies: ["Partner program info", "Referral program", "Contact support"],
    };
  },

  // Pricing
  (input) => {
    if (!hasAny(input, [/\bprice/, /\bcost\b/, /\bhow\s+much\b/, /\bpricing\b/, /\bplan\b/, /\brate\b/])) {
      return null;
    }
    return pricingResponse();
  },

  // Schedule / book cleaning
  (input) => {
    if (
      !hasAny(input, [
        /\bbook\b/,
        /\bschedule\b/,
        /\bget\s+started\b/,
        /\bstart\s+service\b/,
      ])
    ) {
      return null;
    }
    return scheduleCleaningResponse();
  },

  // Availability
  (input) => {
    if (
      !hasAny(input, [
        /\bavailab/,
        /\btrash\s+day\b/,
        /\bwhat\s+day\b/,
        /\bwhen\s+can\s+you\b/,
        /\bhow\s+soon\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "New customers are typically scheduled within 2–3 business days. Your date depends on your location and trash day.\n\n" +
        "During booking you pick your preferred first cleaning date and time window. Subscribers are auto-scheduled each cycle — view upcoming visits in your dashboard.\n\n" +
        "Cleaning takes about 10–15 minutes per bin. You don't need to be home — just leave bins curbside.",
      quickReplies: ["Schedule a cleaning", "Go to my dashboard", "What are your prices?"],
    };
  },

  // Plan changes
  (input) => {
    if (
      !hasAny(input, [
        /\bchange\s+plan\b/,
        /\bchange\s+my\s+plan\b/,
        /\bupgrade\b/,
        /\bdowngrade\b/,
        /\bswitch\s+plan\b/,
        /\bchange\s+subscription\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "To change your plan:\n\n" +
        "1. Log in → dashboard → Your Plan\n" +
        "2. Click Change Plan\n" +
        "3. Select your new plan → Review Change\n" +
        "4. Confirm — prorated charges or credits may apply mid-cycle; unused cleanings may roll over\n\n" +
        "You can also visit binblastco.com/subscription when logged in. Commercial plans require a custom quote.",
      quickReplies: ["What are your prices?", "Go to my dashboard", "Manage billing"],
    };
  },

  // Service issues & missed cleanings
  (input) => {
    if (
      !hasAny(input, [
        /\bmissed\b/,
        /\bskip\b/,
        /\bcomplaint\b/,
        /\bnot\s+cleaned\b/,
        /\bunsatisfactory\b/,
        /\bdidn'?t\s+come\b/,
        /\bno\s+show\b/,
        /\bsmell\b/,
        /\bstill\s+dirty\b/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "Sorry about that — let's get it fixed.\n\n" +
        "If we missed a cleaning due to our operations (not inaccessible bins, locked gates, or wrong address), contact us within 7 days and we'll reschedule or credit that visit.\n\n" +
        "Before your next visit, make sure:\n" +
        "• Bins are at the curb during your scheduled window\n" +
        "• Gate codes and bin location are in special instructions\n" +
        "• Your dashboard address is correct\n\n" +
        `Contact ${SUPPORT_PHONE} or ${SUPPORT_EMAIL} with your name and service address.`,
      quickReplies: ["Contact support", "Reschedule a cleaning", "Go to my dashboard"],
    };
  },

  // Cleaning prep & FAQ
  (input) => {
    if (
      !hasAny(input, [
        /\b(be\s+home|need\s+to\s+be\s+home)\b/,
        /\bleave\s+(bins|cans)\b/,
        /\bcurb\b/,
        /\bhow\s+long\b/,
        /\bproducts?\b/,
        /\beco[\s-]?friendly\b/,
        /\bprep\b/,
        /\bprepare\b/,
        /\bfaq\b/,
        /\bempty\s+(bins|cans)\b/,
        /\bgate\s+code\b/,
        /\bspecial\s+instruction/,
      ])
    ) {
      return null;
    }
    return {
      text:
        "Cleaning day prep & FAQ:\n\n" +
        "• You don't need to be home — leave bins at the curb or driveway during your scheduled window\n" +
        "• Empty bins clean faster\n" +
        "• Cleaning takes ~10–15 minutes per bin\n" +
        "• We use eco-friendly, biodegradable, EPA-approved products\n" +
        "• Trash, recycling, and compost bins are all fine — note your bin type when booking\n" +
        "• Add gate codes, bin location, or access notes in special instructions\n" +
        "• Cancel/reschedule: locked within 24 hours of your cleaning in the dashboard (plan upgrades allowed until 4 hours before)",
      quickReplies: ["Schedule a cleaning", "Reschedule a cleaning", "Contact support"],
    };
  },

  // Bin types
  (input) => {
    if (!hasAny(input, [/\bwhat\s+(kind|type)\s+of\s+bins\b/, /\bbin\s+types?\b/, /\brecycl/, /\bcompost\b/])) {
      return null;
    }
    return {
      text:
        "We clean residential curbside trash, recycling, and compost/organics bins. Standard roll-out bins on trash day are what we service.\n\n" +
        "Each plan includes 1 bin; add more for $10/bin per visit from Your Plan on your dashboard. Commercial and HOA properties get custom quotes.",
      quickReplies: ["Add a bin", "Schedule a cleaning", "Commercial plans"],
    };
  },

  // How it works — service overview only, NOT "how to [action]"
  (input) => {
    if (hasHowToAction(input)) return null;
    if (
      hasAny(input, [
        /\bcancel/,
        /\bbilling\b/,
        /\bpayment\b/,
        /\blogin\b/,
        /\blog\s*in\b/,
        /\bpassword\b/,
        /\brefund\b/,
        /\badd\b/,
        /\bextra\b/,
        /\baddress\b/,
        /\breschedule\b/,
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
        "1. Pick a plan and book online (or log in to your dashboard if you're already a customer)\n" +
        "2. On your trash day, leave bins curbside\n" +
        "3. Our truck arrives — high-pressure wash, sanitize, and deodorize\n" +
        "4. We place bins back fresh and clean\n" +
        "5. Subscribers are auto-scheduled each cycle — track everything in your dashboard\n\n" +
        "Ready to get started?",
      quickReplies: ["How do I sign up?", "What are your prices?", "Go to my dashboard"],
    };
  },

  // Legal
  (input) => {
    if (!hasAny(input, [/\bterms\b/, /\bprivacy\b/, /\blegal\b/, /\bdata\s+delet/])) return null;
    return {
      text:
        "Our policies:\n\n" +
        "• Terms of Service: binblastco.com/terms\n" +
        "• Privacy Policy: binblastco.com/privacy\n" +
        "• Cancellation & Refunds: binblastco.com/cancellation\n\n" +
        `Privacy requests or questions: ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}.`,
      quickReplies: ["View cancellation policy", "Contact support", "Go to my dashboard"],
    };
  },

  // Careers / jobs
  (input) => {
    if (!hasAny(input, [/\bcareer/, /\bjob\b/, /\bhiring\b/, /\bwork\s+for\b/, /\bapply\b.*\b(?:job|work|bin)/])) return null;
    return {
      text:
        "We're hiring Bin Blasters to clean bins across Metro Atlanta.\n\n" +
        "• Apply to become a Bin Blaster on assigned routes\n" +
        "• View corporate careers openings on our careers page\n\n" +
        "Residential pay starts at $8 for the first bin and $2 for each additional bin at the same stop (admin-configurable).\n\n" +
        "View openings: binblastco.com/careers\n" +
        "Apply: binblastco.com/employee/register",
      quickReplies: ["View careers page", "Apply now", "Employee sign in"],
    };
  },

  // Hours
  (input) => {
    if (!hasAny(input, [/\bhours\b/, /\bopen\b/, /\bclosed\b/, /\bwhen\s+are\s+you\b/])) return null;
    return {
      text: `Support hours: ${BUSINESS_HOURS}\n\nBook online anytime. For urgent service issues, call ${SUPPORT_PHONE}.`,
      quickReplies: ["Contact support", "Schedule a cleaning", "Go to my dashboard"],
    };
  },

  // "How to..." catch-all for unmatched action questions
  (input) => {
    if (!hasHowToAction(input)) return null;

    if (/\b(bin|bins)\b/.test(input)) return addExtraBinResponse();
    if (/\b(cancel|unsubscribe|stop)\b/.test(input)) return null;
    if (/\b(bill|pay|card|invoice)\b/.test(input)) {
      return {
        text:
          "Manage billing from your dashboard:\n\n" +
          "1. Log in → Your Plan → Manage Billing\n" +
          "2. Update card, view invoices, or cancel in the Stripe portal\n\n" +
          `Help: ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}.`,
        quickReplies: ["Go to my dashboard", "How do I cancel?", "Contact support"],
      };
    }
    if (/\b(schedule|book|appointment)\b/.test(input)) return scheduleCleaningResponse();
    if (/\b(reschedule|change\s+date)\b/.test(input)) return rescheduleResponse();
    if (/\b(address|move)\b/.test(input)) return null;
    if (/\b(login|password|account|dashboard)\b/.test(input)) return null;

    return {
      text:
        "I can walk you through anything on the site. Here are common how-to's:\n\n" +
        "• Sign up / book → pricing section → booking wizard → checkout\n" +
        "• Log in → binblastco.com/login (Customer Portal)\n" +
        "• Schedule or reschedule → dashboard → Schedule a Cleaning\n" +
        "• Add extra bins → dashboard → Your Plan → Add Extra Bins ($10 each)\n" +
        "• Change plan → dashboard → Your Plan → Change Plan\n" +
        "• Billing / cancel → dashboard → Manage Billing\n" +
        "• Refer a friend → dashboard → Referral Rewards\n" +
        "• Update address → schedule form or Edit on upcoming cleaning\n\n" +
        "Tell me specifically what you're trying to do and I'll give you the exact steps.",
      quickReplies: ["How do I add a bin?", "Go to my dashboard", "How do I sign up?", "Contact support"],
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
      "I'm your Bin Blast Co. site assistant — I can help with anything on the website:\n\n" +
      "Booking & signup · Dashboard · Schedule/reschedule · Add bins · Change plans · Billing & cancel · Referrals · Service areas · Commercial quotes · Partner program\n\n" +
      `Still stuck? Our team is at ${SUPPORT_PHONE} or ${SUPPORT_EMAIL} (${BUSINESS_HOURS})`,
    quickReplies: [
      "How do I sign up?",
      "How do I add a bin?",
      "Go to my dashboard",
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
  if (lower.includes("partner program") || lower === "partner program info") {
    return { type: "navigate", href: "/partners" };
  }
  if (lower.includes("faq")) {
    return { type: "scroll", targetId: "faq" };
  }
  if (lower.includes("call")) {
    return { type: "call", tel: SUPPORT_PHONE_TEL };
  }
  if (lower === "contact support") {
    return { type: "message", text: "How do I contact support?" };
  }
  if (lower.includes("billing") || lower === "manage billing") {
    return { type: "message", text: "How do I manage billing?" };
  }
  if (lower.includes("commercial")) {
    return { type: "message", text: "Tell me about commercial plans" };
  }
  if (lower.includes("areas") || lower.includes("serve")) {
    return { type: "message", text: "What areas do you serve?" };
  }
  if (lower.includes("add a bin") || lower === "add a bin") {
    return { type: "message", text: "How do I add a bin?" };
  }
  if (lower.includes("reschedule")) {
    return { type: "message", text: "How do I reschedule a cleaning?" };
  }
  if (lower.includes("view my cleanings")) {
    return { type: "message", text: "When is my next cleaning?" };
  }
  if (lower.includes("change my plan") || lower === "change my plan") {
    return { type: "message", text: "How do I change my plan?" };
  }
  if (lower.includes("change my address")) {
    return { type: "message", text: "How do I change my address?" };
  }
  if (lower.includes("referral")) {
    return { type: "message", text: "How does the referral program work?" };
  }
  if (lower.includes("careers")) {
    return { type: "navigate", href: "/careers" };
  }
  if (lower.includes("apply now") || lower.includes("apply for")) {
    return { type: "navigate", href: "/employee/register" };
  }
  if (lower.includes("employee sign in")) {
    return { type: "navigate", href: "/employee" };
  }
  if (lower.includes("sign up")) {
    return { type: "message", text: "How do I sign up?" };
  }

  return { type: "message", text: reply };
}
