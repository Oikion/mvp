"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LayoutDashboard, ShieldX, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";

// Static translations for the forbidden page
const translations = {
  en: {
    code: "403",
    title: "Access Forbidden",
    description: "You don't have permission to access this page. Please contact your administrator if you believe this is an error.",
    goToWebsite: "Go to Website",
    goToApp: "Go to Dashboard",
    goBack: "Go Back",
    or: "or",
  },
  el: {
    code: "403",
    title: "Απαγορευμένη Πρόσβαση",
    description: "Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη σελίδα. Επικοινωνήστε με τον διαχειριστή σας αν πιστεύετε ότι πρόκειται για σφάλμα.",
    goToWebsite: "Μετάβαση στην Ιστοσελίδα",
    goToApp: "Μετάβαση στον Πίνακα",
    goBack: "Πίσω",
    or: "ή",
  },
};

type Locale = keyof typeof translations;

/**
 * 403 Forbidden page
 * Displayed when a user tries to access a resource they don't have permission for
 */
export default function ForbiddenPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || "en";
  const t = translations[locale] || translations.en;

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-100 dark:from-red-950/30 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center px-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-destructive/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-red-500/3 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* Icon */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-destructive/20 blur-xl animate-pulse" />
            <div className="relative p-4 rounded-full bg-destructive/10 dark:bg-destructive/20/30 border border-red-200 dark:border-red-800">
              <ShieldX className="w-12 h-12 text-destructive dark:text-destructive" />
            </div>
          </div>
        </div>

        {/* 403 Number with gradient */}
        <div className="relative mb-6">
          <h1 className="text-[8rem] sm:text-[10rem] font-black leading-none tracking-tighter bg-gradient-to-br from-red-600 via-red-500 to-red-400 dark:from-red-400 dark:via-red-500 dark:to-red-600 bg-clip-text text-transparent select-none">
            {t.code}
          </h1>
          <div className="absolute inset-0 text-[8rem] sm:text-[10rem] font-black leading-none tracking-tighter text-red-900/5 dark:text-red-100/5 blur-xl select-none -z-10">
            403
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground dark:text-foreground mb-4 tracking-tight">
          {t.title}
        </h2>

        {/* Description */}
        <p className="text-muted-foreground dark:text-muted-foreground text-lg mb-10 max-w-md mx-auto leading-relaxed">
          {t.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
          <Button
            variant="outline"
            size="lg"
            className="min-w-[160px] h-12 rounded-xl border-border dark:border-slate-800 hover:bg-muted dark:hover:bg-card transition-all duration-200"
            onClick={() => globalThis.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.goBack}
          </Button>

          <span className="text-muted-foreground dark:text-muted-foreground text-sm hidden sm:block">
            {t.or}
          </span>

          <Button
            size="lg"
            className="min-w-[180px] h-12 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/25 transition-all duration-200"
            asChild
          >
            <Link href={`/${locale}/app`} className="inline-flex items-center gap-2">
              <LayoutDashboard className="w-4 h-4" />
              {t.goToApp}
            </Link>
          </Button>
        </div>

        {/* Decorative element */}
        <div className="mt-16 flex items-center justify-center gap-2">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-red-300 dark:to-red-700" />
          <div className="w-2 h-2 rounded-full bg-red-300 dark:bg-red-700" />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-red-300 dark:to-red-700" />
        </div>
      </div>
    </div>
  );
}
