import { createHmac, timingSafeEqual } from "node:crypto";

export const VISITOR_COOKIE = "wimi-visitor";
export const VISITOR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export function validVisitorId(value: unknown): value is string {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{12,80}$/.test(value);
}

const signature = (value: string, secret: string) =>
  createHmac("sha256", secret).update(`wimifarma-visitor:${value}`).digest("hex");

export function signVisitorId(id: string, secret: string, now = Date.now()) {
  const value = `${id}.${now}`;
  return `${value}.${signature(value, secret)}`;
}

export function readVisitorId(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || !secret || token.length > 160) return null;
  const [id, timestamp, supplied, extra] = token.split(".");
  if (!validVisitorId(id) || !/^\d{13}$/.test(timestamp ?? "") || !/^[a-f0-9]{64}$/.test(supplied ?? "") || extra !== undefined) return null;
  const age = now - Number(timestamp);
  if (age < 0 || age > VISITOR_COOKIE_MAX_AGE * 1000) return null;
  const expected = signature(`${id}.${timestamp}`, secret);
  return timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)) ? id : null;
}
