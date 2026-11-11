import { Link } from "@tanstack/react-router";
import schoolBookSymbol from "../../assets/figma/school-book-symbol.svg";

interface SiteHeaderProps {
  activePage: "classes" | "applications";
  studentIdEntered: boolean;
}

export function SiteHeader({ activePage, studentIdEntered }: SiteHeaderProps) {
  return (
    <header className="site-navigation">
      <div className="navigation-inner">
        <Link className="school-brand" to="/" aria-label="School Admissions home">
          <span className="school-logo" aria-hidden="true"><img src={schoolBookSymbol} alt="" width="22" height="22" /></span>
          <span className="brand-copy"><strong>School Admissions</strong><small>First come, first served</small></span>
        </Link>
        <nav className="primary-navigation" aria-label="Primary navigation">
          <Link className={activePage === "classes" ? "active" : ""} to="/">Explore classes</Link>
          <Link className={activePage === "applications" ? "active" : ""} to="/applications">My applications</Link>
          <span aria-disabled="true">Admin portal</span>
        </nav>
        <div className={`student-id-status${studentIdEntered ? " student-id-active" : ""}`} aria-live="polite">
          {studentIdEntered ? "Student ID entered" : "Student ID not entered"}
        </div>
      </div>
    </header>
  );
}
