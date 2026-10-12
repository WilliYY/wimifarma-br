export const PICKUP_TIME_ZONE = "America/Sao_Paulo";
export function synchronizedPickupTime(timestamp: string, roundTripMs: number) {
  const time = Date.parse(timestamp);
  if (!Number.isFinite(time) || !Number.isFinite(roundTripMs) || roundTripMs < 0) throw new RangeError("Invalid pickup clock");
  return time + roundTripMs / 2;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const OPENING = (7 * 60 + 30) * MINUTE;
const CLOSING = (18 * 60 + 30) * MINUTE;
const PREPARATION = 30 * MINUTE;

const localParts = new Intl.DateTimeFormat("en-CA", {
  timeZone: PICKUP_TIME_ZONE, calendar: "iso8601", numberingSystem: "latn",
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
});

// UTC is used only as a calendar representation of the store's local date.
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

export function getPickupEstimate(now: Date) {
  const localNow = localCalendarTime(now);
  const midnight = Math.floor(localNow / DAY) * DAY;
  const opensAt = midnight + OPENING;
  const closesAt = midnight + CLOSING;
  const openNow = localNow >= opensAt && localNow < closesAt;
  let readyLocal: number;
  if (localNow < opensAt) readyLocal = opensAt + PREPARATION;
  else if (localNow >= closesAt) readyLocal = opensAt + DAY + PREPARATION;
  else {
    const remainingToday = closesAt - localNow;
    readyLocal = remainingToday >= PREPARATION
      ? localNow + PREPARATION
      : opensAt + DAY + PREPARATION - remainingToday;
  }
  const readyAt = fromLocalCalendarTime(readyLocal);
  return {
    readyAt, openNow,
    readyToday: Math.floor(readyLocal / DAY) === Math.floor(localNow / DAY),
    waitMinutes: Math.ceil((readyAt.getTime() - now.getTime()) / MINUTE),
  };
}

export function pickupTimeLabel(readyAt: Date) {
  // Round up so the displayed minute never precedes the calculated deadline.
  return new Intl.DateTimeFormat("pt-BR", { timeZone: PICKUP_TIME_ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .format(new Date(Math.ceil(readyAt.getTime() / MINUTE) * MINUTE));
}

export function pickupWaitLabel(minutes: number) {
  if (minutes < 60) return `${minutes} minutos`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return `${hours}h${remaining ? ` ${remaining}min` : ""}`;
}
