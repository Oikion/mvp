import { Button } from "@/components/ui/button";
import { LayoutGrid, List } from "lucide-react";

interface ViewToggleProps {
  view: "grid" | "list";
  setView: (view: "grid" | "list") => void;
}

export function ViewToggle({ view, setView }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-muted rounded-lg p-1">
      <Button
        variant={view === "grid" ? "secondary" : "ghost"}
        size="sm"
        className="h-8 px-2"
        onClick={() => setView("grid")}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant={view === "list" ? "secondary" : "ghost"}
        size="sm"
        className="h-8 px-2"
        onClick={() => setView("list")}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}



















