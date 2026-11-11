import type { ReactNode } from "react";

export function InformationNote({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  return (
    <aside className={compact ? "applications-note" : "information-note"}>
      <span className="information-icon" aria-hidden="true">i</span>
      <p>{children}</p>
    </aside>
  );
}
