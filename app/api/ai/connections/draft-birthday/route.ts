import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { getOrgOpenAIKey, getOrgOpenAIModel } from "@/lib/org-settings";
import { getSystemSetting } from "@/lib/system-settings";

/**
 * POST /api/ai/connections/draft-birthday
 * Generate a personalized birthday message
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { contactId, tone = "warm", includePropertyMention = false } = body;

    if (!contactId) {
      return NextResponse.json(
        { error: "contactId is required" },
        { status: 400 }
      );
    }

    // Get the contact
    const contact = await prismadb.client_Contacts.findFirst({
      where: {
        id: contactId,
        organizationId,
      },
      include: {
        Clients: {
          select: {
            id: true,
            client_name: true,
            client_type: true,
            intent: true,
          },
        },
      },
    });

    if (!contact) {
      return NextResponse.json(
        { error: "Contact not found" },
        { status: 404 }
      );
    }

    // Get matching properties if requested
    let matchingProperties: any[] = [];
    if (includePropertyMention && contact.Clients) {
      const client = await prismadb.clients.findUnique({
        where: { id: contact.Clients.id },
      });

      if (client) {
        matchingProperties = await prismadb.properties.findMany({
          where: {
            organizationId,
            property_status: "ACTIVE",
          },
          take: 3,
          select: {
            id: true,
            property_name: true,
            property_type: true,
            price: true,
            area: true,
          },
        });
      }
    }

    // Get OpenAI API key
    let apiKey = await getOrgOpenAIKey(organizationId);
    const modelName = await getOrgOpenAIModel(organizationId);

    if (!apiKey) {
      apiKey = await getSystemSetting("openai_api_key", "OPENAI_API_KEY");
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey });

    const contactName = `${contact.first_name || ""} ${contact.last_name || ""}`.trim();
    
    let propertyContext = "";
    if (matchingProperties.length > 0) {
      propertyContext = `\n\nYou may optionally mention that you have some properties that might interest them:\n${matchingProperties.map((p) => `- ${p.property_name} in ${p.area}`).join("\n")}`;
    }

    const systemPrompt = `You are a helpful assistant creating a birthday message for a real estate professional.
The sender is ${user.name}.
The recipient is ${contactName}.
${contact.Clients ? `They are associated with client: ${contact.Clients.client_name} (${contact.Clients.client_type})` : ""}

Tone: ${tone} (${tone === "professional" ? "formal but warm" : tone === "warm" ? "friendly and personal" : "casual and brief"})
${propertyContext}

Write a short, genuine birthday message that:
- Wishes them a happy birthday
- Feels personal, not generic
- Is appropriate for a professional relationship
${includePropertyMention && matchingProperties.length > 0 ? "- Optionally mentions you have properties that might interest them (subtle, not salesy)" : ""}

Keep it to 2-4 sentences. Respond ONLY with the message content.`;

    const completion = await openai.chat.completions.create({
      model: modelName || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Write the birthday message:" },
      ],
      temperature: 0.8,
      max_tokens: 200,
    });

    const message = completion.choices[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      contact: {
        id: contact.id,
        name: contactName,
      },
      message,
      tone,
    });
  } catch (error) {
    console.error("[AI_CONNECTIONS_DRAFT_BIRTHDAY]", error);
    return NextResponse.json(
      { error: "Failed to generate message" },
      { status: 500 }
    );
  }
}
