import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listActivities } from "@/actions/activities";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parentType = searchParams.get("parentType");
    const parentId = searchParams.get("parentId");

    if (!parentType || !parentId) {
      return NextResponse.json(
        { error: "parentType and parentId are required" },
        { status: 400 }
      );
    }

    const result = await listActivities(parentType, parentId);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (error) {
    console.error("[API_ACTIVITIES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
