"use client";

import { useReducer, useState, useCallback, useMemo, useTransition } from "react";
import { useTranslations, useFormatter } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { generateRequestsFromContacts } from "@/actions/requests";
import type {
  EligibleContact,
  PreviewRequest,
  GenerateFromContactsResult,
} from "@/lib/types/auto-generate-requests";

// ─── State machine ───────────────────────────────────────────────────────────

type Step =
  | { name: "SELECT_CONTACTS" }
  | { name: "PREVIEW"; previews: PreviewRequest[] }
  | { name: "SUBMITTING"; previews: PreviewRequest[] }
  | { name: "DONE"; result: GenerateFromContactsResult }
  | { name: "ERROR"; message: string };

type Action =
  | { type: "NEXT"; previews: PreviewRequest[] }
  | { type: "BACK" }
  | { type: "SUBMIT"; previews: PreviewRequest[] }
  | { type: "COMPLETE"; result: GenerateFromContactsResult }
  | { type: "FAIL"; message: string }
  | { type: "RESET" };

function reducer(state: Step, action: Action): Step {
  switch (action.type) {
    case "NEXT":
      return { name: "PREVIEW", previews: action.previews };
    case "BACK":
      return { name: "SELECT_CONTACTS" };
    case "SUBMIT":
      return { name: "SUBMITTING", previews: action.previews };
    case "COMPLETE":
      return { name: "DONE", result: action.result };
    case "FAIL":
      return { name: "ERROR", message: action.message };
    case "RESET":
      return { name: "SELECT_CONTACTS" };
    default:
      return state;
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

type ContactFilter = "ALL" | "BUYER" | "TENANT";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContactIds?: string[];
}

// ─── Contact selection step ──────────────────────────────────────────────────

interface SelectStepProps {
  contacts: EligibleContact[];
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onNext: () => void;
  t: ReturnType<typeof useTranslations>;
}

function SelectContactsStep({
  contacts,
  loading,
  error,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onNext,
  t,
}: SelectStepProps) {
  const [filter, setFilter] = useReducer(
    (_: ContactFilter, v: ContactFilter) => v,
    "ALL"
  );
  const [search, setSearch] = useReducer((_: string, v: string) => v, "");

  const filtered = useMemo(() => {
    return contacts.filter((c) => {
      if (filter === "BUYER" && !c.category.includes("BUYER")) return false;
      if (filter === "TENANT" && !c.category.includes("TENANT")) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.displayName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [contacts, filter, search]);

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t("step1Description")}</p>

        {/* Filter tabs */}
        <div className="flex gap-1">
          {(["ALL", "BUYER", "TENANT"] as ContactFilter[]).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {t(
                f === "ALL"
                  ? "filterAll"
                  : f === "BUYER"
                    ? "filterBuyer"
                    : "filterTenant"
              )}
            </Button>
          ))}
        </div>

        <Input
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{selectedIds.size} selected</span>
          <div className="flex gap-2">
            <button
              className="underline underline-offset-2 hover:text-foreground"
              onClick={onSelectAll}
            >
              {t("selectAll")}
            </button>
            <button
              className="underline underline-offset-2 hover:text-foreground"
              onClick={onDeselectAll}
            >
              {t("deselectAll")}
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          Loading…
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}
      {!loading && !error && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("noEligibleContacts")}
        </p>
      )}

      {!loading && !error && filtered.length > 0 && (
        <ScrollArea className="max-h-64 rounded-md border">
          <div className="divide-y">
            {filtered.map((contact) => (
              <label
                key={contact.id}
                className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50"
              >
                <Checkbox
                  checked={selectedIds.has(contact.id)}
                  onCheckedChange={() => onToggle(contact.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {contact.displayName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t("linkedProperties", {
                      count: contact.linkedPropertyCount,
                    })}
                  </p>
                </div>
                <div className="flex gap-1">
                  {contact.category.map((cat) => (
                    <Badge key={cat} variant="outline" className="text-xs">
                      {cat}
                    </Badge>
                  ))}
                </div>
              </label>
            ))}
          </div>
        </ScrollArea>
      )}

      <div className="flex justify-end pt-2">
        <Button
          disabled={selectedIds.size === 0 || loading}
          onClick={onNext}
        >
          {t("nextButton", { count: selectedIds.size })}
        </Button>
      </div>
    </>
  );
}

// ─── Preview step ────────────────────────────────────────────────────────────

interface PreviewStepProps {
  previews: PreviewRequest[];
  onChange: (previews: PreviewRequest[]) => void;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
  t: ReturnType<typeof useTranslations>;
}

function PreviewStep({
  previews,
  onChange,
  onBack,
  onConfirm,
  submitting,
  t,
}: PreviewStepProps) {
  const format = useFormatter();

  function removeRow(previewId: string) {
    onChange(previews.filter((p) => p.previewId !== previewId));
  }

  function updateField(
    previewId: string,
    field: keyof PreviewRequest,
    value: unknown
  ) {
    onChange(
      previews.map((p) =>
        p.previewId === previewId ? { ...p, [field]: value } : p
      )
    );
  }

  if (previews.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="py-8 text-center text-sm text-muted-foreground">
          {t("noPreviewsRemaining")}
        </p>
        <div className="flex justify-start">
          <Button variant="outline" onClick={onBack}>
            {t("backButton")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <p className="text-sm text-muted-foreground">{t("step2Description")}</p>

      <ScrollArea className="max-h-96 rounded-md border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background">
            <tr className="border-b">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {t("columnName")}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {t("columnType")}
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                {t("columnBudgetMin")}
              </th>
              <th className="px-3 py-2 text-right font-medium text-muted-foreground">
                {t("columnBudgetMax")}
              </th>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                {t("columnLocation")}
              </th>
              <th className="w-16 px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {previews.map((p) => (
              <tr key={p.previewId} className="group">
                <td className="px-3 py-1.5">
                  <Input
                    value={p.name}
                    onChange={(e) =>
                      updateField(p.previewId, "name", e.target.value)
                    }
                    className="h-7 text-xs"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Badge
                    variant={p.requestType === "BUY" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {p.requestType}
                  </Badge>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Input
                    type="number"
                    value={p.budgetMin ?? ""}
                    onChange={(e) =>
                      updateField(
                        p.previewId,
                        "budgetMin",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="h-7 w-24 text-right text-xs"
                  />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Input
                    type="number"
                    value={p.budgetMax ?? ""}
                    onChange={(e) =>
                      updateField(
                        p.previewId,
                        "budgetMax",
                        e.target.value === "" ? null : Number(e.target.value)
                      )
                    }
                    className="h-7 w-24 text-right text-xs"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <span className="text-xs text-muted-foreground">
                    {p.locationDisplayName ?? p.municipality ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs opacity-0 group-hover:opacity-100"
                    onClick={() => removeRow(p.previewId)}
                  >
                    {t("removeRow")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack} disabled={submitting}>
          {t("backButton")}
        </Button>
        <Button onClick={onConfirm} disabled={submitting}>
          {submitting
            ? t("generatingButton")
            : t("confirmButton", { count: previews.length })}
        </Button>
      </div>
    </>
  );
}

// ─── Done step ───────────────────────────────────────────────────────────────

function DoneStep({
  result,
  onClose,
  t,
}: {
  result: GenerateFromContactsResult;
  onClose: () => void;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 rounded-md border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950/30">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600 dark:text-green-400" />
        <div className="flex flex-col gap-0.5">
          <p className="text-sm font-medium text-green-900 dark:text-green-200">
            {t("successSummary", { created: result.created })}
          </p>
          {result.failed > 0 && (
            <p className="text-xs text-destructive">
              {t("failedSummary", { failed: result.failed })}
            </p>
          )}
        </div>
      </div>

      {result.failed > 0 && (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {result.results
            .filter((r) => r.status === "failed")
            .map((r) => (
              <li key={r.previewId} className="flex items-center gap-2">
                <XCircle className="size-3.5 shrink-0 text-destructive" />
                {r.error ?? t("unknownError")}
              </li>
            ))}
        </ul>
      )}

      <div className="flex justify-end">
        <Button onClick={onClose}>{t("closeButton")}</Button>
      </div>
    </div>
  );
}

// ─── Main dialog ─────────────────────────────────────────────────────────────

export function AutoGenerateRequestsDialog({
  open,
  onOpenChange,
  initialContactIds,
}: Props) {
  const t = useTranslations("requests.autoGenerate");
  const [step, dispatch] = useReducer(reducer, { name: "SELECT_CONTACTS" });
  const [isPending, startTransition] = useTransition();

  // Contact list state
  const [contacts, setContacts] = useReducer(
    (_: EligibleContact[], v: EligibleContact[]) => v,
    []
  );
  const [contactsLoading, setContactsLoading] = useReducer(
    (_: boolean, v: boolean) => v,
    false
  );
  const [contactsError, setContactsError] = useReducer(
    (_: string | null, v: string | null) => v,
    null
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set<string>(initialContactIds ?? [])
  );

  // Preview state (editable)
  const [editedPreviews, setEditedPreviews] = useReducer(
    (_: PreviewRequest[], v: PreviewRequest[]) => v,
    []
  );

  // Fetch eligible contacts when dialog opens
  const fetchContacts = useCallback(async () => {
    setContactsLoading(true);
    setContactsError(null);
    try {
      const res = await fetch("/api/requests/eligible-contacts");
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      const list: EligibleContact[] = json.data?.contacts ?? [];
      setContacts(list);
      if (initialContactIds?.length) {
        setSelectedIds(new Set(initialContactIds));
      }
    } catch {
      setContactsError("Could not load contacts.");
    } finally {
      setContactsLoading(false);
    }
  }, [initialContactIds]);

  // Load when dialog opens
  const handleOpenChange = useCallback(
    (v: boolean) => {
      if (v) {
        fetchContacts();
      } else {
        dispatch({ type: "RESET" });
        setContacts([]);
        setSelectedIds(new Set());
        setEditedPreviews([]);
      }
      onOpenChange(v);
    },
    [fetchContacts, onOpenChange]
  );

  // Fetch previews for selected contacts
  async function handleNext() {
    const ids = Array.from(selectedIds);
    try {
      const res = await fetch("/api/requests/generate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactIds: ids }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const json = await res.json();
      const previews: PreviewRequest[] = json.data?.previews ?? [];
      setEditedPreviews(previews);
      dispatch({ type: "NEXT", previews });
    } catch {
      setContactsError(t("fetchPreviewError"));
    }
  }

  // Submit
  async function handleConfirm() {
    dispatch({ type: "SUBMIT", previews: editedPreviews });
    startTransition(async () => {
      const result = await generateRequestsFromContacts({
        previews: editedPreviews,
      });
      if (result.success && result.data) {
        dispatch({ type: "COMPLETE", result: result.data });
      } else {
        dispatch({ type: "FAIL", message: t("submitError") });
      }
    });
  }

  const toggleId = useCallback(
    (id: string) => {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setSelectedIds(next);
    },
    [selectedIds]
  );

  const stepTitle =
    step.name === "SELECT_CONTACTS"
      ? t("step1Title")
      : step.name === "PREVIEW" || step.name === "SUBMITTING"
        ? t("step2Title")
        : t("doneTitle");

  const isSubmitting = step.name === "SUBMITTING" || isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            {t("dialogTitle")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{stepTitle}</p>
        </DialogHeader>

        <div className="flex flex-col gap-4 overflow-hidden">
          {step.name === "SELECT_CONTACTS" && (
            <SelectContactsStep
              contacts={contacts}
              loading={contactsLoading}
              error={contactsError}
              selectedIds={selectedIds}
              onToggle={toggleId}
              onSelectAll={() =>
                setSelectedIds(new Set(contacts.map((c) => c.id)))
              }
              onDeselectAll={() => setSelectedIds(new Set())}
              onNext={handleNext}
              t={t}
            />
          )}

          {(step.name === "PREVIEW" || step.name === "SUBMITTING") && (
            <PreviewStep
              previews={editedPreviews}
              onChange={setEditedPreviews}
              onBack={() => dispatch({ type: "BACK" })}
              onConfirm={handleConfirm}
              submitting={isSubmitting}
              t={t}
            />
          )}

          {step.name === "DONE" && (
            <DoneStep
              result={step.result}
              onClose={() => onOpenChange(false)}
              t={t}
            />
          )}

          {step.name === "ERROR" && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                {step.message}
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => dispatch({ type: "BACK" })}>
                  {t("backButton")}
                </Button>
                <Button onClick={handleConfirm}>{t("retryButton")}</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
