import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getActiveN8nConfig, setN8nWorkflowActive } from "@/lib/n8n-admin";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { workflowId } = await params;

    const body = (await req.json().catch(() => ({}))) as { active?: unknown };
    const active = Boolean(body.active);

    const n8nConfig = await getActiveN8nConfig();
    const baseUrl = n8nConfig?.baseUrl || process.env.N8N_BASE_URL || "";
    if (!baseUrl) {
      return NextResponse.json(
        { error: "n8n not configured (missing baseUrl / N8N_BASE_URL)" },
        { status: 400 }
      );
    }

    await setN8nWorkflowActive(baseUrl, workflowId, active);
    return NextResponse.json({ success: true, workflowId, active });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to update n8n workflow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

