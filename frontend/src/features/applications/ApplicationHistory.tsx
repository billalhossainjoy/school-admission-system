import { Link } from "@tanstack/react-router";
import { useState } from "react";
import type { StudentApplication } from "./api";
import { currentStatus } from "./application-status";

type Filter = "All" | "Held" | "Confirmed" | "Closed";
const filters: Filter[] = ["All", "Held", "Confirmed", "Closed"];

export function ApplicationHistory({ applications, studentId, now }: {
  applications: StudentApplication[];
  studentId: string;
  now: number | null;
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const visible = applications.filter((item) => {
    const status = currentStatus(item, now);
    if (filter === "All") return true;
    if (filter === "Closed") return status === "EXPIRED" || status === "CANCELLED";
    return status === filter.toUpperCase();
  });

  return (
    <section className="applications-history" aria-labelledby="history-title">
      <div className="history-heading">
        <div><h2 id="history-title">Application history</h2><p>Your latest application appears first</p></div>
        <div className="history-filters" aria-label="Filter applications">
          {filters.map((option) => (
            <button key={option} type="button" className={filter === option ? "active" : ""} onClick={() => setFilter(option)}>
              {option}{option === "All" ? ` (${applications.length})` : ""}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <div className="class-state-card">{applications.length === 0 ? "No applications found for this student ID." : `No ${filter.toLowerCase()} applications.`}</div>
      ) : (
        <div className="applications-table-wrap">
          <table className="applications-table">
            <thead><tr><th>CLASS / SHIFT</th><th>APPLICATION ID</th><th>STATUS</th><th>RESERVATION</th><th>NEXT ACTION</th></tr></thead>
            <tbody>
              {visible.map((item) => {
                const status = currentStatus(item, now);
                return (
                  <tr key={item.holdId}>
                    <td><strong>{item.className}</strong></td>
                    <td>{item.holdId}</td>
                    <td><span className={`history-status history-status-${status.toLowerCase()}`}>{status}</span></td>
                    <td>{status === "HELD" ? `Until ${new Date(item.expiresAt).toLocaleString()}` : "—"}</td>
                    <td>
                      <Link
                        className={status === "HELD" ? "history-action active" : "history-action"}
                        to="/application/$holdId"
                        params={{ holdId: item.holdId }}
                        onClick={() => sessionStorage.setItem(`admission:student:${item.holdId}`, studentId)}
                      >
                        {status === "HELD" ? "View hold" : "View details"}
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
