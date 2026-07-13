import { sendQuoSms, listQuoPhoneNumbers } from "@/lib/quo-client";

export interface BookingConfirmationInput {
  phone?: string;
  firstName?: string;
  scheduledDate: string;
  scheduledTime: string;
  addressLine1: string;
  city: string;
  state: string;
}

function formatPhoneE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (phone.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return null;
}

async function resolveQuoFromPhoneNumberId(): Promise<string | null> {
  const configured = process.env.QUO_FROM_PHONE_NUMBER_ID?.trim();
  if (configured) return configured;

  try {
    const response = (await listQuoPhoneNumbers()) as {
      data?: Array<{ id?: string }>;
    };
    const first = response?.data?.[0]?.id;
    return first || null;
  } catch (error) {
    console.error("[Customer Notifications] Failed to list Quo phone numbers:", error);
    return null;
  }
}

export async function sendBookingConfirmationSms(
  input: BookingConfirmationInput
): Promise<{ sent: boolean; reason?: string }> {
  if (!input.phone?.trim()) {
    return { sent: false, reason: "no_phone" };
  }

  const to = formatPhoneE164(input.phone);
  if (!to) {
    return { sent: false, reason: "invalid_phone" };
  }

  const fromPhoneNumberId = await resolveQuoFromPhoneNumberId();
  if (!fromPhoneNumberId) {
    return { sent: false, reason: "quo_not_configured" };
  }

  const dateFormatted = new Date(input.scheduledDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const greeting = input.firstName?.trim() ? `Hi ${input.firstName.trim()}, ` : "";
  const content = `${greeting}your Bin Blast cleaning is scheduled for ${dateFormatted} at ${input.scheduledTime}. Address: ${input.addressLine1}, ${input.city}, ${input.state}. Place bins curbside before service. Reply with questions or call (470) 305-0823.`;

  try {
    await sendQuoSms({ fromPhoneNumberId, to, content });
    return { sent: true };
  } catch (error: any) {
    console.error("[Customer Notifications] SMS send failed:", error);
    return { sent: false, reason: error.message || "send_failed" };
  }
}
