import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function PUT(req: Request, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  
  try {
    // Get the current authenticated user from database
    const currentUser = await getCurrentUser();
    const { language } = await req.json();

    if (!language) {
      return NextResponse.json(
        { error: "No language provided" },
        { status: 400 }
      );
    }

    // Validate that the language is one of the available locales
    const validLanguages = ["en", "el"];
    if (!validLanguages.includes(language)) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${validLanguages.join(", ")}` },
        { status: 400 }
      );
    }

    if (currentUser.id !== params.userId && !currentUser.is_admin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Use the current user's database ID, not the userId from params
    // This ensures we're updating the correct user and prevents unauthorized updates
    const updatedUser = await prismadb.users.update({
      data: {
        userLanguage: language,
      },
      where: {
        id: params.userId,
      },
    });

    return NextResponse.json(
      { language: language, userId: updatedUser.id },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[NEWUSER_LANG_PUT]", error);
    
    // Provide more specific error messages
    if (error?.message === "User not authenticated") {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }
    
    if (error?.message === "User not found in database") {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Failed to update user language" },
      { status: 500 }
    );
  }
}
