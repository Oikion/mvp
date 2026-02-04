import ModuleMenu from "./ModuleMenu";
import { getCurrentUser } from "@/lib/get-current-user";
import { getDictionary } from "@/dictionaries";

const SideBar = async ({ build, locale }: { build: number, locale: string }) => {
  try {
    await getCurrentUser();
  } catch (error) {
    return null;
  }

  const dict = await getDictionary(locale);

  if (!dict) return null;

  return <ModuleMenu dict={dict} build={build} />;
};

export default SideBar;
