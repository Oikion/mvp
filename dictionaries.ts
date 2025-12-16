import "server-only";

// Static imports for all translation files
import commonEn from "./locales/en/common.json";
import rootEn from "./locales/en/root.json";
import navigationEn from "./locales/en/navigation.json";
import dashboardEn from "./locales/en/dashboard.json";
import reportsEn from "./locales/en/reports.json";
import crmEn from "./locales/en/crm.json";
import mlsEn from "./locales/en/mls.json";
import adminEn from "./locales/en/admin.json";
import validationEn from "./locales/en/validation.json";
import emailEn from "./locales/en/email.json";
import setLanguageEn from "./locales/en/setLanguage.json";
import feedbackEn from "./locales/en/feedback.json";
import chatgptEn from "./locales/en/chatgpt.json";
import registerEn from "./locales/en/register.json";
import calendarEn from "./locales/en/calendar.json";
import documentsEn from "./locales/en/documents.json";
import notificationsEn from "./locales/en/notifications.json";
import feedEn from "./locales/en/feed.json";
import socialFeedEn from "./locales/en/socialFeed.json";
import connectionsEn from "./locales/en/connections.json";
import dealsEn from "./locales/en/deals.json";
import sharedWithMeEn from "./locales/en/sharedWithMe.json";
import audiencesEn from "./locales/en/audiences.json";
import profileEn from "./locales/en/profile.json";
import templatesEn from "./locales/en/templates.json";
import onboardingEn from "./locales/en/onboarding.json";
import importEn from "./locales/en/import.json";
import conversionEn from "./locales/en/conversion.json";
import signInEn from "./locales/en/signIn.json";

import commonEl from "./locales/el/common.json";
import rootEl from "./locales/el/root.json";
import navigationEl from "./locales/el/navigation.json";
import dashboardEl from "./locales/el/dashboard.json";
import reportsEl from "./locales/el/reports.json";
import crmEl from "./locales/el/crm.json";
import mlsEl from "./locales/el/mls.json";
import adminEl from "./locales/el/admin.json";
import validationEl from "./locales/el/validation.json";
import emailEl from "./locales/el/email.json";
import setLanguageEl from "./locales/el/setLanguage.json";
import feedbackEl from "./locales/el/feedback.json";
import chatgptEl from "./locales/el/chatgpt.json";
import registerEl from "./locales/el/register.json";
import calendarEl from "./locales/el/calendar.json";
import documentsEl from "./locales/el/documents.json";
import notificationsEl from "./locales/el/notifications.json";
import feedEl from "./locales/el/feed.json";
import socialFeedEl from "./locales/el/socialFeed.json";
import connectionsEl from "./locales/el/connections.json";
import dealsEl from "./locales/el/deals.json";
import sharedWithMeEl from "./locales/el/sharedWithMe.json";
import audiencesEl from "./locales/el/audiences.json";
import profileEl from "./locales/el/profile.json";
import templatesEl from "./locales/el/templates.json";
import onboardingEl from "./locales/el/onboarding.json";
import importEl from "./locales/el/import.json";
import conversionEl from "./locales/el/conversion.json";
import signInEl from "./locales/el/signIn.json";

function loadMessages(locale: string) {
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
    messages.chatgpt = chatgptEl;
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
    messages.onboarding = onboardingEl;
    messages.import = importEl;
    messages.conversion = conversionEl;
    messages.signIn = signInEl;
    // Spread notifications contents directly into messages (for backward compatibility)
    Object.assign(messages, notificationsEl);
    // Also keep it nested for namespace access (useTranslations("notifications"))
    messages.notifications = notificationsEl;
    messages.Notifications = notificationsEl; // Capital N for compatibility
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
    messages.chatgpt = chatgptEn;
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
    messages.onboarding = onboardingEn;
    messages.import = importEn;
    messages.conversion = conversionEn;
    messages.signIn = signInEn;
    // Spread notifications contents directly into messages (for backward compatibility)
    Object.assign(messages, notificationsEn);
    // Also keep it nested for namespace access (useTranslations("notifications"))
    messages.notifications = notificationsEn;
    messages.Notifications = notificationsEn; // Capital N for compatibility
  }

  return messages;
}

export const getDictionary = async (locale: string = "en") => {
  const supported = new Set(["en", "el"]);
  const resolved = supported.has(locale) ? locale : "en";
  return loadMessages(resolved);
};
