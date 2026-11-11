import { X } from "lucide-react";
import type { AdmissionClass } from "./api";
import { getClassDisplay } from "./class-display";
import { SeatBreakdown } from "./ClassCard";

export function ClassDetailsDialog({ admissionClass, onClose }: { admissionClass: AdmissionClass; onClose: () => void }) {
  const display = getClassDisplay(admissionClass.name);

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="class-details-dialog" role="dialog" aria-modal="true" aria-labelledby="details-title">
        <button className="dialog-close" type="button" aria-label="Close class details" onClick={onClose}><X size={18} /></button>
        <p className="eyebrow">CLASS &amp; SHIFT DETAILS</p>
        <h2 id="details-title">{display.title}</h2>
        {display.shift && <p className="dialog-shift">{display.shift}</p>}
        <SeatBreakdown admissionClass={admissionClass} />
        <button className="dialog-done" type="button" onClick={onClose}>Done</button>
      </section>
    </div>
  );
}
