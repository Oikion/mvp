// @ts-nocheck
import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";

const createContactSchema = z
  .object({
    name: z.string().min(1).max(200),
    surname: z.string().min(1).max(200),
    email: z.string().email().max(320),
    phone: z.string().min(1).max(50),
    company: z.string().min(1).max(200),
    message: z.string().min(1).max(5000),
    tag: z.string().min(1).max(100),
  })
  .strict();

export async function POST(req: Request) {
  const apiKey = req.headers.get("OIKION_TOKEN");

  if (!apiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storedApiKey = process.env.OIKION_TOKEN;
  if (!storedApiKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Constant-time comparison to prevent timing attacks
  const keyBuffer = Buffer.from(apiKey);
  const storedBuffer = Buffer.from(storedApiKey);
  if (keyBuffer.length !== storedBuffer.length || !timingSafeEqual(keyBuffer, storedBuffer)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createContactSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Missing or invalid required fields" },
      { status: 400 }
    );
  }

  const { name, surname, email, phone, company, message, tag } = parsed.data;

  // TODO: Replace with per-token org mapping stored in the database so that
  // multiple integrations can each target their own organization without
  // sharing a single global token. For now we derive the target org from
  // REMOTE_INTEGRATION_ORG_ID to prevent callers from injecting contacts
  // into arbitrary organizations.
  const organizationId = process.env.REMOTE_INTEGRATION_ORG_ID;
  if (!organizationId) {
    console.error("[CREATE_FROM_REMOTE] REMOTE_INTEGRATION_ORG_ID env var is not set");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    await prismadb.client_Contacts.create({
      data: {
        id: crypto.randomUUID(),
        contact_first_name: name,
        contact_last_name: surname,
        email,
        mobile_phone: phone,
        type: "Prospect",
        tags: [tag],
        notes: ["Account: " + company, "Message: " + message],
        organizationId,
      },
    });
    return NextResponse.json({ message: "Contact created" });
  } catch (error) {
    return NextResponse.json(
      { error: "Error creating contact" },
      { status: 500 }
    );
  }
}
