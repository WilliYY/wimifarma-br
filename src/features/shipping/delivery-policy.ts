export const FREE_SHIPPING_THRESHOLD_CENTS = 9990;

export function localDeliveryCity(postalCode: string) {
  const code = postalCode.replace(/\D/g, "");
  if (code.length !== 8) return null;
  if (Number(code) >= 87525000 && Number(code) <= 87527999) return "Ivaté";
  // Verified generic CEP of Douradina/PR. Do not infer rural coverage from a city name.
  if (code === "87485000") return "Douradina";
  return null;
}

export function isLocalDeliveryAddress(address?: { postalCode: string; city: string; state: string }) {
  if (!address || address.state.toUpperCase() !== "PR") return false;
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const city = localDeliveryCity(address.postalCode);
  return Boolean(city && normalize(address.city) === normalize(city));
}

export function customerShippingFee(carrierPriceCents: number, subtotalCents: number, discountCents: number) {
  return subtotalCents - discountCents >= FREE_SHIPPING_THRESHOLD_CENTS ? 0 : carrierPriceCents;
}
