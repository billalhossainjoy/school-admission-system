const studentIdKey = "school-admissions:student-id";

export function getSavedStudentId(): string {
  const studentId = localStorage.getItem(studentIdKey) ?? "";
  return /^\d{17}$/.test(studentId) ? studentId : "";
}

export function saveStudentId(studentId: string): void {
  if (!/^\d{17}$/.test(studentId)) return;
  localStorage.setItem(studentIdKey, studentId);
}
