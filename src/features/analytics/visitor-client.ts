export const VISIT_SESSION_KEY = "wimifarma_visit_session_id";

type VisitorBrowser = Pick<Window, "localStorage" | "crypto" | "navigator">;

function readOrCreateIdentity(browser: VisitorBrowser) {
  try {
    const stored = browser.localStorage.getItem(VISIT_SESSION_KEY);
    if (stored && /^[a-zA-Z0-9_-]{12,80}$/.test(stored)) return stored;
    const id = browser.crypto.randomUUID();
    browser.localStorage.setItem(VISIT_SESSION_KEY, id);
    return id;
  } catch {
    // The server cookie identifies this browser when local storage is unavailable.
    return undefined;
  }
}

export async function getVisitSessionId(browser: VisitorBrowser) {
  if (browser.navigator.locks) {
    return browser.navigator.locks.request(VISIT_SESSION_KEY, () => readOrCreateIdentity(browser));
  }
  return readOrCreateIdentity(browser);
}

export function rememberVisitSessionId(browser: VisitorBrowser, id: unknown) {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{12,80}$/.test(id)) return;
  try {
    browser.localStorage.setItem(VISIT_SESSION_KEY, id);
  } catch {
    // The signed cookie remains authoritative if storage is blocked.
  }
}
