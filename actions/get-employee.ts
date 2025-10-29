import { prismadb } from "@/lib/prisma";

export const getEmployee = async (employeeId: string) => {
  const data = await prismadb.employees.findUnique({
    where: { id: employeeId },
  });
  return data;
};

