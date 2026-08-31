import { DateTime } from "luxon";
import { EXCLUDED_ENROLLMENT_STATUSES, TIMEZONE } from "./config";
import { isRecord } from "./api";
import { classMatchesTerm } from "./term";
import type {
  ClassOffering,
  EnrolledClass,
  Enrollment,
  StudentStudyPeriod,
  StudyRecord,
  TermRef,
  TimetableEvent,
  TimetableSlot,
} from "./types";

export function enrolledClassesFromStudent(student: StudentStudyPeriod): EnrolledClass[] {
  const byId = new Map<number, EnrolledClass>();

  for (const enrollment of student.enrollments ?? []) {
    if (enrollment.status != null && EXCLUDED_ENROLLMENT_STATUSES.has(enrollment.status)) {
      continue;
    }
    const cls = normalizeClass(enrollment.class, enrollment.class_id);
    if (!cls) continue;
    byId.set(cls.id, {
      classId: cls.id,
      source: "enrollment",
      enrollmentStatus: enrollment.status,
      waitlisted: enrollment.waitlisted,
      courseType: enrollment.course_type ?? null,
      cls,
    });
  }

  for (const record of student.study_records ?? []) {
    if (record.is_active === false) continue;
    const cls = normalizeClass(record.class, record.class_id);
    if (!cls) continue;
    const existing = byId.get(cls.id);
    if (existing) {
      existing.cls = mergeClass(existing.cls, cls);
      existing.courseType ??= record.course_type ?? null;
      continue;
    }
    byId.set(cls.id, {
      classId: cls.id,
      source: "study_record",
      courseType: record.course_type ?? null,
      cls,
    });
  }

  return [...byId.values()];
}

export function classesForTerm(classes: EnrolledClass[], term: TermRef): EnrolledClass[] {
  return classes.filter((item) =>
    classMatchesTerm(item.cls.academic_year, item.cls.semester, term),
  );
}

export function eventsFromClasses(classes: EnrolledClass[]): TimetableEvent[] {
  const events: TimetableEvent[] = [];

  for (const item of classes) {
    const courseCode = item.cls.course?.course_code?.trim() || `CLASS-${item.classId}`;
    const subclassCode = item.cls.subclass_code?.trim() || "";
    const title =
      item.cls.course?.course_title?.trim() || item.cls.course?.title?.trim() || courseCode;
    const academicYear = String(item.cls.academic_year ?? "");
    const semester = String(item.cls.semester ?? "");
    const site = item.cls.site?.trim() || "";

    for (const [index, slot] of (item.cls.timetable ?? []).entries()) {
      const start = parseApiDate(slot.start);
      const end = parseApiDate(slot.end);
      if (!start || !end) continue;
      events.push({
        uid: `tpg-${item.classId}-${index}-${start.toMillis()}@tpg.cds.hku.hk`,
        classId: item.classId,
        courseCode,
        subclassCode,
        title,
        start,
        end,
        venue: slot.venue?.trim() || "",
        site,
        semester,
        academicYear,
        source: item.source,
      });
    }
  }

  return events.sort((a, b) => a.start.toMillis() - b.start.toMillis());
}

export function parseApiDate(value: string | undefined | null): DateTime | null {
  if (!value?.trim()) return null;
  const isoish = value.trim().includes("T") ? value.trim() : value.trim().replace(" ", "T");
  const parsed = DateTime.fromISO(isoish, { zone: TIMEZONE });
  return parsed.isValid ? parsed : null;
}

function normalizeClass(
  value: ClassOffering | null | undefined,
  fallbackId?: number,
): ClassOffering | null {
  if (!value && fallbackId == null) return null;
  if (!value) return { id: fallbackId!, timetable: [] };
  const id = Number(value.id ?? fallbackId);
  if (!Number.isFinite(id)) return null;
  return {
    ...value,
    id,
    timetable: Array.isArray(value.timetable) ? value.timetable.filter(isSlot) : [],
    course: value.course && isRecord(value.course) ? value.course : null,
  };
}

function mergeClass(base: ClassOffering, extra: ClassOffering): ClassOffering {
  const timetable =
    (extra.timetable?.length ?? 0) > (base.timetable?.length ?? 0)
      ? extra.timetable
      : base.timetable;
  return {
    ...base,
    ...extra,
    id: base.id,
    timetable,
    course: extra.course ?? base.course,
  };
}

function isSlot(value: unknown): value is TimetableSlot {
  return isRecord(value) && typeof value.start === "string" && typeof value.end === "string";
}

export function asStudentStudyPeriod(value: unknown): StudentStudyPeriod {
  if (!isRecord(value) || value.id == null) {
    throw new Error("Unexpected student-study-period payload: missing id.");
  }
  return {
    ...(value as StudentStudyPeriod),
    id: Number(value.id),
    enrollments: Array.isArray(value.enrollments) ? (value.enrollments as Enrollment[]) : [],
    study_records: Array.isArray(value.study_records) ? (value.study_records as StudyRecord[]) : [],
  };
}
