import { Link } from "@tanstack/react-router";

export function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav className="hold-breadcrumb" aria-label="Breadcrumb">
      <Link to="/">Explore classes</Link>
      {items.map((item, index) => (
        <span className="breadcrumb-part" key={`${item}-${index}`}>
          <span aria-hidden="true">/</span>
          {index === items.length - 1 ? <strong>{item}</strong> : <span>{item}</span>}
        </span>
      ))}
    </nav>
  );
}
