"use server";

import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";

import { generateRandomPassword } from "@/lib/utils";

import { hash } from "bcryptjs";
import PasswordResetEmail from "@/emails/PasswordReset";
import resendHelper from "@/lib/resend";

export async function POST(req: Request) {
  return new NextResponse(
    "Password reset via REST API has been disabled. Use Clerk's recovery flow.",
    { status: 410 }
  );
}
