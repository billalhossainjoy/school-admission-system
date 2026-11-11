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
