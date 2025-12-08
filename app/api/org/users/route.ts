import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { getOrgMembersFromDb } from "@/lib/org-members";
import { getCurrentOrgIdSafe } from "@/lib/get-current-user";

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
    // Use getCurrentOrgId instead of destructuring from getOrgMembersFromDb result
    // because getOrgMembersFromDb internally calls getCurrentOrgId if not provided,
    // but we want to be explicit about the org context source.
    const organizationId = await getCurrentOrgIdSafe();
    
    if (!organizationId) {
        return new NextResponse("Organization ID is missing", { status: 400 });
    }

    const { memberships, users } = await getOrgMembersFromDb({
      organizationId,
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
          dbUser?.avatar ?? (member.publicUserData as any)?.imageUrl ?? null,
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
