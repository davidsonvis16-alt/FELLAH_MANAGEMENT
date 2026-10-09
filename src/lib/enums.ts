// SQLite has no enums, so the allowed values live here and are enforced by zod
// at every write. Moving to PostgreSQL turns each of these into a real enum.

export const ROLES = ["ADMIN", "TEACHER", "STUDENT", "GUARDIAN"] as const;
export type Role = (typeof ROLES)[number];

export const STUDENT_STATUSES = ["ACTIVE", "SUSPENDED", "GRADUATED", "TRANSFERRED"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const GENDERS = ["MALE", "FEMALE", "OTHER"] as const;
export type Gender = (typeof GENDERS)[number];

export const RELATIONSHIPS = ["MOTHER", "FATHER", "GUARDIAN", "SPONSOR", "OTHER"] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "EXCUSED"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const ASSESSMENT_KINDS = ["CAT", "EXAM", "ASSIGNMENT", "PRACTICAL"] as const;
export type AssessmentKind = (typeof ASSESSMENT_KINDS)[number];

export const PAYMENT_METHODS = ["MPESA", "BANK", "CASH"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_LABELS: Record<PaymentMethod, string> = { MPESA: "M-Pesa", BANK: "Bank", CASH: "Cash" };

export const AUDIENCES = ["ALL", "STAFF", "STUDENTS"] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABELS: Record<Audience, string> = { ALL: "Everyone", STAFF: "Staff", STUDENTS: "Students & parents" };

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  EXCUSED: "Excused",
};

// Status colour is never the only cue - every badge ships an icon and a label.
export const ATTENDANCE_TONE: Record<AttendanceStatus, "good" | "warning" | "critical" | "neutral"> = {
  PRESENT: "good",
  LATE: "warning",
  ABSENT: "critical",
  EXCUSED: "neutral",
};

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
  GUARDIAN: "/student",
};
