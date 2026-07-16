export async function startExtraCleaningCheckout(
  userId: string,
  options?: { applyCredit?: boolean }
): Promise<{ url?: string; error?: string }> {
  const response = await fetch("/api/stripe/one-time-cleaning", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      applyCredit: options?.applyCredit ?? false,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { error: data.error || "Failed to start checkout" };
  }

  if (data.url) {
    window.location.href = data.url;
    return { url: data.url };
  }

  return { error: "Checkout URL was not returned" };
}
