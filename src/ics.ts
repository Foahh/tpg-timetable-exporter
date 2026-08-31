import ical from "ical-generator";
import type { DateTime } from "luxon";
import { TIMEZONE } from "./config";
import type { TimetableEvent } from "./types";

export function toIcs(events: TimetableEvent[], calendarName: string): string {
  const calendar = ical({
    name: calendarName,
    prodId: {
      company: "tpg-timetable-exporter",
      product: "tpg-timetable-exporter",
    },
    timezone: {
      name: TIMEZONE,
      generator: hongKongVTimezone,
    },
  });

  for (const event of events) {
    const summary = [event.courseCode, event.subclassCode].filter(Boolean).join(" ");
    calendar.createEvent({
      id: event.uid,
      start: event.start,
      end: event.end,
      timezone: TIMEZONE,
      summary: summary || event.title,
      description: event.title,
      location: event.venue || undefined,
    });
  }

  return calendar.toString();
}

export function formatLocal(date: DateTime): string {
  return date.setZone(TIMEZONE).toFormat("yyyyLLdd'T'HHmmss");
}

function hongKongVTimezone(tz: string): string | null {
  if (tz !== TIMEZONE) return null;
  return [
    "BEGIN:VTIMEZONE",
    `TZID:${TIMEZONE}`,
    "X-LIC-LOCATION:Asia/Hong_Kong",
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0800",
    "TZOFFSETTO:+0800",
    "TZNAME:HKT",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ].join("\r\n");
}
