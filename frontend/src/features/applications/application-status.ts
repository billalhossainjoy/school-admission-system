import type { StudentApplication } from "./api";

export function currentStatus(item: StudentApplication, now: number | null) {
  if (item.status === "HELD" && now !== null && new Date(item.expiresAt).getTime() <= now) return "EXPIRED";
  return item.status;
}
