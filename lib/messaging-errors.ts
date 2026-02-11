/**
 * Standardized error messages for external messaging connection flows.
 * Used by connection components to show consistent, actionable error states.
 */

import type { MessagingPlatform } from "@/types/messaging";

export interface MessagingErrorInfo {
  title: string;
  message: string;
  action: string;
  helpUrl?: string;
}

export const MESSAGING_ERRORS: Record<
  MessagingPlatform,
  Record<string, MessagingErrorInfo>
> = {
  VIBER: {
    INVALID_TOKEN: {
      title: "Invalid Viber Token",
      message:
        "The token you entered is not valid. Please check that you copied it correctly from Viber Partners.",
      action: "Try Again",
    },
    BOT_NOT_APPROVED: {
      title: "Bot Not Approved",
      message:
        "Your Viber bot has not been approved yet. This usually takes 1–2 business days.",
      action: "Check Status",
    },
    WEBHOOK_FAILED: {
      title: "Webhook Setup Failed",
      message:
        "We could not set up the webhook connection. This might be a temporary issue.",
      action: "Retry Connection",
    },
  },
  WHATSAPP: {
    USER_CANCELLED: {
      title: "Connection Cancelled",
      message: "You cancelled the Facebook login. Click below to try again.",
      action: "Retry",
    },
    NO_BUSINESS_ACCOUNT: {
      title: "No Business Account Found",
      message:
        "We could not find a WhatsApp Business Account. Make sure you have one set up in Facebook Business Manager.",
      action: "Learn More",
      helpUrl: "https://business.facebook.com/wa/manage",
    },
    PERMISSION_DENIED: {
      title: "Permission Denied",
      message:
        "You need admin access to the WhatsApp Business Account to connect it.",
      action: "Contact Admin",
    },
    CONNECTION_FAILED: {
      title: "Connection Failed",
      message:
        "We could not connect your WhatsApp account. Please try again or contact support if the problem persists.",
      action: "Try Again",
    },
  },
  MESSENGER: {
    USER_CANCELLED: {
      title: "Connection Cancelled",
      message: "You cancelled the Facebook login. Click below to try again.",
      action: "Retry",
    },
    NO_PAGES: {
      title: "No Pages Found",
      message:
        "We could not find any Facebook Pages you manage. You need a Page to use Messenger.",
      action: "Create Page",
      helpUrl: "https://www.facebook.com/pages/create",
    },
    PERMISSION_DENIED: {
      title: "Permission Denied",
      message:
        "You need to grant message management permissions to connect Messenger.",
      action: "Retry with Permissions",
    },
  },
};
