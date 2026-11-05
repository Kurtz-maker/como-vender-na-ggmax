import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-sm font-bold tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary font-mono text-xs text-primary-foreground shadow-glow">GG</span>
      <span>Seller<span className="text-primary">Academy</span></span>
    </Link>
  );
}
