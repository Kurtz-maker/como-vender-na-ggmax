import { STATUS_LABEL } from "@/lib/finance";
import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  approved: "bg-primary/15 text-primary border-primary/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  in_review: "bg-warning/15 text-warning border-warning/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  canceled: "bg-muted text-muted-foreground border-border",
  refunded: "bg-electric/15 text-electric border-electric/30",
  charged_back: "bg-destructive/15 text-destructive border-destructive/30",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", tone[status] ?? tone.canceled)}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}
