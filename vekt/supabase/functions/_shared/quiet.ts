// Quiet hours for texts: never text a recipient before the start hour or
// after the end hour in their own time zone. The zone comes from the
// recruit's state; unknown states use US Eastern, the strictest guess for
// most recipients. Plain TypeScript so it is unit-tested under Node.

const ZONES: Record<string, string> = {
  AL: "America/Chicago", AK: "America/Anchorage", AZ: "America/Phoenix", AR: "America/Chicago", CA: "America/Los_Angeles",
  CO: "America/Denver", CT: "America/New_York", DE: "America/New_York", DC: "America/New_York", FL: "America/New_York",
  GA: "America/New_York", HI: "Pacific/Honolulu", ID: "America/Boise", IL: "America/Chicago", IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago", KS: "America/Chicago", KY: "America/New_York", LA: "America/Chicago", ME: "America/New_York",
  MD: "America/New_York", MA: "America/New_York", MI: "America/Detroit", MN: "America/Chicago", MS: "America/Chicago",
  MO: "America/Chicago", MT: "America/Denver", NE: "America/Chicago", NV: "America/Los_Angeles", NH: "America/New_York",
  NJ: "America/New_York", NM: "America/Denver", NY: "America/New_York", NC: "America/New_York", ND: "America/Chicago",
  OH: "America/New_York", OK: "America/Chicago", OR: "America/Los_Angeles", PA: "America/New_York", RI: "America/New_York",
  SC: "America/New_York", SD: "America/Chicago", TN: "America/Chicago", TX: "America/Chicago", UT: "America/Denver",
  VT: "America/New_York", VA: "America/New_York", WA: "America/Los_Angeles", WV: "America/New_York", WI: "America/Chicago",
  WY: "America/Denver", PR: "America/Puerto_Rico",
};

export function zoneForState(state: string | null | undefined): string {
  return ZONES[(state ?? "").trim().toUpperCase().slice(0, 2)] ?? "America/New_York";
}

function localHour(at: Date, zone: string): number {
  const h = new Intl.DateTimeFormat("en-US", { timeZone: zone, hour: "numeric", hourCycle: "h23" }).format(at);
  return Number(h) % 24;
}

/**
 * The earliest time at or after `now` that falls inside [startHour, endHour)
 * local time. Steps forward an hour at a time (on the hour), which handles
 * DST without date math.
 */
export function nextSendTime(now: Date, zone: string, startHour = 9, endHour = 20): Date {
  if (localHour(now, zone) >= startHour && localHour(now, zone) < endHour) return now;
  const t = new Date(now);
  t.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < 48; i++) {
    t.setUTCHours(t.getUTCHours() + 1);
    if (localHour(t, zone) >= startHour && localHour(t, zone) < endHour) return t;
  }
  return now;
}
