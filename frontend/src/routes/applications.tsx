import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getMyApplications } from "../features/applications/api";
import { currentStatus } from "../features/applications/application-status";
import { ApplicationStats } from "../features/applications/ApplicationStats";
import { ApplicationHistory } from "../features/applications/ApplicationHistory";
import { getSavedStudentId, saveStudentId } from "../features/applications/student-identity";
import { SiteHeader } from "../components/layout/SiteHeader";
import { Breadcrumb } from "../components/layout/Breadcrumb";
import { InformationNote } from "../components/ui/InformationNote";

export const Route = createFileRoute("/applications")({ component: ApplicationsPage });

function ApplicationsPage() {
  const [studentId, setStudentId] = useState(getSavedStudentId);
  const [draftId, setDraftId] = useState(studentId);
  const [changingId, setChangingId] = useState(!/^\d{17}$/.test(studentId));
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);
  const validId = /^\d{17}$/.test(studentId);
  const applicationsQuery = useQuery({
    queryKey: ["my-applications", studentId],
    queryFn: ({ signal }) => getMyApplications(studentId, signal),
    enabled: validId,
    refetchInterval: 15_000,
  });
  const applications = applicationsQuery.data ?? [];
  const activeCount = applications.filter((item) => currentStatus(item, now) === "HELD").length;
  const confirmedCount = applications.filter((item) => currentStatus(item, now) === "CONFIRMED").length;

  function applyStudentId() {
    const cleaned = draftId.replace(/\D/g, "").slice(0, 17);
    if (cleaned.length !== 17) return;
    saveStudentId(cleaned);
    setStudentId(cleaned);
    setChangingId(false);
  }

  return (
    <div className="admissions-page">
      <SiteHeader activePage="applications" studentIdEntered={validId} />
      <main className="applications-content">
        <Breadcrumb items={["My applications"]} />
        <div className="applications-heading"><div><p className="eyebrow">STUDENT PORTAL&nbsp; / &nbsp;APPLICATION HISTORY</p><h1>My applications</h1><p>Track your seat reservations and review the status of your applications.</p></div><span>Student record</span></div>
        <section className="applications-identity" aria-label="Student identity"><div className="identity-summary"><b>ID</b><div><small>STUDENT BIRTH REGISTRATION NUMBER</small><strong>{validId && !changingId ? studentId : "Enter your registration number"}</strong></div></div>{!changingId && <button type="button" onClick={() => { setDraftId(studentId); setChangingId(true); }}>Change number</button>}</section>
        {changingId && <form className="applications-id-form" onSubmit={(event) => { event.preventDefault(); applyStudentId(); }}><label htmlFor="applications-student-id">17-digit birth registration number</label><div><input id="applications-student-id" inputMode="numeric" autoComplete="off" maxLength={17} value={draftId} onChange={(event) => setDraftId(event.target.value.replace(/\D/g, "").slice(0, 17))} placeholder="e.g. 20152691234567890" /><button type="submit" disabled={!/^\d{17}$/.test(draftId)}>Find applications</button></div></form>}
        {validId && !changingId && <>
          {applicationsQuery.isPending ? <div className="class-state-card" role="status">Loading applications…</div> : applicationsQuery.isError ? <div className="class-state-card error-state" role="alert"><p>{applicationsQuery.error.message}</p><button className="retry-button" type="button" onClick={() => void applicationsQuery.refetch()}>Try again</button></div> : <>
            <ApplicationStats total={applications.length} active={activeCount} confirmed={confirmedCount} />
            <ApplicationHistory key={studentId} applications={applications} studentId={studentId} now={now} />
          </>}
        </>}
        <InformationNote compact>A seat is held only while the reservation is active. Expired and cancelled applications no longer reserve seats.</InformationNote>
      </main>
    </div>
  );
}

