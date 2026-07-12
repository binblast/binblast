import { getQuoApiKey } from "@/lib/quo-auth";

const QUO_API_BASE = "https://api.quo.com";

type QuoRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  apiVersion?: string;
};

export async function quoApiRequest<T = unknown>(
  path: string,
  options: QuoRequestOptions = {}
): Promise<T> {
  const apiKey = getQuoApiKey();
  if (!apiKey) {
    throw new Error("QUO_API_KEY is not configured");
  }

  const response = await fetch(`${QUO_API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      "Quo-Api-Version": options.apiVersion || "2026-03-30",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof data === "object" && data && "error" in data
        ? String((data as { error?: unknown }).error)
        : `Quo API request failed (${response.status})`;
    throw new Error(message);
  }

  return data as T;
}

export async function sendQuoSms(input: {
  fromPhoneNumberId: string;
  to: string;
  content: string;
}) {
  return quoApiRequest("/messages", {
    method: "POST",
    body: {
      from: input.fromPhoneNumberId,
      to: [input.to],
      content: input.content,
    },
  });
}

export async function listQuoPhoneNumbers() {
  return quoApiRequest("/phone-numbers");
}

export async function upsertQuoContact(input: {
  firstName?: string;
  lastName?: string;
  phone: string;
  email?: string;
  company?: string;
  externalId?: string;
}) {
  return quoApiRequest("/contacts", {
    method: "POST",
    body: {
      defaultFields: {
        firstName: input.firstName || "",
        lastName: input.lastName || "",
        company: input.company || "Bin Blast Co.",
        emails: input.email ? [{ name: "primary", value: input.email }] : [],
        phoneNumbers: [{ name: "primary", value: input.phone }],
      },
      externalId: input.externalId,
      source: "binblast-platform",
    },
  });
}
