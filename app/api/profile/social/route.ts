import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    const profile = await prismadb.agentProfile.findUnique({
      where: { userId: currentUser.id },
      include: {
        Users: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            username: true,
          },
        },
      },
    });

    // Return profile with slug derived from username
    if (profile) {
      return NextResponse.json({
        ...profile,
        user: profile.Users,
        slug: profile.Users?.username || profile.slug,
      });
    }

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[SOCIAL_PROFILE_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    const body = await req.json();

    // Profile URL is based on username - user must have a username set
    if (!currentUser.username) {
      return new NextResponse(
        "Please set your username in your account settings first. Your username will be your public profile URL.",
        { status: 400 }
      );
    }

    const {
      bio,
      publicPhone,
      publicEmail,
      specializations,
      serviceAreas,
      languages,
      yearsExperience,
      certifications,
      socialLinks,
      visibility,
      hideFromAgentSearch,
    } = body;

    // Validate visibility
    const validVisibilities = ["PERSONAL", "SECURE", "PUBLIC"];
    if (visibility && !validVisibilities.includes(visibility)) {
      return new NextResponse("Invalid visibility setting", { status: 400 });
    }

    // The slug is synced with username for database consistency
    const slug = currentUser.username.toLowerCase();

    const profileData = {
      slug,
      bio: bio || null,
      publicPhone: publicPhone || null,
      publicEmail: publicEmail || currentUser.email,
      specializations: specializations || [],
      serviceAreas: serviceAreas || [],
      languages: languages || [],
      yearsExperience: yearsExperience || null,
      certifications: certifications || [],
      socialLinks: socialLinks || {},
      visibility: visibility || "PERSONAL",
      hideFromAgentSearch: hideFromAgentSearch ?? false,
    };

    const profile = await prismadb.agentProfile.upsert({
      where: { userId: currentUser.id },
      update: profileData,
      create: {
        id: crypto.randomUUID(),
        userId: currentUser.id,
        updatedAt: new Date(),
        ...profileData,
      },
    });

    return NextResponse.json(profile);
  } catch (error) {
    console.error("[SOCIAL_PROFILE_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
