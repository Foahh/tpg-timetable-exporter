import { describe, expect, test } from "bun:test";
import { classMatchesTerm, parseTerm } from "./term";
import { enrolledClassesFromStudent, eventsFromClasses, parseApiDate } from "./timetable";
import { formatLocal, toIcs } from "./ics";
import type { StudentStudyPeriod, TimetableEvent } from "./types";

describe("parseTerm", () => {
  test("parses portal timetable keys", () => {
    expect(parseTerm("2026-1")).toEqual({ academic_year: 2026, semester: "1", key: "2026-1" });
    expect(parseTerm("2026-S")).toEqual({ academic_year: 2026, semester: "S", key: "2026-S" });
    expect(parseTerm("HK-2026-2")).toEqual({ academic_year: 2026, semester: "2", key: "2026-2" });
  });

  test("rejects junk", () => {
    expect(() => parseTerm("2026")).toThrow();
    expect(() => parseTerm("autumn")).toThrow();
  });
});

describe("classMatchesTerm", () => {
  const term = parseTerm("2026-1");
  test("matches year and semester", () => {
    expect(classMatchesTerm(2026, "1", term)).toBe(true);
    expect(classMatchesTerm("2026", "2", term)).toBe(false);
  });
});

describe("enrolledClassesFromStudent", () => {
  const student: StudentStudyPeriod = {
    id: 10,
    enrollments: [
      {
        class_id: 1,
        status: 5,
        class: {
          id: 1,
          academic_year: 2026,
          semester: "1",
          timetable: [{ start: "2026-09-01T09:00:00", end: "2026-09-01T12:00:00" }],
        },
      },
      {
        class_id: 2,
        status: 1,
        class: {
          id: 2,
          academic_year: 2026,
          semester: "1",
          subclass_code: "A",
          site: "HK",
          course: { course_code: "STAT7101", course_title: "Foundations" },
          timetable: [
            {
              start: "2026-09-07T14:00:00",
              end: "2026-09-07T17:00:00",
              venue: "MB 167",
            },
          ],
        },
      },
    ],
    study_records: [
      {
        class_id: 2,
        is_active: true,
        class: {
          id: 2,
          academic_year: 2026,
          semester: "1",
          timetable: [],
        },
      },
    ],
  };

  test("drops excluded enrollment statuses and dedupes with study records", () => {
    const enrolled = enrolledClassesFromStudent(student);
    expect(enrolled.map((item) => item.classId)).toEqual([2]);
    expect(enrolled[0]?.cls.timetable).toHaveLength(1);
  });

  test("builds HKT events from naive API timestamps", () => {
    const enrolled = enrolledClassesFromStudent(student);
    const events = eventsFromClasses(enrolled);
    expect(events).toHaveLength(1);
    expect(events[0]?.courseCode).toBe("STAT7101");
    expect(events[0]?.venue).toBe("MB 167");
    expect(formatLocal(events[0]!.start)).toBe("20260907T140000");
    expect(formatLocal(events[0]!.end)).toBe("20260907T170000");
  });
});

describe("parseApiDate", () => {
  test("treats timezone-less values as Hong Kong time", () => {
    const date = parseApiDate("2026-09-07T14:00:00");
    expect(date?.toUTC().toISO()).toBe("2026-09-07T06:00:00.000Z");
  });
});

describe("toIcs", () => {
  test("emits a VEVENT with HKT timestamps", () => {
    const event: TimetableEvent = {
      uid: "tpg-2-0@test",
      classId: 2,
      courseCode: "STAT7101",
      subclassCode: "A",
      title: "Foundations",
      start: parseApiDate("2026-09-07T14:00:00")!,
      end: parseApiDate("2026-09-07T17:00:00")!,
      venue: "MB 167",
      site: "HK",
      semester: "1",
      academicYear: "2026",
      source: "enrollment",
    };
    const ics = toIcs([event], "TPG 2026-1");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("SUMMARY:STAT7101 A");
    expect(ics).toContain("LOCATION:MB 167");
    expect(ics).toContain("TZID=Asia/Hong_Kong:20260907T140000");
    expect(ics).toContain("TZID=Asia/Hong_Kong:20260907T170000");
  });
});
