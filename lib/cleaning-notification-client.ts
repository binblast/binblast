export function requestCleaningSmsNotification(payload: {
  userId: string;
  scheduledDate: string;
  scheduledTime: string;
  addressLine1: string;
  city: string;
  state: string;
}): void {
  fetch("/api/customer/notify-cleaning-scheduled", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.error("[Cleaning Notification] Failed to request SMS:", error);
  });
}
