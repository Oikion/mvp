import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { prismadb } from "@/lib/prisma";
import { getCurrentOrgId } from "@/lib/get-current-user";
import { encryptEmailInboxForOrg } from "@/lib/model-encryption";
import { generateFriendlyId } from "@/lib/friendly-id";
import { requireAction, handleGuardError } from "@/lib/permissions/action-guards";

const createInboxSchema = z.object({
  channelName: z.string().min(1).max(80),
  fromAddress: z.string().email(),
  fromName: z.string().max(100).optional(),
  imapHost: z.string().min(1),
  imapPort: z.number().int().min(1).max(65535).default(993),
  imapUseTLS: z.boolean().default(true),
  imapUser: z.string().min(1),
  imapPassword: z.string().min(1),
  smtpSendVia: z.enum(["RESEND_CUSTOM_DOMAIN", "SMTP_DIRECT"]).default("RESEND_CUSTOM_DOMAIN"),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
}).strict();

/**
 * POST /api/settings/email-inboxes
 * Create a new EMAIL channel + EmailInboxConfig in one transaction.
 */
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = await getCurrentOrgId();
    const guard = await requireAction("messaging:create_channel");
    if (guard) return handleGuardError(guard);

    const body = await req.json();
    const parsed = createInboxSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const slug = data.channelName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 80);

    const existing = await prismadb.channel.findFirst({
      where: { organizationId, slug },
    });
    if (existing) {
      return NextResponse.json({ error: "A channel with that name already exists" }, { status: 409 });
    }

    const encrypted = await encryptEmailInboxForOrg(
      {
        imapHost: data.imapHost,
        imapUser: data.imapUser,
        imapPasswordEncrypted: data.imapPassword,
        smtpHost: data.smtpHost ?? null,
        smtpUser: data.smtpUser ?? null,
        smtpPasswordEncrypted: data.smtpPassword ?? null,
      },
      organizationId
    );

    const channelId = await generateFriendlyId(prismadb, "Channel", organizationId);

    const channel = await prismadb.channel.create({
      data: {
        id: channelId,
        organizationId,
        name: data.channelName,
        slug,
        channelType: "PRIVATE",
        source: "EMAIL",
        isE2ee: false,
        emailInbox: {
          create: {
            fromAddress: data.fromAddress,
            fromName: data.fromName ?? null,
            imapHost: encrypted.imapHost ?? data.imapHost,
            imapPort: data.imapPort,
            imapUseTLS: data.imapUseTLS,
            imapUser: encrypted.imapUser ?? data.imapUser,
            imapPasswordEncrypted: encrypted.imapPasswordEncrypted ?? "",
            smtpSendVia: data.smtpSendVia,
            smtpHost: encrypted.smtpHost ?? null,
            smtpPort: data.smtpPort ?? null,
            smtpUser: encrypted.smtpUser ?? null,
            smtpPasswordEncrypted: encrypted.smtpPasswordEncrypted ?? null,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        source: true,
        emailInbox: {
          select: {
            id: true,
            fromAddress: true,
            fromName: true,
            imapHost: true,
            imapPort: true,
            imapUser: true,
            smtpSendVia: true,
            isActive: true,
            lastPolledAt: true,
          },
        },
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error("[API_EMAIL_INBOXES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * GET /api/settings/email-inboxes
 * List all email inboxes for the org (credentials redacted).
 */
export async function GET(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = await getCurrentOrgId();
    const guard = await requireAction("messaging:create_channel");
    if (guard) return handleGuardError(guard);

    const channels = await prismadb.channel.findMany({
      where: { organizationId, source: "EMAIL", isArchived: false },
      select: {
        id: true,
        name: true,
        slug: true,
        source: true,
        emailInbox: {
          select: {
            id: true,
            fromAddress: true,
            fromName: true,
            imapHost: true,
            imapPort: true,
            imapUser: true,
            smtpSendVia: true,
            isActive: true,
            lastPolledAt: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error("[API_EMAIL_INBOXES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/email-inboxes?channelId=xxx
 * Archive the channel (soft delete).
 */
export async function DELETE(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const organizationId = await getCurrentOrgId();
    const guard = await requireAction("messaging:archive_channel");
    if (guard) return handleGuardError(guard);

    const url = new URL(req.url);
    const channelId = url.searchParams.get("channelId");
    if (!channelId) return NextResponse.json({ error: "channelId is required" }, { status: 400 });

    const channel = await prismadb.channel.findFirst({
      where: { id: channelId, organizationId, source: "EMAIL" },
    });
    if (!channel) return NextResponse.json({ error: "Inbox not found" }, { status: 404 });

    await prismadb.$transaction([
      prismadb.emailInboxConfig.updateMany({
        where: { channelId },
        data: { isActive: false },
      }),
      prismadb.channel.update({
        where: { id: channelId },
        data: { isArchived: true },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API_EMAIL_INBOXES_DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
