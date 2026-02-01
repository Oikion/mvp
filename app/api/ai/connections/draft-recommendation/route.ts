import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";
import { getOrgOpenAIKey, getOrgOpenAIModel } from "@/lib/org-settings";
import { getSystemSetting } from "@/lib/system-settings";
import { calculateMatchScore } from "@/lib/matchmaking/calculator";

/**
 * POST /api/ai/connections/draft-recommendation
 * Generate a personalized property recommendation email
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!user || !organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, propertyIds, maxProperties = 3, tone = "professional" } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    // Get the client
    const client = await prismadb.clients.findFirst({
      where: {
        id: clientId,
        organizationId,
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Get properties to recommend
    let properties;
    if (propertyIds && propertyIds.length > 0) {
      // Use specified properties
      properties = await prismadb.properties.findMany({
        where: {
          id: { in: propertyIds },
          organizationId,
        },
      });
    } else {
      // Find matching properties
      const allProperties = await prismadb.properties.findMany({
        where: {
          organizationId,
          property_status: "ACTIVE",
        },
        take: 50,
      });

      // Score and sort
      const scored = allProperties
        .map((p) => ({
          property: p,
          score: calculateMatchScore(client, p).score,
        }))
        .filter((s) => s.score >= 50)
        .sort((a, b) => b.score - a.score)
        .slice(0, maxProperties);

      properties = scored.map((s) => s.property);
    }

    if (properties.length === 0) {
      return NextResponse.json({
        success: true,
        message: null,
        note: "No suitable properties found for this client",
      });
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

    // Build property descriptions
    const propertyDescriptions = properties.map((p) => 
      `- ${p.property_name}: ${p.property_type}, ${p.bedrooms} bed, ${p.bathrooms} bath, ${p.size_net_sqm}m², ${p.price}€ in ${p.area || p.municipality}`
    ).join("\n");

    const clientPrefs = client.property_preferences as Record<string, any> | null;

    const systemPrompt = `You are a helpful assistant creating a property recommendation email for a real estate agent.
The agent is ${user.name}.
The client is ${client.client_name}.

Client details:
- Intent: ${client.intent || "Looking for property"}
- Budget: ${client.budget_min || "Not specified"} - ${client.budget_max || "Not specified"} EUR
${clientPrefs ? `- Preferences: ${clientPrefs.bedroomsMin || "Any"}-${clientPrefs.bedroomsMax || "Any"} bedrooms` : ""}

Properties to recommend:
${propertyDescriptions}

Tone: ${tone}

Write a personalized email that:
- Greets the client by name
- References their specific needs/preferences
- Introduces each property with a brief highlight of why it might suit them
- Invites them to schedule viewings
- Signs off professionally

Keep it concise but warm. Respond ONLY with the email content.`;

    const completion = await openai.chat.completions.create({
      model: modelName || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Write the property recommendation email:" },
      ],
      temperature: 0.7,
      max_tokens: 800,
    });

    const message = completion.choices[0]?.message?.content || "";

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        name: client.client_name,
        email: client.primary_email,
      },
      properties: properties.map((p) => ({
        id: p.id,
        name: p.property_name,
        price: p.price,
      })),
      message,
      tone,
    });
  } catch (error) {
    console.error("[AI_CONNECTIONS_DRAFT_RECOMMENDATION]", error);
    return NextResponse.json(
      { error: "Failed to generate recommendation" },
      { status: 500 }
    );
  }
}
