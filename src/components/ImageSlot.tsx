import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageSlot({ src, label, className }: { src?: string | null | undefined; label: string; className?: string }) {
  if (src) return <img src={src} alt={label} className={cn("h-full w-full rounded-xl object-cover", className)} />;
  return (
    <div
      className={cn(
        "flex h-full min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground",
        className,
      )}
    >
      <ImageIcon className="size-6 opacity-60" />
      <span className="px-4 text-center text-xs">{label}</span>
    </div>
  );
}
