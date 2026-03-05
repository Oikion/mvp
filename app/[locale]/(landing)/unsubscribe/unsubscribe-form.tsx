"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UnsubscribeFormProps {
  email: string;
  token: string;
  confirmLabel: string;
  cancelLabel: string;
  description: string;
  successTitle: string;
  successMessage: string;
  errorMessage: string;
}

export function UnsubscribeForm({
  email,
  token,
  confirmLabel,
  cancelLabel,
  description,
  successTitle,
  successMessage,
  errorMessage,
}: UnsubscribeFormProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  async function handleUnsubscribe() {
    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });

      if (!res.ok) throw new Error("Request failed");

      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-6 space-y-3">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-foreground">{successTitle}</h2>
        <p className="text-muted-foreground">{successMessage}</p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-muted-foreground">{description}</p>
      <p className="text-sm text-muted-foreground font-mono bg-muted px-3 py-2 rounded-md">
        {email}
      </p>

      {status === "error" && (
        <p className="text-sm text-destructive">{errorMessage}</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <Button
          onClick={handleUnsubscribe}
          disabled={status === "loading"}
          variant="destructive"
        >
          {status === "loading" ? "..." : confirmLabel}
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">{cancelLabel}</Link>
        </Button>
      </div>
    </div>
  );
}
