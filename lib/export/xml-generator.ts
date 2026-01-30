/**
 * XML Generation Utilities for Portal Exports
 * 
 * Provides utilities for generating well-formed XML output
 * for Greek real estate portal exports.
 */

// ============================================
// TYPES
// ============================================

export interface XmlGeneratorOptions {
  /** Root element name */
  rootElement: string;
  /** Item element name for each property */
  itemElement: string;
  /** Include XML declaration */
  declaration?: boolean;
  /** XML version */
  version?: string;
  /** Encoding */
  encoding?: string;
  /** XML namespace */
  namespace?: string;
  /** Namespace prefix */
  namespacePrefix?: string;
  /** Pretty print with indentation */
  prettyPrint?: boolean;
  /** Indentation string (default: 2 spaces) */
  indent?: string;
  /** Custom attributes for root element */
  rootAttributes?: Record<string, string>;
  /** Wrap text content in CDATA sections */
  useCdata?: boolean;
  /** Fields to always wrap in CDATA */
  cdataFields?: string[];
  /** Fields to render as attributes instead of elements */
  attributeFields?: string[];
}

export interface XmlElementOptions {
  /** Wrap content in CDATA */
  cdata?: boolean;
  /** Render as attribute on parent */
  attribute?: boolean;
  /** Element attributes */
  attributes?: Record<string, string>;
  /** Skip null/undefined/empty values */
  skipEmpty?: boolean;
}

// ============================================
// DEFAULT OPTIONS
// ============================================

const DEFAULT_OPTIONS: XmlGeneratorOptions = {
  rootElement: "properties",
  itemElement: "property",
  declaration: true,
  version: "1.0",
  encoding: "UTF-8",
  prettyPrint: true,
  indent: "  ",
  useCdata: false,
  cdataFields: ["description", "title", "address"],
  attributeFields: [],
};

// ============================================
// XML ESCAPING
// ============================================

/**
 * Escape special XML characters
 */
export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Escape XML attribute value
 */
export function escapeXmlAttribute(value: string): string {
  return escapeXml(value).replace(/\n/g, "&#10;").replace(/\r/g, "&#13;");
}

/**
 * Wrap content in CDATA section
 */
export function wrapCdata(content: string): string {
  // Handle CDATA end markers within content
  const escaped = content.replace(/]]>/g, "]]]]><![CDATA[>");
  return `<![CDATA[${escaped}]]>`;
}

/**
 * Check if value should use CDATA
 */
function shouldUseCdata(
  value: string,
  fieldName: string,
  options: XmlGeneratorOptions
): boolean {
  // Check if field is in cdataFields list
  if (options.cdataFields?.includes(fieldName)) {
    return true;
  }
  
  // Check if useCdata is enabled and content has special chars
  if (options.useCdata) {
    return /[<>&"']/.test(value) || value.includes("\n");
  }
  
  return false;
}

// ============================================
// ELEMENT GENERATION
// ============================================

/**
 * Generate an XML element
 */
export function generateElement(
  name: string,
  value: unknown,
  options: XmlElementOptions = {}
): string {
  // Handle null/undefined/empty values
  if (value === null || value === undefined || value === "") {
    if (options.skipEmpty !== false) {
      return "";
    }
    return `<${name}/>`;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value
      .map(item => generateElement(name, item, options))
      .filter(Boolean)
      .join("\n");
  }

  // Handle objects (nested elements)
  if (typeof value === "object" && !(value instanceof Date)) {
    const nested = Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => generateElement(key, val, options))
      .filter(Boolean)
      .join("\n");
    return `<${name}>\n${nested}\n</${name}>`;
  }

  // Convert to string
  const strValue = String(value);

  // Generate attributes string
  const attrsString = options.attributes
    ? Object.entries(options.attributes)
        .map(([key, val]) => ` ${key}="${escapeXmlAttribute(val)}"`)
        .join("")
    : "";

  // Handle CDATA
  if (options.cdata) {
    return `<${name}${attrsString}>${wrapCdata(strValue)}</${name}>`;
  }

  // Escape content
  const escapedValue = escapeXml(strValue);
  return `<${name}${attrsString}>${escapedValue}</${name}>`;
}

/**
 * Generate XML attributes string from object
 */
export function generateAttributes(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(([key, value]) => ` ${key}="${escapeXmlAttribute(value)}"`)
    .join("");
}

// ============================================
// MAIN GENERATOR
// ============================================

/**
 * Generate XML document from array of mapped properties
 */
export function generateXml(
  items: Record<string, unknown>[],
  options: Partial<XmlGeneratorOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines: string[] = [];
  const indent = opts.prettyPrint ? opts.indent || "  " : "";
  const newline = opts.prettyPrint ? "\n" : "";

  // XML declaration
  if (opts.declaration) {
    lines.push(`<?xml version="${opts.version}" encoding="${opts.encoding}"?>`);
  }

  // Root element opening tag
  let rootAttrs = "";
  if (opts.namespace) {
    if (opts.namespacePrefix) {
      rootAttrs += ` xmlns:${opts.namespacePrefix}="${opts.namespace}"`;
    } else {
      rootAttrs += ` xmlns="${opts.namespace}"`;
    }
  }
  if (opts.rootAttributes) {
    rootAttrs += generateAttributes(opts.rootAttributes);
  }
  lines.push(`<${opts.rootElement}${rootAttrs}>`);

  // Generate items
  for (const item of items) {
    const itemLines = generateItemXml(item, opts);
    if (opts.prettyPrint) {
      lines.push(indentLines(itemLines, indent));
    } else {
      lines.push(itemLines);
    }
  }

  // Root element closing tag
  lines.push(`</${opts.rootElement}>`);

  return lines.join(newline);
}

/**
 * Generate XML for a single item
 */
function generateItemXml(
  item: Record<string, unknown>,
  options: XmlGeneratorOptions
): string {
  const lines: string[] = [];
  const indent = options.prettyPrint ? options.indent || "  " : "";
  const newline = options.prettyPrint ? "\n" : "";

  // Separate attribute fields from element fields
  const attributeFields = options.attributeFields || [];
  const attrs: Record<string, string> = {};
  const elements: [string, unknown][] = [];

  for (const [key, value] of Object.entries(item)) {
    if (attributeFields.includes(key)) {
      if (value !== null && value !== undefined && value !== "") {
        attrs[key] = String(value);
      }
    } else {
      elements.push([key, value]);
    }
  }

  // Item opening tag
  const attrString = Object.keys(attrs).length > 0 ? generateAttributes(attrs) : "";
  lines.push(`<${options.itemElement}${attrString}>`);

  // Generate child elements
  for (const [key, value] of elements) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    const useCdata = shouldUseCdata(String(value), key, options);
    const elementXml = generateElementWithOptions(key, value, useCdata, options);
    
    if (elementXml) {
      if (options.prettyPrint) {
        lines.push(indentLines(elementXml, indent));
      } else {
        lines.push(elementXml);
      }
    }
  }

  // Item closing tag
  lines.push(`</${options.itemElement}>`);

  return lines.join(newline);
}

/**
 * Generate element with context-aware options
 */
function generateElementWithOptions(
  name: string,
  value: unknown,
  useCdata: boolean,
  options: XmlGeneratorOptions
): string {
  // Handle arrays specially (e.g., images)
  if (Array.isArray(value)) {
    return value
      .map(item => generateElement(name, item, { cdata: useCdata }))
      .filter(Boolean)
      .join(options.prettyPrint ? "\n" : "");
  }

  // Handle nested objects
  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    const nestedLines: string[] = [];
    const indent = options.prettyPrint ? options.indent || "  " : "";
    const newline = options.prettyPrint ? "\n" : "";
    
    nestedLines.push(`<${name}>`);
    
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val !== null && val !== undefined && val !== "") {
        const nestedUseCdata = shouldUseCdata(String(val), key, options);
        const nestedXml = generateElement(key, val, { cdata: nestedUseCdata });
        if (nestedXml && options.prettyPrint) {
          nestedLines.push(indentLines(nestedXml, indent));
        } else if (nestedXml) {
          nestedLines.push(nestedXml);
        }
      }
    }
    
    nestedLines.push(`</${name}>`);
    return nestedLines.join(newline);
  }

  return generateElement(name, value, { cdata: useCdata });
}

/**
 * Indent all lines in a string
 */
function indentLines(text: string, indent: string): string {
  return text
    .split("\n")
    .map(line => indent + line)
    .join("\n");
}

// ============================================
// SPECIALIZED GENERATORS
// ============================================

/**
 * Generate images XML element with multiple image children
 */
export function generateImagesXml(
  images: string[],
  options: {
    containerElement?: string;
    itemElement?: string;
    urlAttribute?: boolean;
  } = {}
): string {
  const {
    containerElement = "images",
    itemElement = "image",
    urlAttribute = false,
  } = options;

  if (!images || images.length === 0) {
    return `<${containerElement}/>`;
  }

  const imageElements = images.map(url => {
    if (urlAttribute) {
      return `<${itemElement} url="${escapeXmlAttribute(url)}"/>`;
    }
    return `<${itemElement}>${escapeXml(url)}</${itemElement}>`;
  });

  return `<${containerElement}>\n${imageElements.map(e => "  " + e).join("\n")}\n</${containerElement}>`;
}

/**
 * Generate location XML element with coordinates
 */
export function generateLocationXml(
  lat: number | null | undefined,
  lng: number | null | undefined,
  address?: string
): string {
  const elements: string[] = [];
  
  if (lat !== null && lat !== undefined) {
    elements.push(`<latitude>${lat}</latitude>`);
  }
  if (lng !== null && lng !== undefined) {
    elements.push(`<longitude>${lng}</longitude>`);
  }
  if (address) {
    elements.push(`<address>${wrapCdata(address)}</address>`);
  }

  if (elements.length === 0) {
    return "";
  }

  return `<location>\n${elements.map(e => "  " + e).join("\n")}\n</location>`;
}

/**
 * Generate contact XML element
 */
export function generateContactXml(contact: {
  name?: string;
  phone?: string;
  email?: string;
  mobile?: string;
}): string {
  const elements: string[] = [];
  
  if (contact.name) {
    elements.push(`<name>${escapeXml(contact.name)}</name>`);
  }
  if (contact.phone) {
    elements.push(`<phone>${escapeXml(contact.phone)}</phone>`);
  }
  if (contact.mobile) {
    elements.push(`<mobile>${escapeXml(contact.mobile)}</mobile>`);
  }
  if (contact.email) {
    elements.push(`<email>${escapeXml(contact.email)}</email>`);
  }

  if (elements.length === 0) {
    return "";
  }

  return `<contact>\n${elements.map(e => "  " + e).join("\n")}\n</contact>`;
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate XML string is well-formed
 */
export function validateXmlString(xml: string): { valid: boolean; error?: string } {
  try {
    // Basic validation - check for matching tags
    const openTags: string[] = [];
    const tagRegex = /<\/?([a-zA-Z_][a-zA-Z0-9_-]*)[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(xml)) !== null) {
      const fullMatch = match[0];
      const tagName = match[1];

      // Skip self-closing tags and declarations
      if (fullMatch.endsWith("/>") || fullMatch.startsWith("<?")) {
        continue;
      }

      if (fullMatch.startsWith("</")) {
        // Closing tag
        const lastOpen = openTags.pop();
        if (lastOpen !== tagName) {
          return {
            valid: false,
            error: `Mismatched tags: expected </${lastOpen}> but found </${tagName}>`,
          };
        }
      } else {
        // Opening tag
        openTags.push(tagName);
      }
    }

    if (openTags.length > 0) {
      return {
        valid: false,
        error: `Unclosed tags: ${openTags.join(", ")}`,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================
// EXPORT UTILITIES
// ============================================

/**
 * Convert XML string to Blob for download
 */
export function xmlToBlob(xml: string, encoding: string = "UTF-8"): Blob {
  // Add BOM for UTF-8 if needed
  const bom = encoding.toUpperCase() === "UTF-8" ? "\uFEFF" : "";
  return new Blob([bom + xml], { type: `application/xml; charset=${encoding}` });
}

/**
 * Convert XML string to Buffer for Node.js
 */
export function xmlToBuffer(xml: string, encoding: BufferEncoding = "utf-8"): Buffer {
  // Add BOM for UTF-8 if needed
  const bom = encoding === "utf-8" ? "\uFEFF" : "";
  return Buffer.from(bom + xml, encoding);
}
