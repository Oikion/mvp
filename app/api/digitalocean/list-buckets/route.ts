import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/digital-ocean-s3";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import { getCurrentUser } from "@/lib/get-current-user";

export async function GET(request: NextRequest) {
  try {
    await getCurrentUser();
    const buckets = await s3Client.send(new ListBucketsCommand({}));
    console.log(buckets, "s3 buckets");
    return NextResponse.json({ buckets, success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
}
