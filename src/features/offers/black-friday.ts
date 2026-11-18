/** Disable this one flag to remove both the labels and the announcement. */
export const blackFridayCampaign = {
  enabled: true,
  startsAt: Date.parse("2026-11-18T00:00:00-03:00"),
  endsAt: Date.parse("2026-12-01T00:00:00-03:00"),
} as const;

export function isBlackFridayActive(now = Date.now(), enabled: boolean = blackFridayCampaign.enabled) {
  return enabled && now >= blackFridayCampaign.startsAt && now < blackFridayCampaign.endsAt;
}
