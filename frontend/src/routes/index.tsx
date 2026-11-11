import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { getClasses, type AdmissionClass } from "../features/classes/api";
import { createHold } from "../features/applications/api";
import { getSavedStudentId, saveStudentId } from "../features/applications/student-identity";
import { getSeatMetrics } from "../features/classes/class-display";
import { ClassCard } from "../features/classes/ClassCard";
import { ClassDetailsDialog } from "../features/classes/ClassDetailsDialog";

import { SiteHeader } from "../components/layout/SiteHeader";
import { InformationNote } from "../components/ui/InformationNote";

export const Route = createFileRoute("/")({ component: ClassDiscoveryPage });

function ClassDiscoveryPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const holdMutation = useMutation({
    mutationFn: ({ classId, studentId }: { classId: string; studentId: string }) => createHold(classId, studentId),
    onSuccess: (hold, variables) => {
      sessionStorage.setItem(`admission:student:${hold.holdId}`, variables.studentId);
      saveStudentId(variables.studentId);
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
      void navigate({ to: "/application/$holdId", params: { holdId: hold.holdId } });
    },
  });
  const classesQuery = useQuery({
    queryKey: ["classes"],
    queryFn: ({ signal }) => getClasses(signal),
    refetchInterval: 15_000,
  });
  const classes = classesQuery.data ?? [];
  const [studentId, setStudentId] = useState(getSavedStudentId);
  const [detailsClass, setDetailsClass] = useState<AdmissionClass | null>(null);
  const studentIdInput = useRef<HTMLInputElement>(null);
  const hasValidStudentId = /^\d{17}$/.test(studentId);
  const availableSeatTotal = classes.reduce(
    (sum, item) => sum + Math.max(0, item.availableSeats),
    0,
  );

  function updateStudentId(value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 17);
    setStudentId(cleaned);
    saveStudentId(cleaned);
  }

  function chooseClass(admissionClass: AdmissionClass) {
    if (!hasValidStudentId) {
      studentIdInput.current?.focus();
      return;
    }
    if (getSeatMetrics(admissionClass).full) return;
    holdMutation.mutate({ classId: admissionClass.id, studentId });
  }

  return (
    <div className="admissions-page">
      <SiteHeader activePage="classes" studentIdEntered={hasValidStudentId} />

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

          {holdMutation.isError && <div className="hold-error" role="alert">{holdMutation.error.message}</div>}
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
                  hasValidStudentId={hasValidStudentId}
                  isCreatingHold={holdMutation.isPending}
                  onViewDetails={() => setDetailsClass(item)}
                  onChoose={() => chooseClass(item)}
                />
              ))}
            </div>
          )}
        </section>

        <InformationNote>Holding a seat is temporary. Admission is confirmed only after completing the fee step.</InformationNote>
      </main>

      {detailsClass && <ClassDetailsDialog admissionClass={detailsClass} onClose={() => setDetailsClass(null)} />}
    </div>
  );
}
