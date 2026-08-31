import type { DateTime } from "luxon";

export type AcademicTerm = {
  academic_year: number;
  semester: "1" | "2" | "S";
};

export type TermRef = AcademicTerm & {
  /** Portal URL form, e.g. `2026-1`. */
  key: string;
};

export type AuthProfile = {
  id: number;
  uid: string;
  email: string;
  role: string;
};

export type LoginResponse = {
  accessToken: string;
  role: string;
  rights?: unknown[];
};

export type Session = {
  accessToken: string;
  profile: AuthProfile;
  savedAt: string;
};

export type TimetableSlot = {
  start: string;
  end: string;
  venue?: string | null;
};

export type Course = {
  id?: number;
  course_code?: string;
  course_title?: string;
  title?: string;
  credits?: number;
  offering_department?: string;
};

export type ClassOffering = {
  id: number;
  subclass_code?: string | null;
  academic_year?: number | string | null;
  semester?: string | null;
  site?: string | null;
  timetable?: TimetableSlot[];
  course?: Course | null;
  [key: string]: unknown;
};

export type Enrollment = {
  enrollment_id?: number;
  class_id?: number;
  status?: number;
  waitlisted?: boolean;
  course_type?: string | null;
  class?: ClassOffering | null;
};

export type StudyRecord = {
  study_record_id?: number;
  class_id?: number;
  is_active?: boolean;
  grade?: string | null;
  course_type?: string | null;
  class?: ClassOffering | null;
};

export type StudentStudyPeriod = {
  id: number;
  uid?: string;
  enrollments?: Enrollment[];
  study_records?: StudyRecord[];
  programme_title?: string | null;
  [key: string]: unknown;
};

export type EnrolledClass = {
  classId: number;
  source: "enrollment" | "study_record";
  enrollmentStatus?: number;
  waitlisted?: boolean;
  courseType?: string | null;
  cls: ClassOffering;
};

export type TimetableEvent = {
  uid: string;
  classId: number;
  courseCode: string;
  subclassCode: string;
  title: string;
  start: DateTime;
  end: DateTime;
  venue: string;
  site: string;
  semester: string;
  academicYear: string;
  source: EnrolledClass["source"];
};
