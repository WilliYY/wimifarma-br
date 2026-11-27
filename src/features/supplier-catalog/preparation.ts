const TIME_ZONE = "America/Sao_Paulo";
const DAY = 24 * 60 * 60_000;
const CUTOFF = 17 * 60 * 60_000;
const CLOSING = (18 * 60 + 30) * 60_000;

const localParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE, calendar: "iso8601", numberingSystem: "latn",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

// UTC represents the store's local calendar, independently of the server timezone.
function localCalendarTime(date: Date) {
  const parts = Object.fromEntries(localParts.formatToParts(date).map(part => [part.type, part.value]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second), date.getUTCMilliseconds());
}

function fromLocalCalendarTime(localTime: number) {
  let instant = localTime;
  for (let attempt = 0; attempt < 3; attempt++) {
    const correction = localTime - localCalendarTime(new Date(instant));
    if (correction === 0) break;
    instant += correction;
  }
  return new Date(instant);
}

/**
 * The pharmacy operates daily from 07:30 to 18:30. Supplier receipt and checking
 * share one total preparation day, on the next Tuesday–Saturday receipt date
 * after the effective confirmation date. Confirmations at or after 17:00 move
 * that date forward. Purchases remain available after this operational cutoff.
 * Holidays are not excluded until an authoritative calendar is integrated.
 */
export function getSupplierPreparationEstimate(now: Date): {
  readyAt: Date;
  preparationDays: number;
  readyDateLabel: string;
} {
  const localNow = localCalendarTime(now);
  const today = Math.floor(localNow / DAY) * DAY;
  const effectiveDate = localNow >= today + CUTOFF ? today + DAY : today;
  let readyDate = effectiveDate + DAY;
  while (new Date(readyDate).getUTCDay() < 2) readyDate += DAY;

  const readyAt = fromLocalCalendarTime(readyDate + CLOSING);
  return {
    readyAt,
    preparationDays: (readyDate - today) / DAY,
    readyDateLabel: new Intl.DateTimeFormat("pt-BR", {
      timeZone: TIME_ZONE, day: "2-digit", month: "2-digit",
    }).format(readyAt),
  };
}

/** Freeze preparation only on the first payment confirmation, under the order lock. */
export function getSupplierPreparationOnPayment(order: {
  paymentStatus: string;
  items: ReadonlyArray<{ inventorySource?: string | null }>;
}, confirmedAt: Date): { preparationReadyAt?: Date; preparationDays?: number } {
  if (order.paymentStatus !== "PENDING" || !order.items.some(item => item.inventorySource === "DISTRIBUTOR")) return {};
  const estimate = getSupplierPreparationEstimate(confirmedAt);
  return { preparationReadyAt: estimate.readyAt, preparationDays: estimate.preparationDays };
}
