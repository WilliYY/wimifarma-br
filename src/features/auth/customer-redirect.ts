const DEFAULT_CUSTOMER_DESTINATION = "/minha-conta";
const LOCAL_ORIGIN = "https://wimifarma.local";

export function getSafeCustomerCallbackUrl(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/")) {
    return DEFAULT_CUSTOMER_DESTINATION;
  }

  try {
    const destination = new URL(value, LOCAL_ORIGIN);
    const isRestrictedPath = ["/admin", "/api", "/login"].some(
      (path) =>
        destination.pathname === path || destination.pathname.startsWith(`${path}/`),
    );

    if (destination.origin !== LOCAL_ORIGIN || isRestrictedPath) {
      return DEFAULT_CUSTOMER_DESTINATION;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_CUSTOMER_DESTINATION;
  }
}
