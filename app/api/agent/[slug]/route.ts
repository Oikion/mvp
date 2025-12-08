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
    const profile = await prismadb.agentProfile.findFirst({
      where: {
        slug,
        visibility: isAuthenticated 
          ? { in: ["PUBLIC", "SECURE"] } 
          : "PUBLIC",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            properties: {
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
                linkedDocuments: {
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
                properties: {
                  where: {
                    portal_visibility: "PUBLIC",
                    property_status: "ACTIVE",
                  },
                },
                followers: {
                  where: { status: "ACCEPTED" },
                },
                following: {
                  where: { status: "ACCEPTED" },
                },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return new NextResponse("Profile not found", { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[AGENT_PROFILE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
