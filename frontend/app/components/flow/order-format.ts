/** Dates on the wire are UTC instants. Formatting pins the zone so the server
 *  render and the client render always agree. */
const DAY = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

export function placedOn(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : DAY.format(date);
}

export function placedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${DAY.format(date)} · ${CLOCK.format(date)} UTC`;
}
