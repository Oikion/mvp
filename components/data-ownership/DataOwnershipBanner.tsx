"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataOwnershipSelector } from "./DataOwnershipSelector";
import { setOwnershipMode } from "@/actions/data-ownership/set-ownership-mode";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DataOwnershipBannerProps {
  needsSelection: boolean;
  isAdmin: boolean;
}

export function DataOwnershipBanner({
  needsSelection,
  isAdmin,
}: DataOwnershipBannerProps) {
  const t = useTranslations("dataOwnership.banner");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<"AGENCY" | "AGENT">();
  const [loading, setLoading] = useState(false);

  if (!needsSelection) return null;

  async function handleSave() {
    if (!selected) return;
    setLoading(true);
    try {
      const result = await setOwnershipMode(selected);
      if (result.success) {
        toast.success("Data ownership policy set");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to set data ownership policy");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          {t("title")}
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
          <span className="text-sm text-amber-700 dark:text-amber-300">
            {t("description")}
          </span>
          {isAdmin ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setOpen(true)}
              className="shrink-0"
            >
              {t("chooseNow")}
            </Button>
          ) : (
            <span className="text-sm text-muted-foreground shrink-0">
              {t("askAdmin")}
            </span>
          )}
        </AlertDescription>
      </Alert>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
          </DialogHeader>
          <DataOwnershipSelector
            defaultValue={selected}
            onChange={setSelected}
            disabled={loading}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!selected || loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
