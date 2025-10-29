import "server-only";

export const getDictionary = async () =>
  import("./locales/en.json").then((module) => module.default);
