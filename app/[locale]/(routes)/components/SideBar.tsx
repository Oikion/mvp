import { getModules } from "@/actions/get-modules";
import ModuleMenu from "./ModuleMenu";
import { getCurrentUser } from "@/lib/get-current-user";
import { getDictionary } from "@/dictionaries";

const SideBar = async ({ build }: { build: number }) => {
  try {
    await getCurrentUser();
  } catch (error) {
    return null;
  }

  const modules = await getModules();

  if (!modules) return null;

  const dict = await getDictionary();

  if (!dict) return null;

  return <ModuleMenu modules={modules} dict={dict} build={build} />;
};

export default SideBar;
