import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { TemplateType } from "@prisma/client";
import {
  getTemplateDefinition,
  validatePlaceholders,
  generatePDF,
  generateFilename,
} from "@/lib/templates";
import { canPerformAction } from "@/lib/permissions/action-service";

const GenerateBodySchema = z.object({
  templateType: z.string(),
  values: z.record(z.string(), z.string().max(2000)).refine(
    (v) => Object.keys(v).length <= 100,
    { message: "Too many template fields" }
  ),
  locale: z.enum(["en", "el"]).optional().default("el"),
}).strict();

export async function POST(req: Request) {
  try {
    // Permission check: Users need template:use permission
    const useCheck = await canPerformAction("template:use");
    if (!useCheck.allowed) {
      return NextResponse.json({ error: useCheck.reason }, { status: 403 });
    }

    await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const parsed = GenerateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { templateType: templateTypeRaw, values, locale } = parsed.data;
    const templateType = templateTypeRaw as TemplateType;

    // Get template definition
    const definition = getTemplateDefinition(templateType);
    if (!definition) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    // Validate required fields
    const { valid, missing } = validatePlaceholders(definition.placeholders, values);
    if (!valid) {
      const missingLabels = missing.map((key) => {
        const placeholder = definition.placeholders.find((p) => p.key === key);
        if (!placeholder) return key;
        return locale === "el" ? placeholder.labelEl : placeholder.labelEn;
      });
      return NextResponse.json(
        { error: "Missing required fields", missing: missingLabels },
        { status: 400 }
      );
    }

    // Generate PDF
    const pdfBlob = await generatePDF(definition, values, locale);
    const filename = generateFilename(definition, locale);

    // Convert blob to buffer
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Return PDF as response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (error: unknown) {
    console.error("[TEMPLATE_GENERATE]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// GET endpoint to preview template fields
export async function GET(req: Request) {
  try {
    // Permission check: Users need template:read permission
    const readCheck = await canPerformAction("template:read");
    if (!readCheck.allowed) {
      return NextResponse.json({ error: readCheck.reason }, { status: 403 });
    }

    await getCurrentUser();

    const { searchParams } = new URL(req.url);
    const templateType = searchParams.get("type") as TemplateType | null;

    if (!templateType) {
      return NextResponse.json(
        { error: "Template type is required" },
        { status: 400 }
      );
    }

    const definition = getTemplateDefinition(templateType);
    if (!definition) {
      return NextResponse.json(
        { error: "Template not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      type: definition.type,
      name: definition.name,
      nameEn: definition.nameEn,
      nameEl: definition.nameEl,
      descriptionEn: definition.descriptionEn,
      descriptionEl: definition.descriptionEl,
      placeholders: definition.placeholders,
    });
  } catch (error: unknown) {
    console.error("[TEMPLATE_GET]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
