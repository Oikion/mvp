import "server-only";

export const getDictionary = async (locale: string = "en") => {
  const supported = new Set(["en", "el"]);
  const resolved = supported.has(locale) ? locale : "en";
  const module = await import(`./locales/${resolved}.json`);
  return module.default;
};
