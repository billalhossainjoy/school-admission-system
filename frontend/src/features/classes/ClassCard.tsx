import type { AdmissionClass } from "./api";
import { getClassDisplay, getSeatMetrics } from "./class-display";
import confirmedDot from "../../assets/figma/seat-dot-blue.svg";
import heldDot from "../../assets/figma/seat-dot-orange.svg";
import availableDot from "../../assets/figma/seat-dot-green.svg";

interface ClassCardProps {
  admissionClass: AdmissionClass;
  hasValidStudentId: boolean;
  isCreatingHold: boolean;
  onViewDetails: () => void;
  onChoose: () => void;
}

export function ClassCard({ admissionClass, hasValidStudentId, isCreatingHold, onViewDetails, onChoose }: ClassCardProps) {
  const display = getClassDisplay(admissionClass.name);
  const metrics = getSeatMetrics(admissionClass);
  const status = metrics.full ? "Full" : "Available";

  return (
    <article className={`class-card${metrics.full ? " class-card-full" : ""}`}>
      <div className="class-card-header">
        <span className="grade-emblem">{display.gradeMark}</span>
        <div className="class-name-block">
          <h3>{display.title}</h3>
          {display.shift && <p>{display.shift}</p>}
        </div>
        <span className={`availability-badge${metrics.full ? " full" : ""}`}>
          {status}
        </span>
      </div>

      <div className="card-divider" />

      <div className="seat-summary">
        <div className="seat-summary-item vacancy-summary">
          <strong>{metrics.available}</strong>
          <span>Seats available</span>
        </div>
        <div className="seat-summary-item capacity-summary">
          <strong>{metrics.total}</strong>
          <span>Total seats</span>
        </div>
      </div>

      <div className="allocation-label">
        <span>Seat allocation</span>
        <strong>{metrics.occupiedPercent}% occupied</strong>
      </div>
      <div
        className="allocation-bar"
        role="img"
        aria-label={`${metrics.confirmed} confirmed, ${metrics.held} held, ${metrics.available} available`}
      >
        <span className="confirmed-segment" style={{ width: `${metrics.confirmedPercent}%` }} />
        <span className="held-segment" style={{ width: `${metrics.heldPercent}%` }} />
      </div>

      <div className="seat-legend" aria-label="Seat counts">
        <span><img src={confirmedDot} alt="" width="7" height="7" />{metrics.confirmed} confirmed</span>
        <span><img src={heldDot} alt="" width="7" height="7" />{metrics.held} held</span>
        <span><img src={availableDot} alt="" width="7" height="7" />{metrics.available} free</span>
      </div>

      <div className="card-actions">
        <button type="button" className="view-details-button" onClick={onViewDetails}>View details</button>
        <button
          type="button"
          className={`apply-button${metrics.full || !hasValidStudentId ? " disabled" : ""}`}
          disabled={metrics.full || !hasValidStudentId || isCreatingHold}
          onClick={onChoose}
        >
          {metrics.full ? "Seats full" : isCreatingHold ? "Reserving…" : hasValidStudentId ? "Hold seat" : "Enter ID to apply"}
        </button>
      </div>
    </article>
  );
}

export function SeatBreakdown({ admissionClass }: { admissionClass: AdmissionClass }) {
  const metrics = getSeatMetrics(admissionClass);
  return (
    <div className="dialog-seat-breakdown">
      <div><strong>{metrics.available}</strong><span>Seats available</span></div>
      <div><strong>{metrics.total}</strong><span>Total seats</span></div>
      <div><strong>{metrics.confirmed}</strong><span>Confirmed</span></div>
      <div><strong>{metrics.held}</strong><span>On hold</span></div>
    </div>
  );
}
