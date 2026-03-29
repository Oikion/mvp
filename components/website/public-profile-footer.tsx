"use client";

import { motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Logo } from "@/components/website/logo";
import { APP_VERSION } from "@/lib/version";

interface PublicProfileFooterProps {
  locale: string;
}

export function PublicProfileFooter({ locale }: PublicProfileFooterProps) {
  const t = useTranslations("profile");

  return (
    <motion.footer
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.4 }}
      className="border-t border-border bg-background"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <Logo size="default" />
            <span className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Oikion
            </span>
            <Link
              href={`/${locale}/changelog`}
              className="group inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all duration-300 ease-out"
            >
              <span className="relative overflow-hidden h-[14px] flex items-center">
                <span className="inline-flex items-center gap-1 transition-all duration-300 ease-out group-hover:-translate-y-3 group-hover:opacity-0">
                  v{APP_VERSION}
                </span>
                <span className="absolute inset-0 inline-flex items-center gap-1 translate-y-3 opacity-0 transition-all duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100">
                  <ExternalLink className="w-2.5 h-2.5" aria-hidden="true" />
                  Changelog
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-6">
            <Link
              href={`/${locale}/legal/privacy-policy`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t("publicProfile.footer.privacy")}
            </Link>
            <Link
              href={`/${locale}/legal/terms-of-service`}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t("publicProfile.footer.terms")}
            </Link>
            <Link
              href={`/${locale}`}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors inline-flex items-center gap-1"
            >
              {t("publicProfile.footer.learnMore")}
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}
