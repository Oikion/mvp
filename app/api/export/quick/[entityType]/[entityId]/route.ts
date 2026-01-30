import { NextResponse } from "next/server";
import { getCurrentUser, getCurrentOrgIdSafe } from "@/lib/get-current-user";
import { prismadb } from "@/lib/prisma";

// ============================================
// TYPES
// ============================================

type ExportFormat = "xe-xml" | "spitogatos-csv" | "pdf-flyer";
type EntityType = "property" | "client";

interface PropertyData {
  id: string;
  property_name: string;
  property_type: string | null;
  transaction_type: string | null;
  price: number | null;
  price_type: string | null;
  address_street: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  postal_code: string | null;
  municipality: string | null;
  area: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  size_net_sqm: number | null;
  size_gross_sqm: number | null;
  plot_size_sqm: number | null;
  year_built: number | null;
  floor: string | null;
  floors_total: number | null;
  description: string | null;
  heating_type: string | null;
  energy_cert_class: string | null;
  furnished: string | null;
  condition: string | null;
  elevator: boolean | null;
  accepts_pets: boolean | null;
  orientation: string[] | null;
  amenities: string[] | null;
  portal_visibility: string | null;
  assigned_to_user?: { name: string | null; email?: string | null } | null;
  linkedImages?: { id: string; document_file_url: string | null }[];
}

// ============================================
// XE.GR XML GENERATOR
// ============================================

function generateXeXml(property: PropertyData, locale: string): string {
  const escapeXml = (str: string | null | undefined): string => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  // Map property type to XE.gr format
  const mapPropertyType = (type: string | null): string => {
    const typeMap: Record<string, string> = {
      APARTMENT: "apartment",
      HOUSE: "house",
      STUDIO: "studio",
      MAISONETTE: "maisonette",
      VILLA: "villa",
      LAND: "land",
      COMMERCIAL: "commercial",
      OFFICE: "office",
      STORE: "store",
      WAREHOUSE: "warehouse",
      BUILDING: "building",
      PARKING: "parking",
      OTHER: "other",
    };
    return typeMap[type || ""] || "other";
  };

  // Map transaction type to XE.gr format
  const mapTransactionType = (type: string | null): string => {
    const typeMap: Record<string, string> = {
      SALE: "sale",
      RENTAL: "rent",
      SHORT_TERM: "short_term_rent",
    };
    return typeMap[type || ""] || "sale";
  };

  // Map heating type
  const mapHeatingType = (type: string | null): string => {
    const typeMap: Record<string, string> = {
      AUTONOMOUS: "autonomous",
      CENTRAL: "central",
      NATURAL_GAS: "natural_gas",
      HEAT_PUMP: "heat_pump",
      ELECTRIC: "electric",
      NONE: "none",
    };
    return typeMap[type || ""] || "";
  };

  // Map energy class
  const mapEnergyClass = (cls: string | null): string => {
    if (!cls) return "";
    const classMap: Record<string, string> = {
      A_PLUS: "A+",
      A: "A",
      B: "B",
      C: "C",
      D: "D",
      E: "E",
      F: "F",
      G: "G",
      H: "H",
      IN_PROGRESS: "in_progress",
    };
    return classMap[cls] || cls;
  };

  // Build XML
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<properties>\n`;
  xml += `  <property>\n`;
  xml += `    <id>${escapeXml(property.id)}</id>\n`;
  xml += `    <title>${escapeXml(property.property_name)}</title>\n`;
  xml += `    <type>${mapPropertyType(property.property_type)}</type>\n`;
  xml += `    <transaction>${mapTransactionType(property.transaction_type)}</transaction>\n`;
  
  if (property.price) {
    xml += `    <price>${property.price}</price>\n`;
    xml += `    <currency>EUR</currency>\n`;
  }
  
  // Location
  xml += `    <location>\n`;
  if (property.address_street) xml += `      <street>${escapeXml(property.address_street)}</street>\n`;
  if (property.address_city) xml += `      <city>${escapeXml(property.address_city)}</city>\n`;
  if (property.area) xml += `      <area>${escapeXml(property.area)}</area>\n`;
  if (property.municipality) xml += `      <municipality>${escapeXml(property.municipality)}</municipality>\n`;
  if (property.postal_code) xml += `      <postal_code>${escapeXml(property.postal_code)}</postal_code>\n`;
  if (property.address_state) xml += `      <region>${escapeXml(property.address_state)}</region>\n`;
  xml += `    </location>\n`;
  
  // Details
  xml += `    <details>\n`;
  if (property.bedrooms !== null) xml += `      <bedrooms>${property.bedrooms}</bedrooms>\n`;
  if (property.bathrooms !== null) xml += `      <bathrooms>${property.bathrooms}</bathrooms>\n`;
  if (property.size_net_sqm) xml += `      <size_sqm>${property.size_net_sqm}</size_sqm>\n`;
  else if (property.square_feet) xml += `      <size_sqm>${Math.round(Number(property.square_feet) * 0.092903)}</size_sqm>\n`;
  if (property.plot_size_sqm) xml += `      <plot_size_sqm>${property.plot_size_sqm}</plot_size_sqm>\n`;
  if (property.floor) xml += `      <floor>${escapeXml(property.floor)}</floor>\n`;
  if (property.floors_total) xml += `      <total_floors>${property.floors_total}</total_floors>\n`;
  if (property.year_built) xml += `      <year_built>${property.year_built}</year_built>\n`;
  xml += `    </details>\n`;
  
  // Features
  xml += `    <features>\n`;
  if (property.heating_type) xml += `      <heating>${mapHeatingType(property.heating_type)}</heating>\n`;
  if (property.energy_cert_class) xml += `      <energy_class>${mapEnergyClass(property.energy_cert_class)}</energy_class>\n`;
  if (property.furnished) xml += `      <furnished>${property.furnished === "FULLY" ? "yes" : property.furnished === "PARTIALLY" ? "partial" : "no"}</furnished>\n`;
  if (property.elevator !== null) xml += `      <elevator>${property.elevator ? "yes" : "no"}</elevator>\n`;
  if (property.accepts_pets !== null) xml += `      <pets_allowed>${property.accepts_pets ? "yes" : "no"}</pets_allowed>\n`;
  if (property.condition) xml += `      <condition>${escapeXml(property.condition.toLowerCase())}</condition>\n`;
  xml += `    </features>\n`;
  
  // Description
  if (property.description) {
    xml += `    <description><![CDATA[${property.description}]]></description>\n`;
  }
  
  // Images
  if (property.linkedImages && property.linkedImages.length > 0) {
    xml += `    <images>\n`;
    property.linkedImages.forEach((img, index) => {
      if (img.document_file_url) {
        xml += `      <image order="${index + 1}">${escapeXml(img.document_file_url)}</image>\n`;
      }
    });
    xml += `    </images>\n`;
  }
  
  // Agent info
  if (property.assigned_to_user) {
    xml += `    <agent>\n`;
    if (property.assigned_to_user.name) xml += `      <name>${escapeXml(property.assigned_to_user.name)}</name>\n`;
    xml += `    </agent>\n`;
  }
  
  xml += `  </property>\n`;
  xml += `</properties>`;
  
  return xml;
}

// ============================================
// SPITOGATOS CSV GENERATOR
// ============================================

function generateSpitogatosCsv(property: PropertyData, locale: string): string {
  // Spitogatos CSV headers (based on common portal format)
  const headers = [
    "id",
    "title",
    "type",
    "subtype",
    "transaction",
    "price",
    "price_per_sqm",
    "street",
    "number",
    "area",
    "city",
    "region",
    "postal_code",
    "lat",
    "lng",
    "bedrooms",
    "bathrooms",
    "size_sqm",
    "plot_sqm",
    "floor",
    "total_floors",
    "year_built",
    "renovation_year",
    "heating",
    "energy_class",
    "furnished",
    "elevator",
    "parking",
    "pets",
    "balcony",
    "garden",
    "pool",
    "storage",
    "fireplace",
    "alarm",
    "aircondition",
    "description",
    "image_1",
    "image_2",
    "image_3",
    "image_4",
    "image_5",
    "agent_name",
    "agent_phone",
    "agent_email",
  ];

  // Map property type
  const mapPropertyType = (type: string | null): { type: string; subtype: string } => {
    const typeMap: Record<string, { type: string; subtype: string }> = {
      APARTMENT: { type: "residential", subtype: "apartment" },
      HOUSE: { type: "residential", subtype: "house" },
      STUDIO: { type: "residential", subtype: "studio" },
      MAISONETTE: { type: "residential", subtype: "maisonette" },
      VILLA: { type: "residential", subtype: "villa" },
      LAND: { type: "land", subtype: "plot" },
      COMMERCIAL: { type: "commercial", subtype: "commercial" },
      OFFICE: { type: "commercial", subtype: "office" },
      STORE: { type: "commercial", subtype: "store" },
      WAREHOUSE: { type: "commercial", subtype: "warehouse" },
      BUILDING: { type: "residential", subtype: "building" },
      PARKING: { type: "commercial", subtype: "parking" },
      OTHER: { type: "other", subtype: "other" },
    };
    return typeMap[type || ""] || { type: "other", subtype: "other" };
  };

  const propertyTypes = mapPropertyType(property.property_type);
  const sizeSqm = property.size_net_sqm || (property.square_feet ? Math.round(Number(property.square_feet) * 0.092903) : "");
  const pricePerSqm = property.price && sizeSqm ? Math.round(property.price / Number(sizeSqm)) : "";

  // Check amenities
  const hasAmenity = (amenity: string): string => {
    if (!property.amenities || !Array.isArray(property.amenities)) return "";
    return property.amenities.includes(amenity) ? "yes" : "no";
  };

  // Get images
  const images = property.linkedImages || [];
  
  // Build row values
  const values = [
    property.id,
    property.property_name,
    propertyTypes.type,
    propertyTypes.subtype,
    property.transaction_type?.toLowerCase() || "sale",
    property.price || "",
    pricePerSqm,
    property.address_street || "",
    "", // number
    property.area || "",
    property.address_city || "",
    property.address_state || "",
    property.postal_code || "",
    "", // lat
    "", // lng
    property.bedrooms ?? "",
    property.bathrooms ?? "",
    sizeSqm,
    property.plot_size_sqm || "",
    property.floor || "",
    property.floors_total ?? "",
    property.year_built ?? "",
    "", // renovation_year
    property.heating_type?.toLowerCase() || "",
    property.energy_cert_class || "",
    property.furnished === "FULLY" ? "yes" : property.furnished === "PARTIALLY" ? "partial" : "no",
    property.elevator ? "yes" : "no",
    hasAmenity("PARKING"),
    property.accepts_pets ? "yes" : "no",
    hasAmenity("BALCONY"),
    hasAmenity("GARDEN"),
    hasAmenity("POOL"),
    hasAmenity("STORAGE"),
    hasAmenity("FIREPLACE"),
    hasAmenity("ALARM"),
    hasAmenity("AIR_CONDITION"),
    `"${(property.description || "").replace(/"/g, '""')}"`,
    images[0]?.document_file_url || "",
    images[1]?.document_file_url || "",
    images[2]?.document_file_url || "",
    images[3]?.document_file_url || "",
    images[4]?.document_file_url || "",
    property.assigned_to_user?.name || "",
    "", // agent_phone
    "", // agent_email
  ];

  // Escape CSV values
  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = headers.join(",");
  const valueRow = values.map(escapeCsv).join(",");
  
  return `${headerRow}\n${valueRow}`;
}

// ============================================
// PDF FLYER GENERATOR
// ============================================

async function generatePdfFlyer(
  property: PropertyData,
  locale: string
): Promise<Buffer> {
  // Import PDF generation dynamically
  const { Document, Page, Text, View, StyleSheet, Image, pdf, Font } = await import("@react-pdf/renderer");
  const React = await import("react");
  
  // Register fonts
  Font.register({
    family: "Inter",
    fonts: [
      { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2", fontWeight: 400 },
      { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2", fontWeight: 600 },
      { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff2", fontWeight: 700 },
    ],
  });

  // Create styles
  const styles = StyleSheet.create({
    page: {
      padding: 40,
      fontFamily: "Inter",
      backgroundColor: "#ffffff",
    },
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 20,
      paddingBottom: 15,
      borderBottomWidth: 2,
      borderBottomColor: "#2563eb",
    },
    title: {
      fontSize: 24,
      fontWeight: 700,
      color: "#1e293b",
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      color: "#64748b",
    },
    price: {
      fontSize: 28,
      fontWeight: 700,
      color: "#2563eb",
      textAlign: "right",
    },
    priceType: {
      fontSize: 10,
      color: "#64748b",
      textAlign: "right",
    },
    imageContainer: {
      marginBottom: 20,
      borderRadius: 8,
      overflow: "hidden",
    },
    mainImage: {
      width: "100%",
      height: 200,
      objectFit: "cover",
    },
    thumbnailRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
    },
    thumbnail: {
      width: 80,
      height: 60,
      objectFit: "cover",
      borderRadius: 4,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: 600,
      color: "#1e293b",
      marginBottom: 10,
      paddingBottom: 5,
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    gridItem: {
      width: "48%",
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 5,
    },
    label: {
      fontSize: 10,
      color: "#64748b",
      width: 80,
    },
    value: {
      fontSize: 11,
      fontWeight: 600,
      color: "#1e293b",
    },
    description: {
      fontSize: 10,
      color: "#475569",
      lineHeight: 1.5,
    },
    footer: {
      position: "absolute",
      bottom: 30,
      left: 40,
      right: 40,
      flexDirection: "row",
      justifyContent: "space-between",
      paddingTop: 15,
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
    },
    footerText: {
      fontSize: 9,
      color: "#64748b",
    },
    agentName: {
      fontSize: 10,
      fontWeight: 600,
      color: "#1e293b",
    },
  });

  // Format price
  const formatPrice = (price: number | null): string => {
    if (!price) return "Price on request";
    return new Intl.NumberFormat(locale === "el" ? "el-GR" : "en-US", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Map property type for display
  const getPropertyTypeLabel = (type: string | null): string => {
    const labels: Record<string, { en: string; el: string }> = {
      APARTMENT: { en: "Apartment", el: "Διαμέρισμα" },
      HOUSE: { en: "House", el: "Σπίτι" },
      STUDIO: { en: "Studio", el: "Στούντιο" },
      MAISONETTE: { en: "Maisonette", el: "Μεζονέτα" },
      VILLA: { en: "Villa", el: "Βίλα" },
      LAND: { en: "Land", el: "Οικόπεδο" },
      COMMERCIAL: { en: "Commercial", el: "Επαγγελματικό" },
      OFFICE: { en: "Office", el: "Γραφείο" },
      STORE: { en: "Store", el: "Κατάστημα" },
      WAREHOUSE: { en: "Warehouse", el: "Αποθήκη" },
      BUILDING: { en: "Building", el: "Κτίριο" },
      PARKING: { en: "Parking", el: "Parking" },
    };
    const label = labels[type || ""] || { en: "Property", el: "Ακίνητο" };
    return locale === "el" ? label.el : label.en;
  };

  const labels = {
    details: locale === "el" ? "Χαρακτηριστικά" : "Details",
    bedrooms: locale === "el" ? "Υπνοδωμάτια" : "Bedrooms",
    bathrooms: locale === "el" ? "Μπάνια" : "Bathrooms",
    size: locale === "el" ? "Εμβαδόν" : "Size",
    floor: locale === "el" ? "Όροφος" : "Floor",
    yearBuilt: locale === "el" ? "Έτος κατασκευής" : "Year Built",
    heating: locale === "el" ? "Θέρμανση" : "Heating",
    energy: locale === "el" ? "Ενεργειακή κλάση" : "Energy Class",
    description: locale === "el" ? "Περιγραφή" : "Description",
    location: locale === "el" ? "Τοποθεσία" : "Location",
    generatedBy: locale === "el" ? "Δημιουργήθηκε από Oikion" : "Generated by Oikion",
  };

  // Create document component
  const FlyerDocument = () =>
    React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },
        // Header
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.title }, property.property_name),
            React.createElement(
              Text,
              { style: styles.subtitle },
              `${getPropertyTypeLabel(property.property_type)} • ${property.address_city || ""}`
            )
          ),
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.price }, formatPrice(property.price)),
            property.transaction_type === "RENTAL" &&
              React.createElement(Text, { style: styles.priceType }, locale === "el" ? "/μήνα" : "/month")
          )
        ),
        // Main image
        property.linkedImages?.[0]?.document_file_url &&
          React.createElement(
            View,
            { style: styles.imageContainer },
            React.createElement(Image, {
              style: styles.mainImage,
              src: property.linkedImages[0].document_file_url,
            })
          ),
        // Details section
        React.createElement(
          View,
          { style: styles.section },
          React.createElement(Text, { style: styles.sectionTitle }, labels.details),
          React.createElement(
            View,
            { style: styles.grid },
            property.bedrooms !== null &&
              React.createElement(
                View,
                { style: styles.gridItem },
                React.createElement(Text, { style: styles.label }, labels.bedrooms),
                React.createElement(Text, { style: styles.value }, String(property.bedrooms))
              ),
            property.bathrooms !== null &&
              React.createElement(
                View,
                { style: styles.gridItem },
                React.createElement(Text, { style: styles.label }, labels.bathrooms),
                React.createElement(Text, { style: styles.value }, String(property.bathrooms))
              ),
            (property.size_net_sqm || property.square_feet) &&
              React.createElement(
                View,
                { style: styles.gridItem },
                React.createElement(Text, { style: styles.label }, labels.size),
                React.createElement(
                  Text,
                  { style: styles.value },
                  `${property.size_net_sqm || Math.round(Number(property.square_feet) * 0.092903)} m²`
                )
              ),
            property.floor &&
              React.createElement(
                View,
                { style: styles.gridItem },
                React.createElement(Text, { style: styles.label }, labels.floor),
                React.createElement(Text, { style: styles.value }, property.floor)
              ),
            property.year_built &&
              React.createElement(
                View,
                { style: styles.gridItem },
                React.createElement(Text, { style: styles.label }, labels.yearBuilt),
                React.createElement(Text, { style: styles.value }, String(property.year_built))
              ),
            property.heating_type &&
              React.createElement(
                View,
                { style: styles.gridItem },
                React.createElement(Text, { style: styles.label }, labels.heating),
                React.createElement(Text, { style: styles.value }, property.heating_type.replace("_", " "))
              ),
            property.energy_cert_class &&
              React.createElement(
                View,
                { style: styles.gridItem },
                React.createElement(Text, { style: styles.label }, labels.energy),
                React.createElement(
                  Text,
                  { style: styles.value },
                  property.energy_cert_class.replace("_PLUS", "+")
                )
              )
          )
        ),
        // Location
        property.address_street &&
          React.createElement(
            View,
            { style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, labels.location),
            React.createElement(
              Text,
              { style: styles.description },
              [property.address_street, property.address_city, property.address_state, property.postal_code]
                .filter(Boolean)
                .join(", ")
            )
          ),
        // Description
        property.description &&
          React.createElement(
            View,
            { style: styles.section },
            React.createElement(Text, { style: styles.sectionTitle }, labels.description),
            React.createElement(
              Text,
              { style: styles.description },
              property.description.length > 800
                ? property.description.substring(0, 800) + "..."
                : property.description
            )
          ),
        // Footer
        React.createElement(
          View,
          { style: styles.footer },
          React.createElement(
            View,
            null,
            property.assigned_to_user?.name &&
              React.createElement(Text, { style: styles.agentName }, property.assigned_to_user.name),
            React.createElement(
              Text,
              { style: styles.footerText },
              new Date().toLocaleDateString(locale === "el" ? "el-GR" : "en-US")
            )
          ),
          React.createElement(Text, { style: styles.footerText }, labels.generatedBy)
        )
      )
    );

  // Generate PDF
  const pdfDoc = pdf(FlyerDocument());
  const blob = await pdfDoc.toBlob();
  const arrayBuffer = await blob.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ============================================
// ROUTE HANDLER
// ============================================

export async function GET(
  req: Request,
  { params }: { params: Promise<{ entityType: string; entityId: string }> }
) {
  try {
    const user = await getCurrentUser();
    const organizationId = await getCurrentOrgIdSafe();

    if (!organizationId) {
      return NextResponse.json({ error: "Organization context required" }, { status: 400 });
    }

    const { entityType, entityId } = await params;
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") as ExportFormat;
    const locale = searchParams.get("locale") || "en";

    // Validate inputs
    if (!["property", "client"].includes(entityType)) {
      return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
    }

    if (!["xe-xml", "spitogatos-csv", "pdf-flyer"].includes(format)) {
      return NextResponse.json({ error: "Invalid export format" }, { status: 400 });
    }

    // Fetch entity data
    if (entityType === "property") {
      const property = await prismadb.properties.findFirst({
        where: {
          id: entityId,
          organizationId,
        },
        include: {
          Users_Properties_assigned_toToUsers: {
            select: {
              name: true,
              email: true,
            },
          },
          Documents: {
            where: {
              document_file_mimeType: {
                startsWith: "image/",
              },
            },
            select: {
              id: true,
              document_file_url: true,
            },
            orderBy: { date_created: "desc" },
            take: 10,
          },
        },
      });

      if (!property) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 });
      }

      // Prepare property data
      const propertyData: PropertyData = {
        id: property.id,
        property_name: property.property_name,
        property_type: property.property_type,
        transaction_type: property.transaction_type,
        price: property.price,
        price_type: property.price_type,
        address_street: property.address_street,
        address_city: property.address_city,
        address_state: property.address_state,
        address_zip: property.address_zip,
        postal_code: property.postal_code,
        municipality: property.municipality,
        area: property.area,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        square_feet: property.square_feet,
        size_net_sqm: property.size_net_sqm ? Number(property.size_net_sqm) : null,
        size_gross_sqm: property.size_gross_sqm ? Number(property.size_gross_sqm) : null,
        plot_size_sqm: property.plot_size_sqm ? Number(property.plot_size_sqm) : null,
        year_built: property.year_built,
        floor: property.floor,
        floors_total: property.floors_total,
        description: property.description,
        heating_type: property.heating_type,
        energy_cert_class: property.energy_cert_class,
        furnished: property.furnished,
        condition: property.condition,
        elevator: property.elevator,
        accepts_pets: property.accepts_pets,
        orientation: property.orientation as string[] | null,
        amenities: property.amenities as string[] | null,
        portal_visibility: property.portal_visibility,
        assigned_to_user: property.Users_Properties_assigned_toToUsers,
        linkedImages: property.Documents,
      };

      // Generate export based on format
      let content: string | Buffer;
      let contentType: string;
      let filename: string;

      switch (format) {
        case "xe-xml":
          content = generateXeXml(propertyData, locale);
          contentType = "application/xml; charset=utf-8";
          filename = `property_${property.id}_xe.xml`;
          break;
        case "spitogatos-csv":
          content = generateSpitogatosCsv(propertyData, locale);
          contentType = "text/csv; charset=utf-8";
          filename = `property_${property.id}_spitogatos.csv`;
          break;
        case "pdf-flyer":
          content = await generatePdfFlyer(propertyData, locale);
          contentType = "application/pdf";
          filename = `property_${property.property_name.replace(/[^a-zA-Z0-9]/g, "_")}_flyer.pdf`;
          break;
        default:
          return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
      }

      // Return response with file
      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // Client export (simplified - mainly PDF flyer)
    if (entityType === "client") {
      const client = await prismadb.clients.findFirst({
        where: {
          id: entityId,
          organizationId,
        },
        include: {
          Users_Clients_assigned_toToUsers: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });

      if (!client) {
        return NextResponse.json({ error: "Client not found" }, { status: 404 });
      }

      // For clients, only PDF flyer is supported for now
      if (format !== "pdf-flyer") {
        return NextResponse.json(
          { error: "Only PDF flyer export is supported for clients" },
          { status: 400 }
        );
      }

      // Generate client contact card PDF
      const { Document, Page, Text, View, StyleSheet, pdf, Font } = await import("@react-pdf/renderer");
      const React = await import("react");
      
      Font.register({
        family: "Inter",
        fonts: [
          { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff2", fontWeight: 400 },
          { src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff2", fontWeight: 600 },
        ],
      });

      const styles = StyleSheet.create({
        page: { padding: 40, fontFamily: "Inter", backgroundColor: "#ffffff" },
        header: { marginBottom: 30, paddingBottom: 20, borderBottomWidth: 2, borderBottomColor: "#2563eb" },
        title: { fontSize: 28, fontWeight: 600, color: "#1e293b", marginBottom: 8 },
        subtitle: { fontSize: 12, color: "#64748b" },
        section: { marginBottom: 20 },
        sectionTitle: { fontSize: 14, fontWeight: 600, color: "#1e293b", marginBottom: 10 },
        row: { flexDirection: "row", marginBottom: 8 },
        label: { fontSize: 10, color: "#64748b", width: 120 },
        value: { fontSize: 11, color: "#1e293b" },
        footer: { position: "absolute", bottom: 40, left: 40, right: 40, paddingTop: 15, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
        footerText: { fontSize: 9, color: "#64748b" },
      });

      const labels = {
        contactInfo: locale === "el" ? "Στοιχεία Επικοινωνίας" : "Contact Information",
        preferences: locale === "el" ? "Προτιμήσεις" : "Preferences",
        email: "Email",
        phone: locale === "el" ? "Τηλέφωνο" : "Phone",
        address: locale === "el" ? "Διεύθυνση" : "Address",
        status: locale === "el" ? "Κατάσταση" : "Status",
        type: locale === "el" ? "Τύπος" : "Type",
        budget: locale === "el" ? "Προϋπολογισμός" : "Budget",
        assignedTo: locale === "el" ? "Υπεύθυνος" : "Assigned To",
        generatedBy: locale === "el" ? "Δημιουργήθηκε από Oikion" : "Generated by Oikion",
      };

      const ClientDocument = () =>
        React.createElement(
          Document,
          null,
          React.createElement(
            Page,
            { size: "A4", style: styles.page },
            React.createElement(
              View,
              { style: styles.header },
              React.createElement(Text, { style: styles.title }, client.client_name),
              React.createElement(Text, { style: styles.subtitle }, client.client_type || "Client")
            ),
            React.createElement(
              View,
              { style: styles.section },
              React.createElement(Text, { style: styles.sectionTitle }, labels.contactInfo),
              client.primary_email && React.createElement(View, { style: styles.row },
                React.createElement(Text, { style: styles.label }, labels.email),
                React.createElement(Text, { style: styles.value }, client.primary_email)
              ),
              client.primary_phone && React.createElement(View, { style: styles.row },
                React.createElement(Text, { style: styles.label }, labels.phone),
                React.createElement(Text, { style: styles.value }, client.primary_phone)
              ),
              client.billing_street && React.createElement(View, { style: styles.row },
                React.createElement(Text, { style: styles.label }, labels.address),
                React.createElement(Text, { style: styles.value }, 
                  [client.billing_street, client.billing_city, client.billing_postal_code].filter(Boolean).join(", ")
                )
              )
            ),
            React.createElement(
              View,
              { style: styles.section },
              React.createElement(Text, { style: styles.sectionTitle }, labels.preferences),
              React.createElement(View, { style: styles.row },
                React.createElement(Text, { style: styles.label }, labels.status),
                React.createElement(Text, { style: styles.value }, client.client_status || "Active")
              ),
              (client.budget_min || client.budget_max) && React.createElement(View, { style: styles.row },
                React.createElement(Text, { style: styles.label }, labels.budget),
                React.createElement(Text, { style: styles.value }, 
                  `€${client.budget_min || 0} - €${client.budget_max || "N/A"}`
                )
              ),
              client.Users_Clients_assigned_toToUsers?.name && React.createElement(View, { style: styles.row },
                React.createElement(Text, { style: styles.label }, labels.assignedTo),
                React.createElement(Text, { style: styles.value }, client.Users_Clients_assigned_toToUsers.name)
              )
            ),
            React.createElement(
              View,
              { style: styles.footer },
              React.createElement(Text, { style: styles.footerText }, labels.generatedBy)
            )
          )
        );

      const pdfDoc = pdf(ClientDocument());
      const blob = await pdfDoc.toBlob();
      const arrayBuffer = await blob.arrayBuffer();
      const content = Buffer.from(arrayBuffer);
      const filename = `client_${client.client_name.replace(/[^a-zA-Z0-9]/g, "_")}_card.pdf`;

      return new NextResponse(content, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: "Unsupported entity type" }, { status: 400 });
  } catch (error) {
    console.error("[QUICK_EXPORT_ERROR]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 }
    );
  }
}
