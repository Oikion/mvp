import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prismadb } from "@/lib/prisma";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { clearSettingCache } from "@/lib/system-settings";

// Predefined settings that can be managed through the UI
const MANAGED_SETTINGS = [
  {
    name: "cron_secret",
    displayName: "Cron Secret",
    description: "Secret key for authenticating cron job requests (e.g., Market Intelligence)",
    category: "security",
    sensitive: true,
  },
  {
    name: "market_intel_enabled",
    displayName: "Market Intelligence Enabled",
    description: "Global toggle for the Market Intelligence feature",
    category: "features",
    sensitive: false,
  },
  {
    name: "market_intel_max_orgs",
    displayName: "Max Organizations (Market Intel)",
    description: "Maximum number of organizations that can enable Market Intelligence",
    category: "limits",
    sensitive: false,
  },
  {
    name: "resend_smtp",
    displayName: "Resend API Key",
    description: "API key for Resend email service",
    category: "integrations",
    sensitive: true,
  },
  {
    name: "openai_api_key",
    displayName: "OpenAI API Key",
    description: "API key for OpenAI services",
    category: "integrations",
    sensitive: true,
  },
];

/**
 * GET /api/platform-admin/settings
 * 
 * Get all system settings for the platform admin panel
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check platform admin access
    const isAdmin = await isPlatformAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all system services/settings
    const settings = await prismadb.systemServices.findMany();

    // Create a map of settings
    const settingsMap = new Map(settings.map(s => [s.name, s]));

    // Merge with managed settings definitions
    const enrichedSettings = MANAGED_SETTINGS.map(def => {
      const stored = settingsMap.get(def.name);
      return {
        ...def,
        id: stored?.id || null,
        value: stored?.serviceKey || stored?.serviceUrl || "",
        hasValue: !!(stored?.serviceKey || stored?.serviceUrl),
        // Mask sensitive values
        displayValue: def.sensitive && stored?.serviceKey 
          ? `${'•'.repeat(8)}${stored.serviceKey.slice(-4)}`
          : (stored?.serviceKey || stored?.serviceUrl || ""),
      };
    });

    // Group by category
    const groupedSettings = enrichedSettings.reduce((acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    }, {} as Record<string, typeof enrichedSettings>);

    return NextResponse.json({
      settings: enrichedSettings,
      grouped: groupedSettings,
      categories: [
        { id: "security", name: "Security", description: "Security and authentication settings" },
        { id: "features", name: "Features", description: "Feature flags and toggles" },
        { id: "limits", name: "Limits", description: "Usage limits and quotas" },
        { id: "integrations", name: "Integrations", description: "Third-party service integrations" },
      ]
    });

  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/platform-admin/settings
 * 
 * Create or update a system setting
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check platform admin access
    const isAdmin = await isPlatformAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, value, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Setting name is required" }, { status: 400 });
    }

    // Verify it's a managed setting
    const settingDef = MANAGED_SETTINGS.find(s => s.name === name);
    if (!settingDef) {
      return NextResponse.json({ error: "Unknown setting" }, { status: 400 });
    }

    // Check if setting exists
    const existing = await prismadb.systemServices.findFirst({
      where: { name }
    });

    let setting;

    if (existing) {
      // Update existing
      setting = await prismadb.systemServices.update({
        where: { id: existing.id },
        data: {
          serviceKey: value || null,
          description: description || settingDef.description,
        }
      });
    } else {
      // Create new
      setting = await prismadb.systemServices.create({
        data: {
          id: crypto.randomUUID(),
          name,
          serviceKey: value || null,
          description: description || settingDef.description,
        }
      });
    }

    // Clear the cache for this setting
    clearSettingCache(name);

    return NextResponse.json({
      success: true,
      setting: {
        ...settingDef,
        id: setting.id,
        value: setting.serviceKey,
        hasValue: !!setting.serviceKey,
        displayValue: settingDef.sensitive && setting.serviceKey
          ? `${'•'.repeat(8)}${setting.serviceKey.slice(-4)}`
          : (setting.serviceKey || ""),
      }
    });

  } catch (error) {
    console.error("Error saving setting:", error);
    return NextResponse.json(
      { error: "Failed to save setting" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/platform-admin/settings
 * 
 * Delete a system setting (reset to no value)
 */
export async function DELETE(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check platform admin access
    const isAdmin = await isPlatformAdmin(userId);
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name");

    if (!name) {
      return NextResponse.json({ error: "Setting name is required" }, { status: 400 });
    }

    // Find and delete
    const existing = await prismadb.systemServices.findFirst({
      where: { name }
    });

    if (existing) {
      await prismadb.systemServices.delete({
        where: { id: existing.id }
      });
    }

    // Clear the cache for this setting
    clearSettingCache(name);

    return NextResponse.json({
      success: true,
      message: `Setting "${name}" has been reset`
    });

  } catch (error) {
    console.error("Error deleting setting:", error);
    return NextResponse.json(
      { error: "Failed to delete setting" },
      { status: 500 }
    );
  }
}
