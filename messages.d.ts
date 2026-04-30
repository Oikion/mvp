// Type-safe next-intl messages.
// Generated from English locale files (source of truth for key structure).
// See: https://next-intl.dev/docs/workflows/typescript

import type commonEn from "./locales/en/common.json";
import type rootEn from "./locales/en/root.json";
import type navigationEn from "./locales/en/navigation.json";
import type dashboardEn from "./locales/en/dashboard.json";
import type reportsEn from "./locales/en/reports.json";
import type crmEn from "./locales/en/crm.json";
import type mlsEn from "./locales/en/mls.json";
import type adminEn from "./locales/en/admin.json";
import type validationEn from "./locales/en/validation.json";
import type emailEn from "./locales/en/email.json";
import type setLanguageEn from "./locales/en/setLanguage.json";
import type feedbackEn from "./locales/en/feedback.json";
import type registerEn from "./locales/en/register.json";
import type calendarEn from "./locales/en/calendar.json";
import type documentsEn from "./locales/en/documents.json";
import type notificationsEn from "./locales/en/notifications.json";
import type feedEn from "./locales/en/feed.json";
import type socialFeedEn from "./locales/en/socialFeed.json";
import type connectionsEn from "./locales/en/connections.json";
import type dealsEn from "./locales/en/deals.json";
import type sharedWithMeEn from "./locales/en/sharedWithMe.json";
import type profileEn from "./locales/en/profile.json";
import type templatesEn from "./locales/en/templates.json";
import type shareEn from "./locales/en/share.json";
import type platformAdminEn from "./locales/en/platformAdmin.json";
import type websiteEn from "./locales/en/website.json";
import type legalEn from "./locales/en/legal.json";
import type authEn from "./locales/en/auth.json";
import type signInEn from "./locales/en/signIn.json";
import type referralsEn from "./locales/en/referrals.json";
import type messagesEn from "./locales/en/messages.json";
import type mandatesEn from "./locales/en/mandates.json";
import type requestsEn from "./locales/en/requests.json";
import type networkEn from "./locales/en/network.json";
import type matchmakingEn from "./locales/en/matchmaking.json";
import type dataOwnershipEn from "./locales/en/dataOwnership.json";
import type createOrganizationEn from "./locales/en/createOrganization.json";
import type encryptionEn from "./locales/en/encryption.json";
import type importEn from "./locales/en/import.json";
import type landingEn from "./locales/en/landing.json";
import type docsEn from "./locales/en/docs.json";
import type conversionEn from "./locales/en/conversion.json";
import type onboardingEn from "./locales/en/onboarding.json";
import type cookiesEn from "./locales/en/cookies.json";
import type activitiesEn from "./locales/en/activities.json";
import type documentTemplatesEn from "./locales/en/document-templates.json";
import type archiveEn from "./locales/en/archive.json";

// Mirrors the runtime shape built by loadMessages() in i18n.ts and
// getLocales() in app/[locale]/layout.tsx.
//
// - typeof commonEn & typeof navigationEn spread at the root via Object.assign
// - Each namespace is also nested under its own key
// - "Notifications" (capital N) aliases notificationsEn for backward compat
// - "networkSettings" aliases networkEn["matchmaking"]
type AppMessages = typeof commonEn &
  typeof navigationEn & {
    RootLayout: typeof rootEn;
    common: typeof commonEn;
    navigation: typeof navigationEn;
    dashboard: typeof dashboardEn;
    reports: typeof reportsEn;
    crm: typeof crmEn;
    mls: typeof mlsEn;
    admin: typeof adminEn;
    validation: typeof validationEn;
    email: typeof emailEn;
    setLanguage: typeof setLanguageEn;
    feedback: typeof feedbackEn;
    register: typeof registerEn;
    calendar: typeof calendarEn;
    documents: typeof documentsEn;
    notifications: typeof notificationsEn;
    Notifications: typeof notificationsEn;
    feed: typeof feedEn;
    socialFeed: typeof socialFeedEn;
    connections: typeof connectionsEn;
    deals: typeof dealsEn;
    sharedWithMe: typeof sharedWithMeEn;
    profile: typeof profileEn;
    templates: typeof templatesEn;
    share: typeof shareEn;
    platformAdmin: typeof platformAdminEn;
    website: typeof websiteEn;
    legal: typeof legalEn;
    auth: typeof authEn;
    signIn: typeof signInEn;
    referrals: typeof referralsEn;
    messages: typeof messagesEn;
    mandates: typeof mandatesEn;
    requests: typeof requestsEn;
    network: typeof networkEn;
    matchmaking: typeof matchmakingEn;
    networkSettings: (typeof networkEn)["matchmaking"];
    dataOwnership: typeof dataOwnershipEn;
    createOrganization: typeof createOrganizationEn;
    encryption: typeof encryptionEn;
    import: typeof importEn;
    landing: typeof landingEn;
    docs: typeof docsEn;
    conversion: typeof conversionEn;
    onboarding: typeof onboardingEn;
    cookies: typeof cookiesEn;
    activities: typeof activitiesEn;
    "document-templates": typeof documentTemplatesEn;
    archive: typeof archiveEn;
  };

declare module "next-intl" {
  interface AppConfig {
    Messages: AppMessages;
  }
}
