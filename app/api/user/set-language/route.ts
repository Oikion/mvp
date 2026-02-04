import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";

export async function PUT(req: Request) {
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

    // Update the current authenticated user's language
    const updatedUser = await prismadb.users.update({
      data: {
        userLanguage: language,
      },
      where: {
        id: currentUser.id,
      },
    });

    return NextResponse.json(
      { language: language, userId: updatedUser.id },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[SET_LANGUAGE_PUT]", error);
    
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

