import { env } from "../../config/env";

const apiBaseUrl = import.meta.env.DEV ? "/api" : env.VITE_API_BASE_URL.replace(/\/$/, "");

export interface AdmissionHold {
  holdId: string;
  classId: string;
  status: string;
  expiresAt: string;
}

export interface StudentApplication extends AdmissionHold {
  className: string;
}

export async function getMyApplications(studentId: string, signal?: AbortSignal): Promise<StudentApplication[]> {
  const response = await fetch(`${apiBaseUrl}/me/holds`, {
    headers: { "X-Student-Id": studentId },
    signal,
  });
  if (!response.ok) throw await readError(response);
  return response.json() as Promise<StudentApplication[]>;
}

async function readError(response: Response): Promise<Error> {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return new Error(body?.error || `Request failed (${response.status}).`);
}

export async function createHold(classId: string, studentId: string): Promise<AdmissionHold> {
  const response = await fetch(`${apiBaseUrl}/classes/${encodeURIComponent(classId)}/holds`, {
    method: "POST",
    headers: { "X-Student-Id": studentId },
  });
  if (!response.ok) throw await readError(response);
  return response.json() as Promise<AdmissionHold>;
}

export async function getHold(holdId: string, signal?: AbortSignal): Promise<AdmissionHold> {
  const response = await fetch(`${apiBaseUrl}/holds/${encodeURIComponent(holdId)}`, { signal });
  if (!response.ok) throw await readError(response);
  return response.json() as Promise<AdmissionHold>;
}

export async function confirmHold(holdId: string, studentId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/holds/${encodeURIComponent(holdId)}/confirm`, {
    method: "POST",
    headers: { "X-Student-Id": studentId },
  });
  if (!response.ok) throw await readError(response);
}

export async function cancelHold(holdId: string, studentId: string): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/holds/${encodeURIComponent(holdId)}`, {
    method: "DELETE",
    headers: { "X-Student-Id": studentId },
  });
  if (!response.ok) throw await readError(response);
}
