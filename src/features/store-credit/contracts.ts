export type ItemShortageStatus = "PROPOSED" | "CREDIT_ACCEPTED" | "REFUND_REQUESTED" | "VOIDED";
export type ItemShortageCreditState = "NONE" | "ISSUED" | "REVIEW" | "REVERSED";

export type ItemShortageSummary = {
  id: string;
  orderItemId: string;
  productName: string;
  quantity: number;
  cashPaidCents: number;
  cashbackReturnCents: number;
  wimicoinsReturnPoints: number;
  storeCreditReturnCents: number;
  status: ItemShortageStatus;
  creditState: ItemShortageCreditState;
  version: number;
  createdAt: string;
  decidedAt: string | null;
};

export type StoreCreditSummary = {
  balanceCents: number;
  availableCents: number;
  reviewRequired: boolean;
  reservedCents: number;
  transactions: {
    id: string;
    kind: "ISSUE" | "RESERVE" | "RETURN" | "REVERSAL";
    amountCents: number;
    description: string;
    createdAt: string;
  }[];
};

export const SHORTAGE_CREDIT_CONSENT_VERSION = "shortage-credit-v1";
