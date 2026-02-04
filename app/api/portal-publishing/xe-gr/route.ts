import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { forwardXeGrPackage, type XeGrPublishAction } from "@/lib/portal-publishing/xe-gr-client";

export const dynamic = "force-dynamic";

function resolveAction(action?: string | null): XeGrPublishAction {
  if (!action) return "add";
  const normalized = action.toLowerCase();
  if (normalized === "add" || normalized === "remove") {
    return normalized;
  }
  throw new Error("Invalid action. Use 'add' or 'remove'.");
}

export async function POST(req: NextRequest) {
  try {
    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const action = resolveAction(
      (formData.get("action") as string | null) ??
        req.nextUrl.searchParams.get("action")
    );

    if (!file) {
      return NextResponse.json(
        { error: "Zip file is required" },
        { status: 400 }
      );
    }

    const result = await forwardXeGrPackage(action, file);

    return NextResponse.json(
      {
        action,
        status: result.status,
        ok: result.ok,
        response: result.body,
      },
      { status: result.status }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal error";
    console.error("[XE_GR_PUBLISH]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
