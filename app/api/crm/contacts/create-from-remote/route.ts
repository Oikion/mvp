import { prismadb } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { generateFriendlyId } from "@/lib/friendly-id";

const createContactSchema = z.object({
  name: z.string().min(1).max(200),
  surname: z.string().min(1).max(200),
  email: z.string().email().max(320),
  phone: z.string().min(1).max(50),
  company: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
  tag: z.string().min(1).max(100),
  organizationId: z.string().uuid(),
});

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

  const { name, surname, email, phone, company, message, tag, organizationId } = parsed.data;

  try {
    const friendlyId = await generateFriendlyId(prismadb, "Contact", organizationId);

    await prismadb.contact.create({
      data: {
        friendlyId,
        organizationId,
        firstName: name,
        lastName: surname,
        displayName: `${name} ${surname}`.trim(),
        email,
        primaryPhone: phone,
        companyName: company,
        notes: `Message: ${message}`,
        tags: [tag],
        status: "LEAD",
        source: "PORTAL_LEAD",
      },
    });
    return NextResponse.json({ message: "Contact created" });
  } catch (error) {
    console.error("[CREATE_FROM_REMOTE]", error);
    return NextResponse.json(
      { error: "Error creating contact" },
      { status: 500 }
    );
  }
}
