type CartIdentityItem = {
  id: string;
  quantity: number;
  unitPriceCents: number;
  requiresPrescription: boolean;
  isPopularPharmacy: boolean;
};

export function cartIdentity(items: readonly CartIdentityItem[]) {
  return JSON.stringify(items.map(item => [item.id, item.quantity, item.unitPriceCents, item.requiresPrescription, item.isPopularPharmacy]));
}
