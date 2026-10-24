import assert from "node:assert/strict";
import test from "node:test";
import { getOnlineVisitorSummary, ONLINE_WINDOW_SECONDS } from "./online-presence";

test("online counts one stored browser within the visibility window, excluding expired and future timestamps", async () => {
  const now = new Date("2026-10-24T12:00:00Z");
  let query: unknown;
  const browsers = [now, new Date(now.getTime() - 119_000), new Date(now.getTime() - 121_000), new Date(now.getTime() + 1)];
  const result = await getOnlineVisitorSummary({ siteVisit: { count: async (args) => {
    query = args;
    return browsers.filter(date => date >= args.where.lastSeenAt.gte && date <= args.where.lastSeenAt.lte).length;
  } } }, now);
  assert.deepEqual(query, { where: { lastSeenAt: { gte: new Date("2026-10-24T11:58:00Z"), lte: now } } });
  assert.deepEqual(result, { online: 2, windowSeconds: ONLINE_WINDOW_SECONDS, measuredAt: now.toISOString() });
});

test("database failure is not reported as zero visitors", async () => {
  await assert.rejects(getOnlineVisitorSummary({ siteVisit: { count: async () => { throw new Error("unavailable"); } } }), /unavailable/);
});
