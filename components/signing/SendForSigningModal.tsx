"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus, Loader2 } from "lucide-react";

interface Signer {
  id: string;
  name: string;
  email: string;
  signerType: "INTERNAL" | "EXTERNAL";
  userId?: string;
}

interface SendForSigningModalProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentName: string;
  onSuccess: () => void;
}

function SortableSigner({
  signer,
  index,
  onRemove,
  t,
}: {
  signer: Signer;
  index: number;
  onRemove: (id: string) => void;
  t: ReturnType<typeof useTranslations<"signing">>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: signer.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="flex items-center gap-2 rounded-md border bg-card px-3 py-2"
    >
      <span className="text-muted-foreground text-sm w-5 shrink-0">{index + 1}</span>
      {/* type="button" prevents form submission if wrapped in a <form> */}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab"
        aria-label={t("modal.dragSigner", { name: signer.name })}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{signer.name}</p>
        <p className="text-xs text-muted-foreground truncate">{signer.email}</p>
      </div>
      <Badge variant="secondary" className="shrink-0 text-xs">
        {signer.signerType === "INTERNAL" ? t("signerType.INTERNAL") : t("signerType.EXTERNAL")}
      </Badge>
      <button
        type="button"
        onClick={() => onRemove(signer.id)}
        className="text-muted-foreground hover:text-destructive"
        aria-label={t("modal.removeSigner", { name: signer.name })}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function SendForSigningModal({
  open,
  onClose,
  documentId,
  documentName,
  onSuccess,
}: SendForSigningModalProps) {
  const t = useTranslations("signing");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [signers, setSigners] = useState<Signer[]>([]);
  const [subject, setSubject] = useState(`${documentName} — Signature Required`);
  const [message, setMessage] = useState("");
  const [externalName, setExternalName] = useState("");
  const [externalEmail, setExternalEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dndAnnouncements = {
    onDragStart: ({ active }: { active: { id: string | number } }) =>
      t("modal.dnd.dragStart", { name: signers.find((s) => s.id === active.id)?.name ?? "" }),
    onDragOver: ({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) =>
      over
        ? t("modal.dnd.dragOver", {
            dragged: signers.find((s) => s.id === active.id)?.name ?? "",
            target: signers.find((s) => s.id === over.id)?.name ?? "",
          })
        : undefined,
    onDragEnd: ({
      active,
      over,
    }: {
      active: { id: string | number };
      over: { id: string | number } | null;
    }) =>
      over
        ? t("modal.dnd.dragEnd", {
            dragged: signers.find((s) => s.id === active.id)?.name ?? "",
            target: signers.find((s) => s.id === over.id)?.name ?? "",
          })
        : t("modal.dnd.dragCancel", {
            name: signers.find((s) => s.id === active.id)?.name ?? "",
          }),
    onDragCancel: ({ active }: { active: { id: string | number } }) =>
      t("modal.dnd.dragCancel", { name: signers.find((s) => s.id === active.id)?.name ?? "" }),
  };

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSigners((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === active.id);
        const newIndex = prev.findIndex((s) => s.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  }

  function addExternalSigner() {
    if (!externalName.trim() || !externalEmail.trim()) return;
    setSigners((prev) => [
      ...prev,
      {
        id: `ext-${Date.now()}`,
        name: externalName.trim(),
        email: externalEmail.trim(),
        signerType: "EXTERNAL",
      },
    ]);
    setExternalName("");
    setExternalEmail("");
  }

  function removeSigner(id: string) {
    setSigners((prev) => prev.filter((s) => s.id !== id));
  }

  function handleClose() {
    const defaultSubject = `${documentName} — Signature Required`;
    const hasContent = signers.length > 0 || message.trim() || subject !== defaultSubject;
    if (hasContent) {
      setConfirmClose(true);
    } else {
      resetAndClose();
    }
  }

  function resetAndClose() {
    setStep(1);
    setSigners([]);
    setSubject(`${documentName} — Signature Required`);
    setMessage("");
    setError(null);
    setConfirmClose(false);
    onClose();
  }

  async function handleSend() {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          message: message || undefined,
          signers: signers.map((s, i) => ({
            name: s.name,
            email: s.email,
            signerType: s.signerType,
            userId: s.userId,
            order: i + 1,
          })),
        }),
      });
      if (!res.ok) {
        setError(t("modal.sendError"));
        return;
      }
      onSuccess();
      resetAndClose();
    } catch {
      setError(t("modal.sendError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const steps = [t("modal.steps.signers"), t("modal.steps.message"), t("modal.steps.review")];

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("modal.title")}</DialogTitle>
          </DialogHeader>

          {/* Step indicator — ol for semantics; aria-current="step" marks the active step */}
          <ol
            className="flex gap-2 mb-4 list-none p-0 m-0"
            aria-label={t("modal.stepIndicatorLabel")}
          >
            {steps.map((label, i) => (
              <li
                key={label}
                aria-current={step === i + 1 ? "step" : undefined}
                className={`flex-1 text-center text-xs py-1 rounded ${
                  step === i + 1
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {label}
              </li>
            ))}
          </ol>

          {/* Step 1: Signers */}
          {step === 1 && (
            <div className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                accessibility={{ announcements: dndAnnouncements }}
              >
                <SortableContext
                  items={signers.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {signers.map((s, i) => (
                      <SortableSigner
                        key={s.id}
                        signer={s}
                        index={i}
                        onRemove={removeSigner}
                        t={t}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {signers.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {t("modal.emptySigners")}
                </p>
              )}

              {/* Add external signer */}
              <div className="border rounded-md p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t("modal.addExternalSigner")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">{t("modal.nameLabel")}</Label>
                    <Input
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      placeholder={t("modal.namePlaceholder")}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">{t("modal.emailLabel")}</Label>
                    <Input
                      type="email"
                      value={externalEmail}
                      onChange={(e) => setExternalEmail(e.target.value)}
                      placeholder={t("modal.emailPlaceholder")}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addExternalSigner}
                  disabled={!externalName.trim() || !externalEmail.trim()}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {t("modal.addExternalSigner")}
                </Button>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={signers.length === 0}
                >
                  {t("modal.next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Message */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label>{t("modal.subjectLabel")}</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("modal.subjectPlaceholder")}
                />
              </div>
              <div>
                <Label>{t("modal.messageLabel")}</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder={t("modal.messagePlaceholder")}
                />
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  {t("modal.back")}
                </Button>
                <Button type="button" onClick={() => setStep(3)}>
                  {t("modal.next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4" aria-busy={isSubmitting}>
              <p className="text-sm font-medium">{t("modal.reviewTitle")}</p>
              <ol className="space-y-2">
                {signers.map((s, i) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground w-5">{i + 1}.</span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground">({s.email})</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {s.signerType === "INTERNAL"
                        ? t("signerType.INTERNAL")
                        : t("signerType.EXTERNAL")}
                    </Badge>
                  </li>
                ))}
              </ol>
              {/* aria-live region so screen readers announce errors without moving focus */}
              <div aria-live="polite" aria-atomic="true">
                {error && <p className="text-sm text-destructive">{error}</p>}
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  {t("modal.back")}
                </Button>
                <Button type="button" onClick={handleSend} disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2
                      className="h-4 w-4 mr-2 motion-safe:animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {t("modal.sendButton")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/*
        Unsaved-changes confirm uses AlertDialog, NOT a nested Dialog.
        Two sibling Dialog components create an aria-hidden conflict: Radix marks the first
        Dialog's backdrop as aria-hidden, which can trap the second Dialog's focus inside the
        hidden tree. AlertDialog is a separate primitive that manages its aria tree correctly.
      */}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("modal.discardTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("modal.unsavedChanges")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("modal.keepEditing")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={resetAndClose}
            >
              {t("modal.discard")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
