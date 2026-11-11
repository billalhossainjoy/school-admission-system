import { env } from "../../config/env";

export interface AdmissionClass {
  id: string;
  name: string;
  totalSeats: number;
  heldSeats: number;
  confirmedSeats: number;
  availableSeats: number;
}

const apiBaseUrl = import.meta.env.DEV
  ? "/api"
  : env.VITE_API_BASE_URL.replace(/\/$/, "");

export async function getClasses(signal?: AbortSignal): Promise<AdmissionClass[]> {
  const response = await fetch(`${apiBaseUrl}/classes`, { signal });
  if (!response.ok) {
    throw new Error(`Could not load class availability (${response.status}).`);
  }

  return response.json() as Promise<AdmissionClass[]>;
}

export async function createClass(name: string, totalSeats: number): Promise<{ id: string; name: string; totalSeats: number }> {
  const response = await fetch(`${apiBaseUrl}/classes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, totalSeats }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => null) as { error?: string; title?: string } | null;
    throw new Error(result?.error ?? result?.title ?? `Could not create class (${response.status}).`);
  }
  return response.json() as Promise<{ id: string; name: string; totalSeats: number }>;
}
