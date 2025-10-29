import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale }) => {
  const fallbackLocale = "en";
  const resolvedLocale = typeof locale === "string" && locale ? locale : fallbackLocale;

  let messages;
  try {
    messages = (await import(`./locales/${resolvedLocale}.json`)).default;
  } catch {
    messages = (await import(`./locales/${fallbackLocale}.json`)).default;
  }

  return {
    locale: resolvedLocale,
    messages,
    timeZone: "Europe/Prague",
  };
});
