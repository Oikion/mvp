import { prismadb } from "@/lib/prisma";
import { generateFriendlyId } from "@/lib/friendly-id";

const SYSTEM_EMAIL = "external-messaging@oikion.system";
const SYSTEM_NAME = "External Contact";

export async function getExternalSystemUser() {
  const existing = await prismadb.users.findUnique({
    where: { email: SYSTEM_EMAIL },
    select: { id: true },
  });

  if (existing) {
    return existing;
  }

  const id = await generateFriendlyId(prismadb, "Users");
  return prismadb.users.create({
    data: {
      id,
      email: SYSTEM_EMAIL,
      name: SYSTEM_NAME,
      username: "external-contact",
      userStatus: "ACTIVE",
    },
    select: { id: true },
  });
}
