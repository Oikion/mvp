import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getActiveN8nConfig, runN8nWorkflow } from "@/lib/n8n-admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  try {
    await requirePlatformAdmin();
    const { workflowId } = await params;

    const n8nConfig = await getActiveN8nConfig();
    const baseUrl = n8nConfig?.baseUrl || process.env.N8N_BASE_URL || "";
    if (!baseUrl) {
      return NextResponse.json(
        { error: "n8n not configured (missing baseUrl / N8N_BASE_URL)" },
        { status: 400 }
      );
    }

    const result = await runN8nWorkflow(baseUrl, workflowId);
    return NextResponse.json({ success: true, workflowId, result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to run n8n workflow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

