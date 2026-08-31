import type { AcademicTerm, TermRef } from "./types";

const SEMESTERS = new Set(["1", "2", "S"]);

export function parseTerm(input: string): TermRef {
  const raw = input.trim();
  const parts = raw.split("-");

  let yearPart: string | undefined;
  let semPart: string | undefined;

  if (parts.length === 2) {
    [yearPart, semPart] = parts;
  } else if (parts.length === 3) {
    [, yearPart, semPart] = parts;
  }

  const academic_year = Number.parseInt(yearPart ?? "", 10);
  const semester = (semPart ?? "").toUpperCase();

  if (!Number.isFinite(academic_year) || !SEMESTERS.has(semester)) {
    throw new Error(
      `Invalid term "${input}". Use the portal form, e.g. 2026-1, 2026-2, or 2026-S.`,
    );
  }

  return {
    academic_year,
    semester: semester as AcademicTerm["semester"],
    key: `${academic_year}-${semester}`,
  };
}

export function termFromApi(value: { academic_year?: unknown; semester?: unknown }): TermRef {
  const year = Number(value.academic_year);
  const semester = String(value.semester ?? "");
  return parseTerm(`${year}-${semester}`);
}

export function classMatchesTerm(
  academicYear: number | string | null | undefined,
  semester: string | null | undefined,
  term: TermRef,
): boolean {
  if (academicYear == null || semester == null || semester === "") {
    return false;
  }
  return Number(academicYear) === term.academic_year && String(semester) === term.semester;
}

export function semesterLabel(semester: string): string {
  if (semester === "1") return "Semester 1";
  if (semester === "2") return "Semester 2";
  if (semester === "S") return "Summer";
  return semester;
}
