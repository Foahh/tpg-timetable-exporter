import { apiFetch } from "./api";
import { asStudentStudyPeriod } from "./timetable";
import { termFromApi } from "./term";
import type {
  AcademicTerm,
  ClassOffering,
  EnrolledClass,
  StudentStudyPeriod,
  TermRef,
} from "./types";

export async function fetchCurrentTerm(): Promise<TermRef> {
  const value = await apiFetch<AcademicTerm>(
    "/academic-term-settings/current-enrollment-academic-year",
  );
  return termFromApi(value);
}

export async function fetchStudent(accessToken: string, uid: string): Promise<StudentStudyPeriod> {
  const value = await apiFetch<unknown>(`/student-study-period/by-uid/${uid}`, {
    accessToken,
  });
  return asStudentStudyPeriod(value);
}

export async function fetchClassOffering(
  accessToken: string,
  classId: number,
  studyPeriodId: number,
): Promise<ClassOffering> {
  return apiFetch<ClassOffering>(`/class/student/${classId}?study_period_id=${studyPeriodId}`, {
    accessToken,
  });
}

export async function fetchOfferings(
  accessToken: string,
  studyPeriodId: number,
): Promise<ClassOffering[]> {
  const value = await apiFetch<unknown>(
    `/class/student/offering?study_period_id=${studyPeriodId}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
      accessToken,
    },
  );
  return Array.isArray(value) ? (value as ClassOffering[]) : [];
}

export async function enrichMissingTimetables(
  accessToken: string,
  student: StudentStudyPeriod,
  classes: EnrolledClass[],
): Promise<void> {
  const missing = classes.filter((item) => (item.cls.timetable?.length ?? 0) === 0);
  for (const item of missing) {
    try {
      const detailed = await fetchClassOffering(accessToken, item.classId, student.id);
      if (Array.isArray(detailed.timetable) && detailed.timetable.length > 0) {
        item.cls = { ...item.cls, ...detailed, id: item.classId };
      }
    } catch {
      // Keep the nested class payload if the detail endpoint is unavailable.
    }
  }
}
