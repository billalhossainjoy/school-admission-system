import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getClasses } from "../lib/classes";
import { cancelHold, confirmHold, getHold, type AdmissionHold } from "../lib/holds";
import schoolBookSymbol from "../assets/figma/school-book-symbol.svg";

export const Route = createFileRoute("/application/$holdId")({ component: HoldPage });

function HoldPage() {
  const { holdId } = Route.useParams();
  const queryClient = useQueryClient();
  const [now, setNow] = useState<number | null>(null);
  const [studentId, setStudentId] = useState(() => sessionStorage.getItem(`admission:student:${holdId}`) ?? "");
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const holdQuery = useQuery({
    queryKey: ["hold", holdId],
    queryFn: ({ signal }) => getHold(holdId, signal),
    refetchInterval: 15_000,
  });
  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: ({ signal }) => getClasses(signal) });
  const confirmMutation = useMutation({
    mutationFn: () => confirmHold(holdId, studentId),
    onSuccess: () => {
      queryClient.setQueryData<AdmissionHold>(["hold", holdId], (current) => current ? { ...current, status: "CONFIRMED" } : current);
      void queryClient.invalidateQueries({ queryKey: ["hold", holdId] });
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: () => cancelHold(holdId, studentId),
    onSuccess: () => {
      queryClient.setQueryData<AdmissionHold>(["hold", holdId], (current) => current ? { ...current, status: "CANCELLED" } : current);
      void queryClient.invalidateQueries({ queryKey: ["hold", holdId] });
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
      setShowCancelPrompt(false);
    },
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const hold = holdQuery.data;
  const className = classesQuery.data?.find((item) => item.id === hold?.classId)?.name ?? "Selected class";
  const remainingSeconds = hold && now !== null ? Math.max(0, Math.ceil((new Date(hold.expiresAt).getTime() - now) / 1_000)) : 0;
  const isHeld = hold?.status === "HELD" && (now === null || remainingSeconds > 0);
  const isConfirmed = hold?.status === "CONFIRMED";
  const isCancelled = hold?.status === "CANCELLED";
  const status = isConfirmed ? "CONFIRMED" : isCancelled ? "CANCELLED" : isHeld ? "HELD" : "EXPIRED";
  const heading = isConfirmed ? "Admission confirmed" : isCancelled ? "Reservation cancelled" : isHeld ? "Your seat is reserved" : "Reservation expired";
  const description = isConfirmed
    ? "Your admission has been confirmed. Keep your application reference for your records."
    : isCancelled
      ? "Your reservation was cancelled and the seat has been released."
      : isHeld
        ? "We've placed a temporary hold on your seat. Confirm your admission before the reservation expires."
        : "This seat hold has ended. Check current class availability to try again.";
  const studentIdValid = /^\d{17}$/.test(studentId);
  const timeLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

  function updateStudentId(value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 17);
    setStudentId(cleaned);
    if (cleaned.length === 17) sessionStorage.setItem(`admission:student:${holdId}`, cleaned);
  }

  return (
    <div className="admissions-page">
      <header className="site-navigation">
        <div className="navigation-inner">
          <Link className="school-brand" to="/" aria-label="School Admissions home">
            <span className="school-logo" aria-hidden="true"><img src={schoolBookSymbol} alt="" width="22" height="22" /></span>
            <span className="brand-copy"><strong>School Admissions</strong><small>First come, first served</small></span>
          </Link>
          <nav className="primary-navigation" aria-label="Primary navigation">
            <Link to="/">Explore classes</Link><span className="active">My application</span><span aria-disabled="true">Admin portal</span>
          </nav>
          <div className={`student-id-status${studentIdValid ? " student-id-active" : ""}`}>{studentIdValid ? "Student ID entered" : "Student ID not entered"}</div>
        </div>
      </header>

      <main className="hold-content">
        <nav className="hold-breadcrumb" aria-label="Breadcrumb"><Link to="/">Explore classes</Link><span>/</span><span>{className}</span><span>/</span><strong>My application</strong></nav>
        {holdQuery.isPending ? <div className="class-state-card" role="status">Loading reservation…</div> : holdQuery.isError ? (
          <div className="class-state-card error-state" role="alert"><p>{holdQuery.error.message}</p><Link to="/">Explore classes</Link></div>
        ) : hold ? (
          <>
            <div className="hold-heading"><div><p className="eyebrow">ADMISSION APPLICATION&nbsp; / &nbsp;{status}</p><h1>{heading}</h1><p>{description}</p></div><span className="hold-heading-badge">{isHeld ? "Hold created" : status[0] + status.slice(1).toLowerCase()}</span></div>
            <div className="admission-steps" aria-label="Admission steps"><div><b>✓</b><span><small>STEP 01</small><strong>Choose a class</strong></span></div><div><b>✓</b><span><small>STEP 02</small><strong>Hold your seat</strong></span></div><div className={isConfirmed ? "" : "future-step"}><b>{isConfirmed ? "✓" : "3"}</b><span><small>STEP 03</small><strong>Confirm admission</strong></span></div></div>
            <div className="hold-columns">
              <section className="hold-summary"><div className="hold-summary-heading"><div><h2>{className}</h2><p>Admission record</p></div><span>{status}</span></div><div className="hold-highlight"><b>{isHeld || isConfirmed ? "✓" : "!"}</b><div><strong>{isConfirmed ? "Admission confirmed" : isHeld ? "Seat held" : "Seat released"}</strong><small>{isConfirmed ? "Your admission is complete." : isHeld ? "Your reservation is currently active." : "The reservation is no longer active."}</small></div></div><h3>Application details</h3><dl><div><dt>Birth registration number</dt><dd>{studentIdValid ? studentId : "Enter ID to manage reservation"}</dd></div><div><dt>Class and shift</dt><dd>{className}</dd></div><div><dt>Application reference</dt><dd>{hold.holdId}</dd></div><div><dt>Current status</dt><dd>{status}</dd></div></dl><div className="hold-summary-foot"><strong>Seat reservation status</strong><span>{isConfirmed ? "Confirmed" : isHeld ? "Seat held" : "Seat released"}</span></div></section>
              <aside className="hold-next">
                {isHeld ? (
                  <>
                    <div className="timer-label"><span>Reservation time remaining</span><strong>LIVE</strong></div>
                    <div className="timer-display"><strong>{now === null ? "--:--" : timeLabel}</strong><small>MINUTES : SECONDS</small></div>
                    <div className="timer-track"><span style={{ width: `${Math.max(0, Math.min(100, (remainingSeconds / 600) * 100))}%` }} /></div>
                    <h2>Complete your admission</h2>
                    <p>Confirm your reserved seat before the countdown ends.</p>
                    {!studentIdValid && <div className="hold-id-entry"><label htmlFor="hold-student-id">Student birth registration number</label><input id="hold-student-id" inputMode="numeric" autoComplete="off" maxLength={17} value={studentId} onChange={(event) => updateStudentId(event.target.value)} placeholder="17-digit number" /></div>}
                    {(confirmMutation.isError || cancelMutation.isError) && <p className="hold-action-error" role="alert">{confirmMutation.error?.message ?? cancelMutation.error?.message}</p>}
                    <button type="button" className="hold-primary-action" disabled={!studentIdValid || confirmMutation.isPending || cancelMutation.isPending} onClick={() => { cancelMutation.reset(); confirmMutation.mutate(); }}>{confirmMutation.isPending ? "Confirming…" : "Confirm admission fee"}</button>
                    {showCancelPrompt ? <div className="cancel-prompt"><p>Cancel this reservation and release the seat?</p><div><button type="button" disabled={cancelMutation.isPending} onClick={() => setShowCancelPrompt(false)}>Keep reservation</button><button type="button" disabled={!studentIdValid || cancelMutation.isPending} onClick={() => { confirmMutation.reset(); cancelMutation.mutate(); }}>{cancelMutation.isPending ? "Cancelling…" : "Yes, cancel"}</button></div></div> : <button type="button" className="hold-secondary-action" disabled={confirmMutation.isPending} onClick={() => setShowCancelPrompt(true)}>Cancel reservation</button>}
                    <div className="hold-action-note"><strong>GOOD TO KNOW</strong><p>Confirmation is simulated; no real payment gateway is used.</p></div>
                  </>
                ) : (
                  <>
                    <div className="hold-outcome-icon" aria-hidden="true">{isConfirmed ? "✓" : isCancelled ? "×" : "!"}</div>
                    <h2>{isConfirmed ? "Admission complete" : isCancelled ? "Reservation cancelled" : "Reservation expired"}</h2>
                    <p>{isConfirmed ? "Your seat is confirmed." : "The seat has returned to availability."}</p>
                    <Link className="hold-primary-action" to="/">{isConfirmed ? "Explore classes" : "Check available classes"}</Link>
                  </>
                )}
              </aside>
            </div>
            <aside className="information-note"><span className="information-icon" aria-hidden="true">i</span><p>Your application reference is {hold.holdId}. Keep it to find this reservation again.</p></aside>
          </>
        ) : null}
      </main>
    </div>
  );
}
