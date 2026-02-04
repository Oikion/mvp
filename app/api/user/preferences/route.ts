// @ts-nocheck
// TODO: Fix type errors
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { LayoutPreference, Prisma } from "@prisma/client";
import { 
  type DashboardConfig, 
  type WidgetSize,
  DASHBOARD_CONFIG_VERSION 
} from "@/lib/dashboard/types";
import { WIDGET_REGISTRY } from "@/lib/dashboard/widget-registry";

// Valid layout preference values
const VALID_LAYOUT_PREFERENCES = new Set<LayoutPreference>(["DEFAULT", "WIDE"]);

// Valid widget sizes
const VALID_WIDGET_SIZES = new Set<WidgetSize>(["sm", "md", "lg"]);

/**
 * Validate dashboard config structure
 */
function validateDashboardConfig(config: unknown): config is DashboardConfig {
  if (!config || typeof config !== "object") return false;
  
  const c = config as Record<string, unknown>;
  
  // Check version
  if (typeof c.version !== "number") return false;
  
  // Check widgets array
  if (!Array.isArray(c.widgets)) return false;
  
  // Validate each widget
  for (const widget of c.widgets) {
    if (!widget || typeof widget !== "object") return false;
    
    const w = widget as Record<string, unknown>;
    
    // Validate widget ID exists in registry
    if (typeof w.id !== "string" || !WIDGET_REGISTRY[w.id]) return false;
    
    // Validate visibility
    if (typeof w.visible !== "boolean") return false;
    
    // Validate size
    if (typeof w.size !== "string" || !VALID_WIDGET_SIZES.has(w.size as WidgetSize)) {
      return false;
    }
    
    // Validate order
    if (typeof w.order !== "number") return false;
  }
  
  return true;
}

export async function GET() {
  try {
    const user = await getCurrentUser();

    const userData = await prismadb.users.findUnique({
      where: { id: user.id },
      select: {
        referralBoxDismissed: true,
        referralApplicationStatus: true,
        layoutPreference: true,
        dashboardConfig: true,
      },
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      referralBoxDismissed: userData.referralBoxDismissed,
      referralApplicationStatus: userData.referralApplicationStatus,
      layoutPreference: userData.layoutPreference,
      dashboardConfig: userData.dashboardConfig as DashboardConfig | null,
    });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    const body = await req.json();

    const { referralBoxDismissed, layoutPreference, dashboardConfig } = body;

    // Build the update data object dynamically
    const updateData: {
      referralBoxDismissed?: boolean;
      layoutPreference?: LayoutPreference;
      dashboardConfig?: Prisma.InputJsonValue;
    } = {};

    // Validate and add referralBoxDismissed if provided
    if (referralBoxDismissed !== undefined) {
      if (typeof referralBoxDismissed !== "boolean") {
        return NextResponse.json(
          { error: "Invalid referralBoxDismissed value" },
          { status: 400 }
        );
      }
      updateData.referralBoxDismissed = referralBoxDismissed;
    }

    // Validate and add layoutPreference if provided
    if (layoutPreference !== undefined) {
      if (!VALID_LAYOUT_PREFERENCES.has(layoutPreference)) {
        return NextResponse.json(
          { error: "Invalid layoutPreference value. Must be 'DEFAULT' or 'WIDE'" },
          { status: 400 }
        );
      }
      updateData.layoutPreference = layoutPreference;
    }

    // Validate and add dashboardConfig if provided
    if (dashboardConfig !== undefined) {
      if (!validateDashboardConfig(dashboardConfig)) {
        return NextResponse.json(
          { error: "Invalid dashboardConfig structure" },
          { status: 400 }
        );
      }
      // Ensure version is current
      updateData.dashboardConfig = {
        ...dashboardConfig,
        version: DASHBOARD_CONFIG_VERSION,
        updatedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue;
    }

    // Ensure at least one field is being updated
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedUser = await prismadb.users.update({
      where: { id: user.id },
      data: updateData,
      select: {
        layoutPreference: true,
        referralBoxDismissed: true,
        dashboardConfig: true,
      },
    });

    return NextResponse.json({ 
      success: true,
      layoutPreference: updatedUser.layoutPreference,
      referralBoxDismissed: updatedUser.referralBoxDismissed,
      dashboardConfig: updatedUser.dashboardConfig as DashboardConfig | null,
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
