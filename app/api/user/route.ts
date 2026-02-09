import { NextResponse } from "next/server";
import { ReservedNameType } from "@prisma/client";
import { hash } from "bcryptjs";

import { generateFriendlyId } from "@/lib/friendly-id";
import { getCurrentUser } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { isReservedName } from "@/lib/reserved-names";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, username, email, language, password, confirmPassword } = body;

    if (!name || !email || !language || !password || !confirmPassword) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }

    if (password !== confirmPassword) {
      return new NextResponse("Password does not match", { status: 401 });
    }

    const userCount = await prismadb.users.count();
    if (userCount > 0) {
      const requester = await getCurrentUser();
      if (!requester.is_admin) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    const checkexisting = await prismadb.users.findFirst({
      where: {
        email: email,
      },
    });

    if (checkexisting) {
      return new NextResponse("User already exist", { status: 401 });
    }

    // Generate username from email if not provided
    const generatedUsername = username || email.split("@")[0] || `user_${Date.now()}`;

    const reserved = await isReservedName({
      type: ReservedNameType.USERNAME,
      value: generatedUsername,
    });

    if (reserved) {
      return new NextResponse("Username is reserved", { status: 409 });
    }
    
    if (userCount === 0) {
      //There is no user in the system, so create user with admin rights and set userStatus to ACTIVE
      // Generate friendly ID
      const userId = await generateFriendlyId(prismadb, "Users");
      
      const user = await prismadb.users.create({
        data: {
          id: userId,
          name,
          username: generatedUsername,
          avatar: "",
          account_name: "",
          is_account_admin: false,
          is_admin: true,
          email,
          userLanguage: language,
          userStatus: "ACTIVE",
          password: await hash(password, 12),
        },
      });
      
      // First user doesn't need admin notification
      return NextResponse.json(user);
    } else {
      //There is at least one user in the system, so create user with no admin rights and set userStatus to ACTIVE
      // Generate friendly ID
      const userId = await generateFriendlyId(prismadb, "Users");
      
      const user = await prismadb.users.create({
        data: {
          id: userId,
          name,
          username: generatedUsername,
          avatar: "",
          account_name: "",
          is_account_admin: false,
          is_admin: false,
          email,
          userLanguage: language,
          userStatus: "ACTIVE", // Always create users as ACTIVE - no admin approval needed
          password: await hash(password, 12),
        },
      });

      // Admin notification disabled - users are automatically active
      // newUserNotify(user);

      return NextResponse.json(user);
    }
  } catch (error: unknown) {
    console.error("[USER_POST]", error);
    
    // Handle authentication errors
    if (error instanceof Error && (error.message === "User not authenticated" || error.message === "User not found in database")) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    
    // Handle Prisma connection errors
    if (error && typeof error === "object" && "code" in error) {
      if (error.code === "P2024") {
        return new NextResponse("Database connection error. Please try again.", { status: 503 });
      }
      if (error.code === "P2002") {
        return new NextResponse("User with this email already exists", { status: 409 });
      }
    }
    
    return new NextResponse(
      error instanceof Error ? error.message : "Failed to create user",
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user?.is_admin) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const users = await prismadb.users.findMany({});

    return NextResponse.json(users);
  } catch (error: unknown) {
    console.error("[USER_GET]", error);
    
    // Handle authentication errors properly
    if (error instanceof Error && (error.message === "User not authenticated" || error.message === "User not found in database")) {
      return new NextResponse("Unauthenticated", { status: 401 });
    }
    
    // Handle Prisma connection errors
    if (error && typeof error === "object" && "code" in error && error.code === "P2024") {
      return new NextResponse("Database connection error. Please try again.", { status: 503 });
    }
    
    return new NextResponse(
      error instanceof Error ? error.message : "Failed to fetch users",
      { status: 500 }
    );
  }
}
