import type { AdmissionClass } from "./api";

export function getClassDisplay(name: string) {
  const [title, shiftName] = name.split(/\s+[·•–—-]\s+/, 2);
  const gradeNumber = title.match(/\b(\d+)\b/)?.[1];

  return {
    title,
    shift: shiftName
      ? /shift$/i.test(shiftName)
        ? shiftName
        : `${shiftName} shift`
      : "",
    gradeMark: gradeNumber ? gradeNumber.padStart(2, "0") : title.slice(0, 2).toUpperCase(),
  };
}

export function getSeatMetrics(admissionClass: AdmissionClass) {
  const total = Math.max(0, admissionClass.totalSeats);
  const confirmed = Math.max(0, admissionClass.confirmedSeats);
  const held = Math.max(0, admissionClass.heldSeats);
  const available = Math.max(0, admissionClass.availableSeats);
  const occupiedPercent = total > 0
    ? Math.min(100, Math.round(((confirmed + held) / total) * 100))
    : 0;

  return {
    total,
    confirmed,
    held,
    available,
    occupiedPercent,
    confirmedPercent: total > 0 ? Math.min(100, (confirmed / total) * 100) : 0,
    heldPercent: total > 0 ? Math.min(100, (held / total) * 100) : 0,
    full: available === 0,
  };
}

