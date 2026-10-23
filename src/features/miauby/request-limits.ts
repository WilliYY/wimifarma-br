type Window = { count: number; expires: number };
type Visitor = { minute: Window; hour: Window };
const visitors = new Map<string, Visitor>();
let requests: Window = { count: 0, expires: 0 };

function windowAt(window: Window | undefined, now: number, duration: number): Window {
  return !window || window.expires <= now ? { count: 0, expires: now + duration } : window;
}

export function limitMiaubyRequest(request: Request) {
  const now = Date.now();
  // Production's trusted reverse proxy overwrites x-real-ip. No cookie-selected keys.
  const ip = (request.headers.get("x-real-ip") || "unknown").trim().slice(0, 64);
  for (const [key, value] of visitors) if (value.hour.expires <= now) visitors.delete(key);
  const current = visitors.get(ip);
  if (!current && visitors.size >= 2000) return 60;
  const minute = windowAt(current?.minute, now, 60_000);
  const hour = windowAt(current?.hour, now, 3_600_000);
  requests = windowAt(requests, now, 60_000);
  const exhausted = minute.count >= 10 ? minute : hour.count >= 100 ? hour : requests.count >= 120 ? requests : null;
  if (exhausted) return Math.max(1, Math.ceil((exhausted.expires - now) / 1000));
  minute.count++; hour.count++; requests.count++;
  visitors.set(ip, { minute, hour });
  return null;
}
