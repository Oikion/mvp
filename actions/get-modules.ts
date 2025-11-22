import { prismadb } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const getModules = async () => {
  const { userId } = await auth();
  if (!userId) return [];

  const data = await prismadb.system_Modules_Enabled.findMany({
    orderBy: [{ position: "asc" }],
  });
  return data;
};
