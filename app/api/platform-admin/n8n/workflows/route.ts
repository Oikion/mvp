import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/platform-admin";
import { getActiveN8nConfig, listN8nWorkflows } from "@/lib/n8n-admin";

export async function GET() {
  try {
    await requirePlatformAdmin();

    const n8nConfig = await getActiveN8nConfig();
    const baseUrl = n8nConfig?.baseUrl || process.env.N8N_BASE_URL || "";

    if (!baseUrl) {
      return NextResponse.json(
        { error: "n8n not configured (missing baseUrl / N8N_BASE_URL)" },
        { status: 400 }
      );
    }

    const workflows = await listN8nWorkflows(baseUrl);
    return NextResponse.json({ workflows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to list n8n workflows";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

