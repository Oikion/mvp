import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUserSafe } from "@/lib/get-current-user";

export async function GET(
  req: Request,
  props: { params: Promise<{ slug: string }> }
) {
  try {
    const params = await props.params;
    const { slug } = params;

    if (!slug) {
      return new NextResponse("Slug is required", { status: 400 });
    }

    // Check if user is authenticated
    const currentUser = await getCurrentUserSafe();
    const isAuthenticated = !!currentUser;

    // Build visibility filter based on authentication status
    // - PUBLIC profiles are visible to everyone
    // - SECURE profiles are only visible to authenticated users
    // - PERSONAL profiles are never visible via this endpoint
    const profileRaw = await prismadb.agentProfile.findFirst({
      where: {
        slug,
        visibility: isAuthenticated 
          ? { in: ["PUBLIC", "SECURE"] } 
          : "PUBLIC",
      },
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            avatar: true,
            Properties_Properties_assigned_toToUsers: {
              where: {
                portal_visibility: "PUBLIC",
                property_status: "ACTIVE",
              },
              select: {
                id: true,
                property_name: true,
                property_type: true,
                price: true,
                address_city: true,
                address_state: true,
                bedrooms: true,
                bathrooms: true,
                square_feet: true,
                size_net_sqm: true,
                transaction_type: true,
                Documents: {
                  where: {
                    document_file_mimeType: {
                      startsWith: "image/",
                    },
                  },
                  select: {
                    document_file_url: true,
                  },
                  take: 1,
                },
              },
              orderBy: { createdAt: "desc" },
            },
            _count: {
              select: {
                Properties_Properties_assigned_toToUsers: {
                  where: {
                    portal_visibility: "PUBLIC",
                    property_status: "ACTIVE",
                  },
                },
                AgentConnection_AgentConnection_followerIdToUsers: {
                  where: { status: "ACCEPTED" },
                },
                AgentConnection_AgentConnection_followingIdToUsers: {
                  where: { status: "ACCEPTED" },
                },
              },
            },
          },
        },
      },
    });

    if (!profileRaw) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    // Map to expected field names for backward compatibility
    const profile = {
      ...profileRaw,
      user: profileRaw.Users ? {
        ...profileRaw.Users,
        properties: profileRaw.Users.Properties_Properties_assigned_toToUsers.map((p) => ({
          ...p,
          linkedDocuments: p.Documents,
        })),
        _count: {
          properties: profileRaw.Users._count.Properties_Properties_assigned_toToUsers,
          followers: profileRaw.Users._count.AgentConnection_AgentConnection_followerIdToUsers,
          following: profileRaw.Users._count.AgentConnection_AgentConnection_followingIdToUsers,
        },
      } : null,
    };

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[AGENT_PROFILE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
