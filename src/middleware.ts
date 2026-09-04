import { NextRequest, NextResponse } from "next/server";

type RateLimitRule = {
  limit: number;
  pathname: RegExp;
  windowMs: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const MUTATION_METHODS = new Set(["DELETE", "PATCH", "POST", "PUT"]);
const MAX_RATE_LIMIT_ENTRIES = 10_000;
const rateLimitStore = new Map<string, RateLimitEntry>();
const rateLimitRules: RateLimitRule[] = [
  {
    limit: 12,
    pathname: /^\/api\/auth\/callback\/credentials$/,
    windowMs: 15 * 60 * 1000,
  },
  {
    limit: 5,
    pathname: /^\/api\/minha-conta\/register$/,
    windowMs: 15 * 60 * 1000,
  },
  { limit: 20, pathname: /^\/api\/miauby$/, windowMs: 60 * 1000 },
  { limit: 10, pathname: /^\/api\/pedidos$/, windowMs: 15 * 60 * 1000 },
  { limit: 5, pathname: /^\/api\/produtos\/[^/]+\/avaliacoes$/, windowMs: 15 * 60 * 1000 },
  { limit: 8, pathname: /^\/api\/produtos\/sugestoes$/, windowMs: 60 * 1000 },
  { limit: 120, pathname: /^\/api\/visitas$/, windowMs: 60 * 1000 },
  { limit: 90, pathname: /^\/api\//, windowMs: 60 * 1000 },
];

function clientIp(request: NextRequest) {
  return (
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function requestHost(request: NextRequest) {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host")?.trim() ||
    request.nextUrl.host
  ).toLowerCase();
}

function isAllowedOrigin(request: NextRequest) {
  if (!MUTATION_METHODS.has(request.method)) {
    return true;
  }

  if (request.nextUrl.pathname.startsWith("/api/auth/")) {
    return true;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host.toLowerCase() === requestHost(request);
  } catch {
    return false;
  }
}

function matchingRateLimit(pathname: string) {
  return rateLimitRules.find((rule) => rule.pathname.test(pathname));
}

function pruneExpiredEntries(now: number) {
  if (rateLimitStore.size < 5_000) {
    return;
  }

  for (const [key, entry] of rateLimitStore) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  while (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
    const oldestKey = rateLimitStore.keys().next().value;

    if (!oldestKey) {
      break;
    }

    rateLimitStore.delete(oldestKey);
  }
}

function enforceRateLimit(request: NextRequest) {
  const rule = matchingRateLimit(request.nextUrl.pathname);
  if (!rule) {
    return null;
  }

  const now = Date.now();
  pruneExpiredEntries(now);

  const key = `${request.nextUrl.pathname}:${clientIp(request)}`;
  const current = rateLimitStore.get(key);
  const entry =
    !current || current.resetAt <= now
      ? { count: 1, resetAt: now + rule.windowMs }
      : { ...current, count: current.count + 1 };

  rateLimitStore.set(key, entry);

  if (entry.count <= rule.limit) {
    return null;
  }

  const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
  return NextResponse.json(
    { error: "Muitas solicitacoes. Aguarde um pouco e tente novamente." },
    {
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(retryAfter),
      },
      status: 429,
    },
  );
}

export function middleware(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { error: "Origem da solicitacao nao autorizada." },
      { headers: { "Cache-Control": "no-store" }, status: 403 },
    );
  }

  return enforceRateLimit(request) ?? NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
