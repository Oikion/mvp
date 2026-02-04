import { prismadb } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const getEmployee = async (employeeId: string) => {
  const { userId } = await auth();
  if (!userId) return null;

  const data = await prismadb.employees.findUnique({
    where: { id: employeeId },
  });
  return data;
};

