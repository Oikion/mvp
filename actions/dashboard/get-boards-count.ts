import { prismadb } from "@/lib/prisma";

export const getBoardsCount = async () => {
  const data = await prismadb.estateFiles.count();
  return data;
};
