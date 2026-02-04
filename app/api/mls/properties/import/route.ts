import { NextResponse } from "next/server";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { invalidateCache } from "@/lib/cache-invalidate";
import { propertyImportSchema, normalizePropertyEnums, type PropertyImportData } from "@/lib/import";
import { generateFriendlyId } from "@/lib/friendly-id";

interface ImportError {
  row: number;
  field: string;
  error: string;
  value?: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  failed: number;
  errors: ImportError[];
}

// Helper function to convert string to number or null
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

// Helper function to convert string to DateTime or null
function toDateTime(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return value;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Normalize property ID to be URL-safe
 * - Converts to lowercase
 * - Replaces spaces with dashes
 * - Removes special characters (keeps alphanumeric, dashes, underscores)
 * - Collapses multiple dashes
 * - Trims leading/trailing dashes
 */
function normalizePropertyId(id: string): string {
  return id
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')           // spaces to dashes
    .replace(/[^a-z0-9-_]/g, '')    // remove special chars (keep alphanumeric, dash, underscore)
    .replace(/-+/g, '-')            // collapse multiple dashes
    .replace(/^-|-$/g, '');         // trim leading/trailing dashes
}

/**
 * Find the next available ID with suffix if the base ID already exists
 * For example: if "PROP-123" exists, returns "PROP-123-1", if that exists too, returns "PROP-123-2", etc.
 */
async function findAvailableIdWithSuffix(
  baseId: string,
  organizationId: string
): Promise<string> {
  // Check if base ID exists
  const existing = await prismadb.properties.findFirst({
    where: { id: baseId, organizationId },
  });

  if (!existing) {
    return baseId;
  }

  // Find all IDs that start with the base ID followed by a dash and number
  const existingWithSuffix = await prismadb.properties.findMany({
    where: {
      organizationId,
      id: { startsWith: baseId },
    },
    select: { id: true },
  });

  // Extract suffix numbers and find the max
  let maxSuffix = 0;
  const regex = new RegExp(String.raw`^${baseId}-(\d+)$`);
  existingWithSuffix.forEach((p) => {
    const match = regex.exec(p.id);
    if (match) {
      const suffix = Number.parseInt(match[1], 10);
      if (suffix > maxSuffix) maxSuffix = suffix;
    }
  });

  return `${baseId}-${maxSuffix + 1}`;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { properties } = body;

    if (!Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json(
        { error: "No properties provided for import" },
        { status: 400 }
      );
    }

    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    const validProperties: PropertyImportData[] = [];

    // Validate all properties first
    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      // Normalize enum values (handle translations, case variations, etc.)
      const normalizedProperty = normalizePropertyEnums(property);
      const validation = propertyImportSchema.safeParse(normalizedProperty);

      if (validation.success) {
        validProperties.push(validation.data);
      } else {
        result.failed++;
        validation.error.errors.forEach((err) => {
          result.errors.push({
            row: i + 2, // +2 for header row and 0-index
            field: err.path.join("."),
            error: err.message,
            value: String(property[err.path[0]] ?? ""),
          });
        });
      }
    }

    // Process properties - we need to handle user-provided IDs individually
    // to properly check for duplicates and generate suffixes
    for (const property of validProperties) {
      try {
        // Determine the ID to use
        let propertyId: string;
        
        if (property.id && property.id.trim() !== "") {
          // User provided an ID - normalize it to be URL-safe, then check for duplicates
          const normalizedId = normalizePropertyId(property.id);
          if (normalizedId) {
            propertyId = await findAvailableIdWithSuffix(normalizedId, organizationId);
          } else {
            // If normalization results in empty string, generate a friendly ID
            propertyId = await generateFriendlyId(prismadb, "Properties");
          }
        } else {
          // Generate a new friendly ID
          propertyId = await generateFriendlyId(prismadb, "Properties");
        }
        
        await prismadb.properties.create({
          data: {
            id: propertyId,
            createdBy: user.id,
            updatedBy: user.id,
            organizationId,
            property_name: property.property_name,
            primary_email: property.primary_email || null,
            property_type: property.property_type || null,
            property_status: property.property_status || "ACTIVE",
            transaction_type: property.transaction_type || null,
            address_street: property.address_street || null,
            address_city: property.address_city || null,
            address_state: property.address_state || null,
            address_zip: property.address_zip || null,
            municipality: property.municipality || null,
            area: property.area || null,
            postal_code: property.postal_code || null,
            price: toNumber(property.price),
            price_type: property.price_type || null,
            bedrooms: toNumber(property.bedrooms),
            bathrooms: toNumber(property.bathrooms),
            square_feet: toNumber(property.square_feet),
            lot_size: toNumber(property.lot_size),
            year_built: toNumber(property.year_built),
            floor: property.floor || null,
            floors_total: toNumber(property.floors_total),
            size_net_sqm: toNumber(property.size_net_sqm),
            size_gross_sqm: toNumber(property.size_gross_sqm),
            plot_size_sqm: toNumber(property.plot_size_sqm),
            heating_type: property.heating_type || null,
            energy_cert_class: property.energy_cert_class || null,
            condition: property.condition || null,
            renovated_year: toNumber(property.renovated_year),
            elevator: property.elevator || false,
            furnished: property.furnished || null,
            building_permit_no: property.building_permit_no || null,
            building_permit_year: toNumber(property.building_permit_year),
            land_registry_kaek: property.land_registry_kaek || null,
            legalization_status: property.legalization_status || null,
            inside_city_plan: property.inside_city_plan || false,
            build_coefficient: toNumber(property.build_coefficient),
            coverage_ratio: toNumber(property.coverage_ratio),
            frontage_m: toNumber(property.frontage_m),
            etaireia_diaxeirisis: property.etaireia_diaxeirisis || null,
            monthly_common_charges: toNumber(property.monthly_common_charges),
            available_from: toDateTime(property.available_from),
            accepts_pets: property.accepts_pets || false,
            min_lease_months: toNumber(property.min_lease_months),
            is_exclusive: property.is_exclusive || false,
            portal_visibility: property.portal_visibility || null,
            address_privacy_level: property.address_privacy_level || null,
            description: property.description || null,
            draft_status: false,
          },
        });
        result.imported++;
      } catch (error) {
        console.error("[PROPERTY_IMPORT_ITEM_ERROR]", error);
        result.failed++;
      }
    }

    // Invalidate cache
    await invalidateCache(["properties:list"]);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("[PROPERTY_IMPORT_POST]", error);
    return NextResponse.json(
      { error: "Failed to import properties" },
      { status: 500 }
    );
  }
}








