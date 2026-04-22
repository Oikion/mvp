import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/digital-ocean-s3";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { isPlatformAdmin } from "@/lib/platform-admin";

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isPlatformAdmin();
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const buckets = await s3Client.send(new ListBucketsCommand({}));
    return NextResponse.json({ buckets, success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
