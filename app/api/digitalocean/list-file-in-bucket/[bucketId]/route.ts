import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/digital-ocean-s3";
import {
  BucketAlreadyExists,
  ListBucketsCommand,
  ListObjectsCommand,
} from "@aws-sdk/client-s3";
import { getCurrentUser } from "@/lib/get-current-user";

export async function GET(request: NextRequest, props: { params: Promise<{ bucketId: string }> }) {
  const params = await props.params;
  
  try {
    await getCurrentUser();
    const { bucketId } = params;

    if (!bucketId) {
      return NextResponse.json("No bucketId ", { status: 400 });
    }

    const bucketParams = { Bucket: bucketId };
    const data = await s3Client.send(new ListObjectsCommand(bucketParams));

    return NextResponse.json({ files: data, success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json("Unauthorized", { status: 401 });
  }
}
