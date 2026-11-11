import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { SiteHeader } from "../components/layout/SiteHeader";
import { InformationNote } from "../components/ui/InformationNote";
import { createClass } from "../features/classes/api";

export const Route = createFileRoute("/admin")({ component: AdminPage });

function AdminPage() {
  const queryClient = useQueryClient();
  const [className, setClassName] = useState("");
  const [shift, setShift] = useState("Morning");
  const [seats, setSeats] = useState("");
  const totalSeats = Number(seats);
  const validSeats = Number.isInteger(totalSeats) && totalSeats > 0 && totalSeats <= 2147483647;
  const name = className.trim() ? `${className.trim()} - ${shift} Shift` : "";
  const canSubmit = Boolean(name) && validSeats;
  const createMutation = useMutation({
    mutationFn: () => createClass(name, totalSeats),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["classes"] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit || createMutation.isPending) return;
    createMutation.mutate();
  }

  function clearForm() {
    setClassName("");
    setShift("Morning");
    setSeats("");
    createMutation.reset();
  }

  return (
    <div className="admissions-page">
      <SiteHeader activePage="admin" studentIdEntered={false} />
      <main className="admin-content">
        <nav className="hold-breadcrumb" aria-label="Breadcrumb"><span>School administration</span><span>/</span><strong>Create class</strong></nav>
        <div className="admin-heading"><div><p className="eyebrow">ADMINISTRATION&nbsp; / &nbsp;CLASS SETUP</p><h1>Create a class</h1><p>Set up a class and shift with its own admission capacity.</p></div><span>New class</span></div>
        <div className="admin-columns">
          <form className="admin-form" onSubmit={submit}>
            <div className="admin-card-heading"><div><h2>Class details</h2><p>Provide the class name, shift, and total seats.</p></div><span>Required</span></div>
            <div className="admin-fields">
              <div className="admin-field"><label htmlFor="admin-class-name">Class name *</label><input id="admin-class-name" value={className} onChange={(event) => setClassName(event.target.value)} placeholder="Class 8" maxLength={100} required /><small>Choose the school grade.</small></div>
              <div className="admin-field"><label htmlFor="admin-shift">Shift *</label><select id="admin-shift" value={shift} onChange={(event) => setShift(event.target.value)}><option>Morning</option><option>Day</option><option>Evening</option></select><small>Each shift has separate capacity.</small></div>
              <div className="admin-field"><label htmlFor="admin-seats">Total seats *</label><input id="admin-seats" type="number" inputMode="numeric" min="1" max="2147483647" step="1" value={seats} onChange={(event) => setSeats(event.target.value)} placeholder="80" required /><small>Maximum available admission seats.</small></div>
              <div className="admin-capacity-tip"><strong>INDEPENDENT CAPACITY</strong><p>Each shift has its own seat limit.</p></div>
            </div>
            <div className="admin-form-note"><span className="information-icon" aria-hidden="true">i</span><p>Class settings are independent for each shift. Students will see availability as soon as the class is created.</p></div>
            {createMutation.isError && <p className="hold-error" role="alert">{createMutation.error.message}</p>}
            {createMutation.isSuccess && <p className="admin-success" role="status">Created {createMutation.data.name}. <Link to="/">View classes</Link></p>}
            <div className="admin-form-actions"><button type="button" onClick={clearForm}>Clear form</button><button type="submit" disabled={!canSubmit || createMutation.isPending}>{createMutation.isPending ? "Creating…" : "Create class"}</button></div>
          </form>
          <div className="admin-side">
            <aside className="admin-guidance"><h2>Before you create a class</h2><p>Three details determine the new class.</p><ol><li><b>1</b><span><strong>Class name</strong><small>Specify the student grade.</small></span></li><li><b>2</b><span><strong>Shift</strong><small>Create a separate class for each shift.</small></span></li><li><b>3</b><span><strong>Seat capacity</strong><small>Only positive whole numbers are valid.</small></span></li></ol></aside>
            <aside className="admin-preview"><div><h2>Seat availability preview</h2><span>Ready</span></div><h3>{name || "Class name · Shift"}</h3><p>New class / independent seat pool</p><div className="admin-preview-stats"><span><strong>{validSeats ? totalSeats : 0}</strong>Total</span><span><strong>0</strong>Held</span><span><strong>0</strong>Confirmed</span><span><strong>{validSeats ? totalSeats : 0}</strong>Available</span></div><small>All seats are available when the class is first created.</small></aside>
          </div>
        </div>
        <InformationNote>Class capacities are independent for each shift. Students can apply once a class is created.</InformationNote>
      </main>
    </div>
  );
}
