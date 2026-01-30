"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Home, LayoutDashboard } from "lucide-react";

import { Button } from "@/components/ui/button";

// Static translations for the not-found page
// Using static translations to avoid issues with NextIntlClientProvider context
const translations = {
  en: {
    code: "404",
    title: "Page Not Found",
    description: "Oops! The page you're looking for doesn't exist or has been moved.",
    goToWebsite: "Go to Website",
    goToApp: "Go to App",
    or: "or",
  },
  el: {
    code: "404",
    title: "Η Σελίδα Δεν Βρέθηκε",
    description: "Ωχ! Η σελίδα που ψάχνετε δεν υπάρχει ή έχει μετακινηθεί.",
    goToWebsite: "Μετάβαση στην Ιστοσελίδα",
    goToApp: "Μετάβαση στην Εφαρμογή",
    or: "ή",
  },
};

type Locale = keyof typeof translations;

/**
 * Locale-specific 404 page.
 * This page inherits from the locale layout (app/[locale]/layout.tsx)
 * and does NOT include its own <html> or <body> tags.
 */
export default function NotFound() {
  const params = useParams();
  const locale = (params?.locale as Locale) || "en";
  const t = translations[locale] || translations.en;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center px-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-r from-primary/3 to-transparent blur-3xl" />
      </div>

      <div className="relative z-10 text-center max-w-lg mx-auto">
        {/* 404 Number with gradient */}
        <div className="relative mb-8">
          <h1 className="text-[10rem] sm:text-[14rem] font-black leading-none tracking-tighter bg-gradient-to-br from-slate-900 via-slate-700 to-slate-500 dark:from-slate-100 dark:via-slate-300 dark:to-slate-500 bg-clip-text text-transparent select-none">
            {t.code}
          </h1>
          <div className="absolute inset-0 text-[10rem] sm:text-[14rem] font-black leading-none tracking-tighter text-foreground/5 dark:text-white/5 blur-xl select-none -z-10">
            404
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
            className="min-w-[180px] h-12 rounded-xl border-border dark:border-slate-800 hover:bg-muted dark:hover:bg-card transition-all duration-200"
            asChild
          >
            <Link href={`/${locale}`} className="inline-flex items-center gap-2">
              <Home className="w-4 h-4" />
              {t.goToWebsite}
            </Link>
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
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-slate-300 dark:to-slate-700" />
          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-700" />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-slate-300 dark:to-slate-700" />
        </div>
      </div>
    </div>
  );
}



