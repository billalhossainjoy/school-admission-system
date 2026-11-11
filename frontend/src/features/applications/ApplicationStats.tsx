import { Clock3, Check, Hash } from "lucide-react";
import type { ReactNode } from "react";

export function ApplicationStats({ total, active, confirmed }: { total: number; active: number; confirmed: number }) {
  return (
    <section className="application-stats" aria-label="Application statistics">
      <Stat label="Total applications" value={total} detail="All submissions" icon={<Hash size={21} />} tone="blue" />
      <Stat label="Active seat holds" value={active} detail="Awaiting confirmation" icon={<Clock3 size={21} />} tone="orange" />
      <Stat label="Confirmed admissions" value={confirmed} detail="Successfully admitted" icon={<Check size={21} />} tone="green" />
    </section>
  );
}

function Stat({ label, value, detail, icon, tone }: { label: string; value: number; detail: string; icon: ReactNode; tone: string }) {
  return <article className="application-stat"><div><p>{label}</p><strong>{value}</strong><small>{detail}</small></div><span className={`stat-icon stat-icon-${tone}`} aria-hidden="true">{icon}</span></article>;
}
