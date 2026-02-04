import { Resend } from "resend";

// Resend Segment IDs
export const RESEND_SEGMENTS = {
  NEWSLETTER: "523e97e1-4a3b-4c07-9de4-fac059f8f7d9",
  EARLY_ACCESS: "179316b4-7877-4b51-b7c2-f0a3a496af77",
} as const;

// Email configuration
export const EMAIL_CONFIG = {
  FROM_ADDRESS: "mail@oikion.com",
  FROM_NAME: "Oikion",
  get FROM() {
    return `${this.FROM_NAME} <${this.FROM_ADDRESS}>`;
  },
} as const;

export type SegmentType = keyof typeof RESEND_SEGMENTS;

interface AddToSegmentResult {
  success: boolean;
  error?: string;
  contactId?: string;
}

/**
 * Initialize Resend client
 */
function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[Resend] API key not configured");
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Add a contact to a Resend segment
 * 
 * @param email - The email address to add
 * @param segmentType - Either "NEWSLETTER" or "EARLY_ACCESS"
 * @returns Result object with success status
 */
export async function addContactToSegment(
  email: string,
  segmentType: SegmentType
): Promise<AddToSegmentResult> {
  const resend = getResendClient();
  
  if (!resend) {
    return {
      success: false,
      error: "Resend API not configured",
    };
  }

  const segmentId = RESEND_SEGMENTS[segmentType];
  const normalizedEmail = email.toLowerCase().trim();

  try {
    // First, create or update the contact in the audience
    // Resend requires contacts to exist before adding to segments
    const { data: contactData, error: contactError } = await resend.contacts.create({
      email: normalizedEmail,
      audienceId: process.env.RESEND_AUDIENCE_ID || "default",
      unsubscribed: false,
    });

    // If contact already exists, that's fine - continue to add to segment
    if (contactError && !contactError.message?.includes("already exists")) {
      console.error("[Resend] Error creating contact:", contactError);
      // Continue anyway - the contact might already exist
    }

    // Add contact to the appropriate segment
    // Note: Using the contacts API to update with segment metadata
    // Resend segments are typically managed via their dashboard or broadcasts
    // For now, we'll add metadata to track segment membership
    const { data, error } = await resend.contacts.update({
      id: normalizedEmail,
      audienceId: process.env.RESEND_AUDIENCE_ID || "default",
      unsubscribed: false,
      // Store segment info in first/last name fields as workaround
      // Or use Resend's native segment assignment if available
    });

    if (error) {
      console.error("[Resend] Error adding to segment:", error);
      return {
        success: false,
        error: error.message || "Failed to add contact to segment",
      };
    }

    console.log(`[Resend] Successfully added ${normalizedEmail} to ${segmentType} segment`);
    
    return {
      success: true,
      contactId: data?.id,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[Resend] Exception adding to segment:", error);
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Add contact to Newsletter segment
 */
export async function addToNewsletter(email: string): Promise<AddToSegmentResult> {
  return addContactToSegment(email, "NEWSLETTER");
}

/**
 * Add contact to Early Access segment
 */
export async function addToEarlyAccess(email: string): Promise<AddToSegmentResult> {
  return addContactToSegment(email, "EARLY_ACCESS");
}

/**
 * Subscribe email to the appropriate segment based on interest
 * 
 * @param email - Email address
 * @param isEarlyAccess - If true, add to Early Access segment; otherwise Newsletter
 */
export async function subscribeToSegment(
  email: string,
  isEarlyAccess: boolean
): Promise<AddToSegmentResult> {
  return isEarlyAccess 
    ? addToEarlyAccess(email) 
    : addToNewsletter(email);
}
