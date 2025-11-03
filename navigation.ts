import { createNavigation } from "next-intl/navigation";
import { availableLocales } from "@/lib/locales";

export const { Link, redirect, usePathname, useRouter } = createNavigation({
  locales: availableLocales.map((l) => l.code),
  defaultLocale: "en",
  localePrefix: "always",
});

