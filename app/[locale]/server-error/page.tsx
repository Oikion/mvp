"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LayoutDashboard, ServerCrash, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

// Static translations for the server error page
const translations = {
  en: {
    code: "500",
    title: "Server Error",
    description: "Something went wrong on our end. Our team has been notified and is working to fix the issue. Please try again later.",
    goToWebsite: "Go to Website",
    goToApp: "Go to Dashboard",
    tryAgain: "Try Again",
    or: "or",
  },
  el: {
    code: "500",
    title: "Σφάλμα Διακομιστή",
    description: "Κάτι πήγε στραβά. Η ομάδα μας έχει ειδοποιηθεί και εργάζεται για την επίλυση του προβλήματος. Δοκιμάστε ξανά αργότερα.",
    goToWebsite: "Μετάβαση στην Ιστοσελίδα",
    goToApp: "Μετάβαση στον Πίνακα",
    tryAgain: "Δοκιμή Ξανά",
    or: "ή",
  },
};

type Locale = keyof typeof translations;

/**
 * 500 Server Error page
 * Displayed when a server-side error occurs
 */
export default function ServerErrorPage() {
  const params = useParams();
  const locale = (params?.locale as Locale) || "en";
  const t = translations[locale] || translations.en;

  const handleRefresh = () => {
    globalThis.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-slate-100 dark:from-orange-950/30 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center px-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-warning/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-warning/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-orange-500/3 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* Icon with animation */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-warning/20 blur-xl animate-pulse" />
            <div className="relative p-4 rounded-full bg-orange-100 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800">
              <ServerCrash className="w-12 h-12 text-warning dark:text-orange-400" />
            </div>
          </div>
        </div>

        {/* 500 Number with gradient */}
        <div className="relative mb-6">
          <h1 className="text-[8rem] sm:text-[10rem] font-black leading-none tracking-tighter bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 dark:from-orange-400 dark:via-orange-500 dark:to-amber-600 bg-clip-text text-transparent select-none">
            {t.code}
          </h1>
          <div className="absolute inset-0 text-[8rem] sm:text-[10rem] font-black leading-none tracking-tighter text-orange-900/5 dark:text-orange-100/5 blur-xl select-none -z-10">
            500
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
            onClick={handleRefresh}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {t.tryAgain}
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

        {/* Status indicator */}
        <div className="mt-12 p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 max-w-sm mx-auto">
          <div className="flex items-center justify-center gap-2 text-sm text-orange-700 dark:text-orange-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
            </span>
            <span>Our team has been notified</span>
          </div>
        </div>

        {/* Decorative element */}
        <div className="mt-12 flex items-center justify-center gap-2">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-orange-300 dark:to-orange-700" />
          <div className="w-2 h-2 rounded-full bg-orange-300 dark:bg-orange-700" />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-orange-300 dark:to-orange-700" />
        </div>
      </div>
    </div>
  );
}
