import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getClasses } from "../lib/classes";
import { getHold } from "../lib/holds";
import schoolBookSymbol from "../assets/figma/school-book-symbol.svg";

export const Route = createFileRoute("/application/$holdId")({ component: HoldPage });

function HoldPage() {
  const { holdId } = Route.useParams();
  const [now, setNow] = useState<number | null>(null);
  const holdQuery = useQuery({
    queryKey: ["hold", holdId],
    queryFn: ({ signal }) => getHold(holdId, signal),
    refetchInterval: 15_000,
  });
  const classesQuery = useQuery({ queryKey: ["classes"], queryFn: ({ signal }) => getClasses(signal) });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  const hold = holdQuery.data;
  const className = classesQuery.data?.find((item) => item.id === hold?.classId)?.name ?? "Selected class";
  const studentId = sessionStorage.getItem(`admission:student:${holdId}`);
  const remainingSeconds = hold && now !== null ? Math.max(0, Math.ceil((new Date(hold.expiresAt).getTime() - now) / 1_000)) : 0;
  const isHeld = hold?.status === "HELD" && (now === null || remainingSeconds > 0);
  const timeLabel = `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(remainingSeconds % 60).padStart(2, "0")}`;

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
          <div className="student-id-status student-id-active">Student ID entered</div>
        </div>
      </header>

      <main className="hold-content">
        <nav className="hold-breadcrumb" aria-label="Breadcrumb"><Link to="/">Explore classes</Link><span>/</span><span>{className}</span><span>/</span><strong>My application</strong></nav>
        {holdQuery.isPending ? <div className="class-state-card" role="status">Loading reservation…</div> : holdQuery.isError ? (
          <div className="class-state-card error-state" role="alert"><p>{holdQuery.error.message}</p><Link to="/">Explore classes</Link></div>
        ) : hold ? (
          <>
            <div className="hold-heading"><div><p className="eyebrow">ADMISSION APPLICATION&nbsp; / &nbsp;{isHeld ? "CREATED" : "EXPIRED"}</p><h1>{isHeld ? "Your seat is reserved" : "Reservation expired"}</h1><p>{isHeld ? "We've placed a temporary hold on your seat. Confirm your admission before the reservation expires." : "This seat hold has ended. Check current class availability to try again."}</p></div><span className="hold-heading-badge">{isHeld ? "Hold created" : "Expired"}</span></div>
            <div className="admission-steps" aria-label="Admission steps"><div><b>✓</b><span><small>STEP 01</small><strong>Choose a class</strong></span></div><div><b>✓</b><span><small>STEP 02</small><strong>Hold your seat</strong></span></div><div className="future-step"><b>3</b><span><small>STEP 03</small><strong>Confirm admission</strong></span></div></div>
            <div className="hold-columns">
              <section className="hold-summary"><div className="hold-summary-heading"><div><h2>{className}</h2><p>Admission record</p></div><span>{isHeld ? "HELD" : "EXPIRED"}</span></div><div className="hold-highlight"><b>{isHeld ? "✓" : "!"}</b><div><strong>{isHeld ? "Seat held" : "Seat released"}</strong><small>{isHeld ? "Your reservation is currently active." : "The reservation is no longer active."}</small></div></div><h3>Application details</h3><dl><div><dt>Birth registration number</dt><dd>{studentId ?? "Entered on another device"}</dd></div><div><dt>Class and shift</dt><dd>{className}</dd></div><div><dt>Application reference</dt><dd>{hold.holdId}</dd></div><div><dt>Current status</dt><dd>{isHeld ? "HELD" : "EXPIRED"}</dd></div></dl><div className="hold-summary-foot"><strong>Seat reservation status</strong><span>{isHeld ? "Seat held" : "Seat released"}</span></div></section>
              <aside className="hold-next"><div className="timer-label"><span>Reservation time remaining</span><strong>LIVE</strong></div><div className="timer-display"><strong>{timeLabel}</strong><small>MINUTES : SECONDS</small></div><div className="timer-track"><span style={{ width: `${Math.max(0, Math.min(100, (remainingSeconds / 600) * 100))}%` }} /></div><h2>{isHeld ? "Complete your admission" : "Reservation expired"}</h2><p>{isHeld ? "Confirm your reserved seat before the countdown ends." : "The seat has returned to availability."}</p><Link className="hold-primary-action" to="/">{isHeld ? "Explore classes" : "Check available classes"}</Link><div className="hold-action-note"><strong>GOOD TO KNOW</strong><p>Your reservation remains active until the countdown ends.</p></div></aside>
            </div>
            <aside className="information-note"><span className="information-icon" aria-hidden="true">i</span><p>Your application reference is {hold.holdId}. Keep it to find this reservation again.</p></aside>
          </>
        ) : null}
      </main>
    </div>
  );
}
