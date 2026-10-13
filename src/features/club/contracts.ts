export type ClubSummary = {
  member: boolean;
  joinedAt: string | null;
  balancePoints: number;
  pendingPoints: number;
  lifetimeEarnedPoints: number;
  lifetimeRedeemedPoints: number;
  transactions: Array<{ id: string; type: string; amountPoints: number; description: string; createdAt: string }>;
};

export function emptyClubSummary(): ClubSummary {
  return { member: false, joinedAt: null, balancePoints: 0, pendingPoints: 0, lifetimeEarnedPoints: 0, lifetimeRedeemedPoints: 0, transactions: [] };
}
