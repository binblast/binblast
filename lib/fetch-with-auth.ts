type FetchWithAuthOptions = RequestInit & {
  requireAuth?: boolean;
};

export async function fetchWithAuth(
  url: string,
  options: FetchWithAuthOptions = {}
): Promise<Response> {
  const { requireAuth = true, headers, ...rest } = options;
  const nextHeaders = new Headers(headers);

  try {
    const { getAuthInstance } = await import("@/lib/firebase");
    const auth = await getAuthInstance();
    const user = auth?.currentUser;

    if (user) {
      const token = await user.getIdToken();
      nextHeaders.set("Authorization", `Bearer ${token}`);
    } else if (requireAuth) {
      console.warn("[fetchWithAuth] No authenticated user for request:", url);
    }
  } catch (error) {
    console.error("[fetchWithAuth] Failed to attach auth token:", error);
  }

  return fetch(url, {
    ...rest,
    headers: nextHeaders,
  });
}
