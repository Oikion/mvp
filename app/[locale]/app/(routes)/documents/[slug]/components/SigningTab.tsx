"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { CheckCircle2, Clock, Eye, FileSignature, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { cancelEnvelope } from "@/actions/signing/cancel-envelope";
import type { SignerStatus, SigningEnvelopeStatus } from "@prisma/client";

interface Signer {
  id: string;
  name: string;
  email: string;
  order: number;
  status: SignerStatus;
  signerType: "INTERNAL" | "EXTERNAL";
  signedAt: Date | null;
}

interface Envelope {
  id: string;
  status: SigningEnvelopeStatus;
  subject: string;
  completedAt: Date | null;
  signedDocument: { id: string; friendlyId: string } | null;
  signers: Signer[];
}

interface SigningTabProps {
  documentId: string;
  initialEnvelope: Envelope | null;
}

const STATUS_ICON: Record<SignerStatus, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4 text-muted-foreground" />,
  SENT: <Clock className="h-4 w-4 text-blue-500" />,
  VIEWED: <Eye className="h-4 w-4 text-yellow-500" />,
  SIGNED: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  DECLINED: <XCircle className="h-4 w-4 text-destructive" />,
};

const ENVELOPE_BADGE_VARIANT: Record<
  SigningEnvelopeStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  SENT: "secondary",
  IN_PROGRESS: "secondary",
  COMPLETED: "default",
  DECLINED: "destructive",
  EXPIRED: "destructive",
  CANCELLED: "outline",
  FAILED: "destructive",
};

const TERMINAL_STATUSES: SigningEnvelopeStatus[] = [
  "COMPLETED",
  "DECLINED",
  "EXPIRED",
  "CANCELLED",
  "FAILED",
];

export function SigningTab({ documentId, initialEnvelope }: SigningTabProps) {
  const t = useTranslations("signing");
  const [envelope, setEnvelope] = useState<Envelope | null>(initialEnvelope);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Poll for status updates while the envelope is active
  useEffect(() => {
    if (!envelope || TERMINAL_STATUSES.includes(envelope.status)) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/documents/${documentId}/sign`);
      if (res.ok) {
        const data = await res.json();
        if (data.envelope) setEnvelope(data.envelope);
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [documentId, envelope?.status]);

  async function handleCancel() {
    if (!envelope) return;
    setIsCancelling(true);
    await cancelEnvelope(envelope.id);
    setEnvelope((prev) => (prev ? { ...prev, status: "CANCELLED" } : prev));
    setIsCancelling(false);
    setConfirmCancel(false);
  }

  if (!envelope) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileSignature className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">{t("tab.noEnvelope")}</p>
      </div>
    );
  }

  const isActive = ["SENT", "IN_PROGRESS"].includes(envelope.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={ENVELOPE_BADGE_VARIANT[envelope.status]}>
            {t(`status.${envelope.status}`)}
          </Badge>
          <span className="text-sm text-muted-foreground">{envelope.subject}</span>
        </div>
        {isActive && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmCancel(true)}
            disabled={isCancelling}
          >
            {isCancelling && (
              <Loader2 className="h-3 w-3 mr-1 motion-safe:animate-spin" aria-hidden="true" />
            )}
            {t("tab.cancelButton")}
          </Button>
        )}
      </div>

      <ol className="space-y-3">
        {envelope.signers.map((signer) => (
          <li key={signer.id} className="flex items-center gap-3">
            <span className="text-muted-foreground text-sm w-5">{signer.order}.</span>
            {STATUS_ICON[signer.status]}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{signer.name}</p>
              <p className="text-xs text-muted-foreground">{t(`signerStatus.${signer.status}`)}</p>
            </div>
            {signer.signedAt && (
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(signer.signedAt).toLocaleDateString()}
              </span>
            )}
          </li>
        ))}
      </ol>

      {envelope.status === "COMPLETED" && envelope.signedDocument && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/api/documents/${envelope.signedDocument.id}/download`}>
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            {t("tab.signedDocument")}
          </Link>
        </Button>
      )}

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("tab.cancelButton")}</AlertDialogTitle>
            <AlertDialogDescription>{t("tab.cancelConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("modal.back")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleCancel}
            >
              {t("tab.cancelButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
