// @ts-nocheck
import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { LayoutPreference, Prisma } from "@prisma/client";
import { 
  type DashboardConfig, 
  type WidgetSize,
  DASHBOARD_CONFIG_VERSION 
} from "@/lib/dashboard/types";
import { WIDGET_REGISTRY, normalizeDashboardConfig } from "@/lib/dashboard/widget-registry";

// Valid layout preference values
const VALID_LAYOUT_PREFERENCES = new Set<LayoutPreference>(["DEFAULT", "WIDE"]);

// Valid widget sizes
const VALID_WIDGET_SIZES = new Set<WidgetSize>(["sm", "md", "lg"]);

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function validateWidgetConfig(widget: unknown): boolean {
  if (!widget || typeof widget !== "object") return false;
  const w = widget as Record<string, unknown>;

  if (typeof w.id !== "string" || !WIDGET_REGISTRY[w.id]) return false;
  if (typeof w.visible !== "boolean") return false;
  if (typeof w.size !== "string" || !VALID_WIDGET_SIZES.has(w.size as WidgetSize)) {
    return false;
  }
  if (!isNumber(w.order)) return false;

  return true;
}

function validateLayoutItem(item: unknown): boolean {
  if (!item || typeof item !== "object") return false;
  const layoutItem = item as Record<string, unknown>;

  if (typeof layoutItem.i !== "string" || !WIDGET_REGISTRY[layoutItem.i]) {
    return false;
  }
  if (!isNumber(layoutItem.x)) return false;
  if (!isNumber(layoutItem.y)) return false;
  if (!isNumber(layoutItem.w)) return false;
  if (!isNumber(layoutItem.h)) return false;

  if (layoutItem.minW !== undefined && !isNumber(layoutItem.minW)) {
    return false;
  }
  if (layoutItem.maxW !== undefined && !isNumber(layoutItem.maxW)) {
    return false;
  }
  if (layoutItem.minH !== undefined && !isNumber(layoutItem.minH)) {
    return false;
  }
  if (layoutItem.maxH !== undefined && !isNumber(layoutItem.maxH)) {
    return false;
  }

  return true;
}

function validateLayouts(layouts: unknown): boolean {
  if (!layouts || typeof layouts !== "object") return false;
  const layoutRecord = layouts as Record<string, unknown>;
  const breakpoints = ["lg", "md", "sm"] as const;

  for (const breakpoint of breakpoints) {
    const layout = layoutRecord[breakpoint];
    if (!Array.isArray(layout)) return false;

    for (const item of layout) {
      if (!validateLayoutItem(item)) return false;
    }
  }

  return true;
}

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
    if (!validateWidgetConfig(widget)) return false;
  }

  // Validate layouts if provided (newer config)
  if ("layouts" in c && c.layouts !== undefined && c.layouts !== null) {
    if (!validateLayouts(c.layouts)) return false;
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
      const normalized = normalizeDashboardConfig(dashboardConfig);
      updateData.dashboardConfig = {
        ...normalized,
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
