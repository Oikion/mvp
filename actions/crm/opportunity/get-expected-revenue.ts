import { prismadb } from "@/lib/prisma";

export const getExpectedRevenue = async () => {
  // Opportunities removed in Real Estate CRM; revenue calculation TBD
  return 0;
};
