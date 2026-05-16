"use client";

import { useRef, useState, useCallback, type KeyboardEvent, type ClipboardEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "motion/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const DIGITS = 6;

interface Props {
  locale: string;
  redirectTo: string;
}

export function AccessCodeForm({ locale, redirectTo }: Props) {
  const router = useRouter();
  const t = useTranslations("auth");
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Oikion";
  const [digits, setDigits] = useState<string[]>(Array(DIGITS).fill(""));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  const handleChange = useCallback(
    (index: number, e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, "");
      if (!raw) return;

      // Take the last character entered
      const char = raw[raw.length - 1];
      const next = [...digits];
      next[index] = char;
      setDigits(next);
      setError(null);

      if (index < DIGITS - 1) {
        focusInput(index + 1);
      } else {
        // Auto-submit when last digit is filled
        inputRefs.current[index]?.blur();
        submitCode(next.join(""));
      }
    },
    [digits] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        e.preventDefault();
        if (digits[index]) {
          const next = [...digits];
          next[index] = "";
          setDigits(next);
        } else if (index > 0) {
          const next = [...digits];
          next[index - 1] = "";
          setDigits(next);
          focusInput(index - 1);
        }
      } else if (e.key === "ArrowLeft" && index > 0) {
        focusInput(index - 1);
      } else if (e.key === "ArrowRight" && index < DIGITS - 1) {
        focusInput(index + 1);
      } else if (e.key === "Enter") {
        const code = digits.join("");
        if (code.length === DIGITS) submitCode(code);
      }
    },
    [digits] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handlePaste = useCallback((e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGITS);
    if (!pasted) return;
    const next = Array(DIGITS).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setError(null);
    const lastFilled = Math.min(pasted.length, DIGITS - 1);
    focusInput(lastFilled);
    if (pasted.length === DIGITS) {
      submitCode(pasted);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submitCode = async (code: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/app-access/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        router.push(redirectTo || `/${locale}/app/sign-in`);
        return;
      }

      const data = await res.json().catch(() => ({}));
      setError(data.error ?? t("accessCode.errorInvalid"));
      setShake(true);
      setTimeout(() => setShake(false), 600);
      // Clear the digits on failure
      setDigits(Array(DIGITS).fill(""));
      setTimeout(() => focusInput(0), 50);
    } catch {
      setError(t("accessCode.errorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (code.length === DIGITS) submitCode(code);
  };

  const isFilled = digits.every(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t("accessCode.title")}</CardTitle>
          <CardDescription>
            {t("accessCode.description", { appName })}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Digit inputs */}
            <fieldset aria-describedby={error ? "access-code-error" : undefined}>
              <legend className="sr-only">{t("accessCode.legend")}</legend>
              <motion.div
                animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 0.5 }}
                className="flex justify-center gap-3"
              >
                {digits.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={2}
                    value={digit}
                    onChange={(e) => handleChange(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    disabled={isSubmitting}
                    aria-label={t("accessCode.digitLabel", { n: i + 1, total: DIGITS })}
                    aria-invalid={!!error}
                    className={cn(
                      "w-11 h-14 text-center text-xl font-bold rounded-lg border-2 bg-background",
                      "transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                      digit
                        ? "border-primary text-foreground"
                        : "border-input text-muted-foreground",
                      error && "border-destructive focus:ring-destructive",
                      isSubmitting && "opacity-50 cursor-not-allowed"
                    )}
                    autoFocus={i === 0}
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                  />
                ))}
              </motion.div>
            </fieldset>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  id="access-code-error"
                  className="text-sm text-destructive text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={!isFilled || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("accessCode.verifying")}
                </>
              ) : (
                t("accessCode.continue")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
