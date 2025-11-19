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
  }

  return messages;
}

export const getDictionary = async (locale: string = "en") => {
  const supported = new Set(["en", "el"]);
  const resolved = supported.has(locale) ? locale : "en";
  return loadMessages(resolved);
};
