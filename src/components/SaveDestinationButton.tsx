import { Bookmark, BookmarkCheck } from "lucide-react";
import { storeActions, useStore } from "@/lib/store";

export function SaveDestinationButton({
  destinationId,
  variant = "icon",
  className,
}: {
  destinationId: string;
  variant?: "icon" | "full";
  className?: string;
}) {
  const s = useStore();
  const saved = s.savedDestinationIds.includes(destinationId);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    storeActions.toggleSavedDestination(destinationId);
  }

  if (variant === "icon") {
    return (
      <button
        onClick={onClick}
        aria-label={saved ? "Remove from Escape Board" : "Save destination"}
        className={
          "grid h-9 w-9 place-items-center rounded-full bg-background/85 backdrop-blur transition-colors hover:bg-background " +
          (className ?? "")
        }
      >
        {saved ? (
          <BookmarkCheck className="h-4 w-4 fill-[var(--ocean)] text-[var(--ocean)]" />
        ) : (
          <Bookmark className="h-4 w-4 text-foreground" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={
        "inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium transition-colors hover:bg-muted " +
        (saved ? "text-[var(--ocean)] " : "") +
        (className ?? "")
      }
    >
      {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
      {saved ? "Saved to Escape Board" : "Save destination"}
    </button>
  );
}
