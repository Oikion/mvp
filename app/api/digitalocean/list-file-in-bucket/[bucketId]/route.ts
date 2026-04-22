import { NextRequest, NextResponse } from "next/server";
import { s3Client } from "@/lib/digital-ocean-s3";
import { ListObjectsCommand } from "@aws-sdk/client-s3";
import { getCurrentUser } from "@/lib/get-current-user";

// Allowlist of buckets this endpoint is permitted to list.
// Any bucketId not in this set is rejected with 404 to prevent enumeration.
const ALLOWED_BUCKETS = new Set(
  [process.env.DO_BUCKET].filter(Boolean) as string[]
);

export async function GET(request: NextRequest, props: { params: Promise<{ bucketId: string }> }) {
  const params = await props.params;

  try {
    await getCurrentUser();
    const { bucketId } = params;

    if (!bucketId) {
      return NextResponse.json({ error: "No bucketId" }, { status: 400 });
    }

    // Prevent bucket enumeration: only allow configured buckets
    if (!ALLOWED_BUCKETS.has(bucketId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = await s3Client.send(new ListObjectsCommand({ Bucket: bucketId }));

    // Return only safe fields — never expose raw S3 response ($metadata, etc.)
    const files = (data.Contents ?? []).map((obj) => ({
      key: obj.Key,
      size: obj.Size,
      lastModified: obj.LastModified,
    }));

    return NextResponse.json({ files }, { status: 200 });
  } catch (error: unknown) {
    const code = (error as { Code?: string }).Code;
    if (code === "NoSuchBucket") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[LIST_BUCKET_FILES]", error);
    return NextResponse.json({ error: "Storage error" }, { status: 500 });
  }
}
