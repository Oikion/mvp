import "./globals.css";

import { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { createTranslator, NextIntlClientProvider } from "next-intl";

import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/app/providers/ThemeProvider";
import { SWRProvider } from "@/app/providers/SWRProvider";
import { ClerkThemeProvider } from "@/lib/clerk-theme-provider";
import { SkipLink } from "@/components/ui/skip-link";

// Static imports for all translation files
import commonEn from "@/locales/en/common.json";
import rootEn from "@/locales/en/root.json";
import navigationEn from "@/locales/en/navigation.json";
import dashboardEn from "@/locales/en/dashboard.json";
import reportsEn from "@/locales/en/reports.json";
import crmEn from "@/locales/en/crm.json";
import mlsEn from "@/locales/en/mls.json";
import adminEn from "@/locales/en/admin.json";
import validationEn from "@/locales/en/validation.json";
import emailEn from "@/locales/en/email.json";
import setLanguageEn from "@/locales/en/setLanguage.json";
import feedbackEn from "@/locales/en/feedback.json";
import registerEn from "@/locales/en/register.json";
import calendarEn from "@/locales/en/calendar.json";
import documentsEn from "@/locales/en/documents.json";
import notificationsEn from "@/locales/en/notifications.json";
import feedEn from "@/locales/en/feed.json";
import socialFeedEn from "@/locales/en/socialFeed.json";
import connectionsEn from "@/locales/en/connections.json";
import dealsEn from "@/locales/en/deals.json";
import sharedWithMeEn from "@/locales/en/sharedWithMe.json";
import audiencesEn from "@/locales/en/audiences.json";
import profileEn from "@/locales/en/profile.json";
import templatesEn from "@/locales/en/templates.json";
import websiteEn from "@/locales/en/website.json";
import authEn from "@/locales/en/auth.json";
import signInEn from "@/locales/en/signIn.json";
import referralsEn from "@/locales/en/referrals.json";
import matchmakingEn from "@/locales/en/matchmaking.json";
import marketIntelEn from "@/locales/en/marketIntel.json";
import aiEn from "@/locales/en/ai.json";
import conversionEn from "@/locales/en/conversion.json";
import importEn from "@/locales/en/import.json";
import landingEn from "@/locales/en/landing.json";
import messagesEn from "@/locales/en/messages.json";
import onboardingEn from "@/locales/en/onboarding.json";
import platformAdminEn from "@/locales/en/platformAdmin.json";
import shareEn from "@/locales/en/share.json";

import commonEl from "@/locales/el/common.json";
import rootEl from "@/locales/el/root.json";
import navigationEl from "@/locales/el/navigation.json";
import dashboardEl from "@/locales/el/dashboard.json";
import reportsEl from "@/locales/el/reports.json";
import crmEl from "@/locales/el/crm.json";
import mlsEl from "@/locales/el/mls.json";
import adminEl from "@/locales/el/admin.json";
import validationEl from "@/locales/el/validation.json";
import emailEl from "@/locales/el/email.json";
import setLanguageEl from "@/locales/el/setLanguage.json";
import feedbackEl from "@/locales/el/feedback.json";
import registerEl from "@/locales/el/register.json";
import calendarEl from "@/locales/el/calendar.json";
import documentsEl from "@/locales/el/documents.json";
import notificationsEl from "@/locales/el/notifications.json";
import feedEl from "@/locales/el/feed.json";
import socialFeedEl from "@/locales/el/socialFeed.json";
import connectionsEl from "@/locales/el/connections.json";
import dealsEl from "@/locales/el/deals.json";
import sharedWithMeEl from "@/locales/el/sharedWithMe.json";
import audiencesEl from "@/locales/el/audiences.json";
import profileEl from "@/locales/el/profile.json";
import templatesEl from "@/locales/el/templates.json";
import websiteEl from "@/locales/el/website.json";
import authEl from "@/locales/el/auth.json";
import signInEl from "@/locales/el/signIn.json";
import referralsEl from "@/locales/el/referrals.json";
import matchmakingEl from "@/locales/el/matchmaking.json";
import marketIntelEl from "@/locales/el/marketIntel.json";
import aiEl from "@/locales/el/ai.json";
import conversionEl from "@/locales/el/conversion.json";
import importEl from "@/locales/el/import.json";
import landingEl from "@/locales/el/landing.json";
import messagesEl from "@/locales/el/messages.json";
import onboardingEl from "@/locales/el/onboarding.json";
import platformAdminEl from "@/locales/el/platformAdmin.json";
import shareEl from "@/locales/el/share.json";

const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  display: "swap",
  fallback: ["system-ui", "arial"],
});
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const metadataBaseUrl = new URL(appBaseUrl);

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

function getLocales(locale: string) {
  const messages: Record<string, any> = {};

  if (locale === "el") {
    messages.RootLayout = rootEl;
    // Spread common contents directly into messages (for backward compatibility)
    Object.assign(messages, commonEl);
    // Also keep it nested for namespace access (useTranslations("common"))
    messages.common = commonEl;
    // Spread navigation contents directly into messages (for backward compatibility)
    Object.assign(messages, navigationEl);
    // Also keep it nested for new code that uses dict.navigation.ModuleMenu
    messages.navigation = navigationEl;
    messages.dashboard = dashboardEl;
    messages.reports = reportsEl;
    messages.crm = crmEl;
    messages.mls = mlsEl;
    messages.admin = adminEl;
    messages.validation = validationEl;
    messages.email = emailEl;
    messages.setLanguage = setLanguageEl;
    messages.feedback = feedbackEl;
    messages.register = registerEl;
    messages.calendar = calendarEl;
    messages.documents = documentsEl;
    messages.feed = feedEl;
    messages.socialFeed = socialFeedEl;
    messages.connections = connectionsEl;
    messages.deals = dealsEl;
    messages.sharedWithMe = sharedWithMeEl;
    messages.audiences = audiencesEl;
    messages.profile = profileEl;
    messages.templates = templatesEl;
    messages.notifications = notificationsEl;
    messages.Notifications = notificationsEl;
    messages.website = websiteEl;
    messages.auth = authEl;
    messages.signIn = signInEl;
    messages.referrals = referralsEl;
    messages.matchmaking = matchmakingEl;
    messages.marketIntel = marketIntelEl;
    messages.ai = aiEl;
    messages.conversion = conversionEl;
    messages.import = importEl;
    messages.landing = landingEl;
    messages.messages = messagesEl;
    messages.onboarding = onboardingEl;
    messages.platformAdmin = platformAdminEl;
    messages.share = shareEl;
  } else {
    // Default to English
    messages.RootLayout = rootEn;
    // Spread common contents directly into messages (for backward compatibility)
    Object.assign(messages, commonEn);
    // Also keep it nested for namespace access (useTranslations("common"))
    messages.common = commonEn;
    // Spread navigation contents directly into messages (for backward compatibility)
    Object.assign(messages, navigationEn);
    // Also keep it nested for new code that uses dict.navigation.ModuleMenu
    messages.navigation = navigationEn;
    messages.dashboard = dashboardEn;
    messages.reports = reportsEn;
    messages.crm = crmEn;
    messages.mls = mlsEn;
    messages.admin = adminEn;
    messages.validation = validationEn;
    messages.email = emailEn;
    messages.setLanguage = setLanguageEn;
    messages.feedback = feedbackEn;
    messages.register = registerEn;
    messages.calendar = calendarEn;
    messages.documents = documentsEn;
    messages.feed = feedEn;
    messages.socialFeed = socialFeedEn;
    messages.connections = connectionsEn;
    messages.deals = dealsEn;
    messages.sharedWithMe = sharedWithMeEn;
    messages.audiences = audiencesEn;
    messages.profile = profileEn;
    messages.templates = templatesEn;
    messages.notifications = notificationsEn;
    messages.Notifications = notificationsEn;
    messages.website = websiteEn;
    messages.auth = authEn;
    messages.signIn = signInEn;
    messages.referrals = referralsEn;
    messages.matchmaking = matchmakingEn;
    messages.marketIntel = marketIntelEn;
    messages.ai = aiEn;
    messages.conversion = conversionEn;
    messages.import = importEn;
    messages.landing = landingEn;
    messages.messages = messagesEn;
    messages.onboarding = onboardingEn;
    messages.platformAdmin = platformAdminEn;
    messages.share = shareEn;
  }

  if (Object.keys(messages).length === 0) {
    notFound();
  }

  return messages;
}

export const viewport: Viewport = {
  width: "device-width",
  height: "device-height",
  initialScale: 1,
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;

  const {
    locale
  } = params;

  const messages = getLocales(locale);
  const t = createTranslator({ locale, messages });
  const ogImageUrl = `${appBaseUrl}/api/og`;

  return {
    metadataBase: metadataBaseUrl,
    title: t("RootLayout.title"),
    description: t("RootLayout.description"),
    openGraph: {
      type: "website",
      url: appBaseUrl,
      title: t("RootLayout.title"),
      description: t("RootLayout.description"),
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: t("RootLayout.title"),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: metadataBaseUrl.hostname,
      title: t("RootLayout.title"),
      description: t("RootLayout.description"),
      images: [ogImageUrl],
    },
  };
}

export default async function RootLayout(props: Props) {
  const params = await props.params;

  const {
    locale
  } = params;

  const {
    children
  } = props;

  const messages = getLocales(locale);
  const t = createTranslator({ locale, messages });

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen`} suppressHydrationWarning>
        <SkipLink />
        <ThemeProvider defaultTheme="system" enableSystem disableTransitionOnChange>
          <ClerkThemeProvider>
            <SWRProvider>
              <NextIntlClientProvider locale={locale} messages={messages}>
                {children}
              </NextIntlClientProvider>
            </SWRProvider>
          </ClerkThemeProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
