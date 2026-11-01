/** Read the raw flag before parsers can strip it. Malformed declarations fail closed. */
export function isNotifyOnlyPendingLogistics(profile: unknown): boolean {
  return profile !== null && typeof profile === "object" &&
    Object.hasOwn(profile, "notifyOnlyPendingLogistics") &&
    (profile as Record<string, unknown>).notifyOnlyPendingLogistics !== false;
}

/** Generic product edits may update a draft, but only Freight ADMIN can release its hold. */
export function preserveNotifyOnlyPendingLogistics(current: unknown, next: unknown): unknown {
  if (!isNotifyOnlyPendingLogistics(current) || next === undefined) return next;
  return { ...(next !== null && typeof next === "object" && !Array.isArray(next) ? next : {}), notifyOnlyPendingLogistics: true };
}
