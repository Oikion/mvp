import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getOrgMembersFromDb } from "@/lib/org-members";

interface SanitizedUser {
  id: string;
  name: string | null;
  email: string | null;
  avatar: string | null;
  userLanguage: string | null;
  userStatus: string | null;
  role: string | null;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    const { organizationId, memberships, users } = await getOrgMembersFromDb({
      select: {
        id: true,
        clerkUserId: true,
        name: true,
        email: true,
        avatar: true,
        userLanguage: true,
        userStatus: true,
      },
    });

    const userByClerkId = new Map(
      users
        .filter((u) => u.clerkUserId)
        .map((u) => [u.clerkUserId as string, u])
    );

    const sanitized: SanitizedUser[] = memberships.map((member) => {
      const dbUser = member.publicUserData?.userId
        ? userByClerkId.get(member.publicUserData.userId)
        : undefined;

      return {
        id: dbUser?.id ?? member.id,
        name: dbUser?.name ?? member.publicUserData?.firstName ?? null,
        email: dbUser?.email ?? member.publicUserData?.identifier ?? null,
        avatar:
          dbUser?.avatar ?? member.publicUserData?.profileImageUrl ?? null,
        userLanguage: dbUser?.userLanguage ?? null,
        userStatus: dbUser?.userStatus ?? null,
        role: member.role ?? null,
      };
    });

    return NextResponse.json({
      users: sanitized,
      currentUserId: currentUser.id,
      organizationId: organizationId,
    });
  } catch (error) {
    console.error("[ORG_USERS_GET]", error);
    return new NextResponse("Failed to load organization users", {
      status: 500,
    });
  }
}

