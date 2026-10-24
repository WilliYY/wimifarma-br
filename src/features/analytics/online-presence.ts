export const ONLINE_WINDOW_SECONDS = 120;
export const VISIT_HEARTBEAT_MS = 30_000;

type VisitorCounter = {
  siteVisit: {
    count: (args: { where: { lastSeenAt: { gte: Date; lte: Date } } }) => PromiseLike<number>;
  };
};

export async function getOnlineVisitorSummary(prisma: VisitorCounter, now = new Date()) {
  const online = await prisma.siteVisit.count({
    where: { lastSeenAt: { gte: new Date(now.getTime() - ONLINE_WINDOW_SECONDS * 1000), lte: now } },
  });
  return { online, windowSeconds: ONLINE_WINDOW_SECONDS, measuredAt: now.toISOString() };
}
