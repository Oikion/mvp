import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgId } from "@/lib/get-current-user";
import { prismaForOrg } from "@/lib/tenant";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(req: Request) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgId();
    const body = await req.json();

    const search = body.data || body.query;

    if (!search || search.length < 2) {
      return NextResponse.json({ data: {} }, { status: 200 });
    }

    const db = prismaForOrg(organizationId);

    // Search the unified Contact model. Companies surface as "clients" and
    // individuals as "contacts" to preserve the legacy response shape.
    // NOTE: displayName/email/notes are encrypted at rest, so substring search
    // only matches plaintext fields (friendlyId). Full PII search would need a
    // dedicated search-token index (out of scope here).
    const resultsContacts = await db.contact.findMany({
      where: {
        OR: [
          { displayName: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
          { friendlyId: { contains: search, mode: "insensitive" } },
        ],
      },
      take: 10,
    });
    const resultsCrmClients = resultsContacts.filter((c) => c.isCompany);
    const resultsCrmContacts = resultsContacts.filter((c) => !c.isCompany);

    //Search in local user database (scoped to current organization via Clerk)
    let resultsUser: { id: string; name: string | null; email: string; username: string | null }[] = [];
    if (organizationId) {
      const clerk = await clerkClient();
      const memberships = await clerk.organizations.getOrganizationMembershipList({
        organizationId,
        limit: 200,
      });
      const memberClerkIds = memberships.data
        .map(m => m.publicUserData?.userId)
        .filter(Boolean) as string[];

      if (memberClerkIds.length > 0) {
        resultsUser = await prismadb.users.findMany({
          where: {
            clerkUserId: { in: memberClerkIds },
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { account_name: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
            ],
          },
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
          take: 5,
        });
      }
    }

    const data = {
      clients: resultsCrmClients,
      contacts: resultsCrmContacts,
      users: resultsUser,
    };

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: unknown) {
    console.error("[FULLTEXT_SEARCH]", error);
    
    // Handle authentication errors
    if (error instanceof Error && (error.message === "User not authenticated" || error.message === "User not found in database")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    
    // Handle Prisma connection errors
    if (error && typeof error === "object" && "code" in error && (error as { code: string }).code === "P2024") {
      return NextResponse.json({ error: "Database connection error. Please try again." }, { status: 503 });
    }
    
    return NextResponse.json(
      { error: "Search failed" },
      { status: 500 }
    );
  }
}
