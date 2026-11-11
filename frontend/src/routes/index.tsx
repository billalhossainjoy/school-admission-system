import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { X } from "lucide-react";
import { getClasses, type AdmissionClass } from "../lib/classes";

import schoolBookSymbol from "../assets/figma/school-book-symbol.svg";
import confirmedDot from "../assets/figma/seat-dot-blue.svg";
import heldDot from "../assets/figma/seat-dot-orange.svg";
import availableDot from "../assets/figma/seat-dot-green.svg";

export const Route = createFileRoute("/")({ component: ClassDiscoveryPage });

function getClassDisplay(name: string) {
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

function getSeatMetrics(admissionClass: AdmissionClass) {
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

function ClassDiscoveryPage() {
  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: ({ signal }) => getClasses(signal),
    refetchInterval: 15_000,
  });
  const classes = classesQuery.data ?? [];
  const [studentId, setStudentId] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [detailsClass, setDetailsClass] = useState<AdmissionClass | null>(null);
  const studentIdInput = useRef<HTMLInputElement>(null);
  const hasValidStudentId = /^\d{17}$/.test(studentId);
  const availableSeatTotal = classes.reduce(
    (sum, item) => sum + Math.max(0, item.availableSeats),
    0,
  );

  function updateStudentId(value: string) {
    setStudentId(value.replace(/\D/g, "").slice(0, 17));
  }

  function chooseClass(admissionClass: AdmissionClass) {
    if (!hasValidStudentId) {
      studentIdInput.current?.focus();
      return;
    }
    if (getSeatMetrics(admissionClass).full) return;
    setSelectedClassId(admissionClass.id);
  }

  return (
    <div className="admissions-page">
      <header className="site-navigation">
        <div className="navigation-inner">
          <a className="school-brand" href="#top" aria-label="School Admissions home">
            <span className="school-logo" aria-hidden="true">
              <img src={schoolBookSymbol} alt="" width="22" height="22" />
            </span>
            <span className="brand-copy">
              <strong>School Admissions</strong>
              <small>First come, first served</small>
            </span>
          </a>

          <nav className="primary-navigation" aria-label="Primary navigation">
            <a className="active" href="#classes">Explore classes</a>
            <span aria-disabled="true">My applications</span>
            <span aria-disabled="true">Admin portal</span>
          </nav>

          <div className="student-id-status" aria-live="polite">
            {hasValidStudentId ? "Student ID entered" : "Student ID not entered"}
          </div>
        </div>
      </header>

      <main id="top" className="discovery-content">
        <section className="page-introduction" aria-labelledby="page-title">
          <p className="eyebrow">SCHOOL ADMISSIONS&nbsp; / &nbsp;CLASS &amp; SHIFT AVAILABILITY</p>
          <h1 id="page-title">Find your class. Secure your seat.</h1>
          <p>Explore class shifts and check availability updated throughout the day.</p>
        </section>

        <section className="identity-panel" aria-labelledby="identity-title">
          <div className="identity-form">
            <h2 id="identity-title">Student birth registration number</h2>
            <p>Enter your 17-digit birth registration number. No account is required.</p>
            <div className="identity-input-row">
              <label className="sr-only" htmlFor="student-id">17-digit birth registration number</label>
              <input
                ref={studentIdInput}
                id="student-id"
                className="birth-registration-input"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={17}
                placeholder="e.g. 20152691234567890"
                value={studentId}
                onChange={(event) => updateStudentId(event.target.value)}
                aria-describedby="student-id-requirement"
              />
              <span id="student-id-requirement" className="requirement-badge">
                {studentId.length === 17 ? "17 digits entered" : "17 digits required"}
              </span>
            </div>
          </div>

          <aside className="reservation-instructions" aria-label="How it works">
            <h3>HOW IT WORKS</h3>
            <p>01&nbsp;&nbsp; Choose your class and shift</p>
            <p>02&nbsp;&nbsp; Reserve an available seat</p>
            <p>03&nbsp;&nbsp; Confirm within 10 minutes</p>
          </aside>
        </section>

        <section id="classes" className="class-list-section" aria-labelledby="classes-title">
          <div className="class-list-heading">
            <div>
              <h2 id="classes-title">Available classes &amp; shifts</h2>
              <p>{classes.length} class shifts&nbsp;&nbsp; · &nbsp;&nbsp;{availableSeatTotal} available seats</p>
            </div>
            <span className="live-badge"><i aria-hidden="true" /> Live seat updates</span>
          </div>

          {classesQuery.isPending ? (
            <div className="class-state-card" role="status">Loading current seat availability…</div>
          ) : classesQuery.isError ? (
            <div className="class-state-card error-state" role="alert">
              <p>Class availability could not be loaded.</p>
              <button type="button" className="retry-button" onClick={() => void classesQuery.refetch()}>
                Try again
              </button>
            </div>
          ) : classes.length === 0 ? (
            <div className="class-state-card">There are no class shifts available right now.</div>
          ) : (
            <div className="class-card-grid">
              {classes.map((item) => (
                <ClassCard
                  key={item.id}
                  admissionClass={item}
                  selected={selectedClassId === item.id}
                  hasValidStudentId={hasValidStudentId}
                  onViewDetails={() => setDetailsClass(item)}
                  onChoose={() => chooseClass(item)}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="information-note">
          <span className="information-icon" aria-hidden="true">i</span>
          <p>Holding a seat is temporary. Admission is confirmed only after completing the fee step.</p>
        </aside>
      </main>

      {detailsClass && (
        <div
          className="dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailsClass(null);
          }}
        >
          <section className="class-details-dialog" role="dialog" aria-modal="true" aria-labelledby="details-title">
            <button className="dialog-close" type="button" aria-label="Close class details" onClick={() => setDetailsClass(null)}>
              <X size={18} />
            </button>
            <p className="eyebrow">CLASS &amp; SHIFT DETAILS</p>
            <h2 id="details-title">{getClassDisplay(detailsClass.name).title}</h2>
            {getClassDisplay(detailsClass.name).shift && <p className="dialog-shift">{getClassDisplay(detailsClass.name).shift}</p>}
            <SeatBreakdown admissionClass={detailsClass} />
            <button className="dialog-done" type="button" onClick={() => setDetailsClass(null)}>Done</button>
          </section>
        </div>
      )}
    </div>
  );
}

interface ClassCardProps {
  admissionClass: AdmissionClass;
  selected: boolean;
  hasValidStudentId: boolean;
  onViewDetails: () => void;
  onChoose: () => void;
}

function ClassCard({ admissionClass, selected, hasValidStudentId, onViewDetails, onChoose }: ClassCardProps) {
  const display = getClassDisplay(admissionClass.name);
  const metrics = getSeatMetrics(admissionClass);
  const status = metrics.full ? "Full" : selected ? "Selected" : "Available";

  return (
    <article className={`class-card${metrics.full ? " class-card-full" : ""}${selected ? " class-card-selected" : ""}`}>
      <div className="class-card-header">
        <span className="grade-emblem">{display.gradeMark}</span>
        <div className="class-name-block">
          <h3>{display.title}</h3>
          {display.shift && <p>{display.shift}</p>}
        </div>
        <span className={`availability-badge${metrics.full ? " full" : selected ? " selected" : ""}`}>
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
          disabled={metrics.full || !hasValidStudentId}
          onClick={onChoose}
        >
          {metrics.full ? "Seats full" : selected ? "Selected" : hasValidStudentId ? "Select class" : "Enter ID to apply"}
        </button>
      </div>
    </article>
  );
}

function SeatBreakdown({ admissionClass }: { admissionClass: AdmissionClass }) {
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
