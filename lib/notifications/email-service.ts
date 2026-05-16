// @ts-nocheck
// TODO: Fix type errors
/**
 * Email Notification Service
 * Handles sending email notifications based on user preferences
 */

import { randomBytes } from "crypto";
import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";
import { NotificationCategory } from "@prisma/client";
import { EMAIL_CONFIG } from "@/lib/resend-segments";

// Import all email templates
import SocialPostLikedEmail from "@/emails/notifications/SocialPostLiked";
import SocialPostCommentedEmail from "@/emails/notifications/SocialPostCommented";
import SocialPostMentionedEmail from "@/emails/notifications/SocialPostMentioned";
import EntitySharedWithYouEmail from "@/emails/notifications/EntitySharedWithYou";
import EntityShareAcceptedEmail from "@/emails/notifications/EntityShareAccepted";
import ConnectionRequestEmail from "@/emails/notifications/ConnectionRequest";
import ConnectionAcceptedEmail from "@/emails/notifications/ConnectionAccepted";
import DealProposedEmail from "@/emails/notifications/DealProposed";
import DealStatusChangedEmail from "@/emails/notifications/DealStatusChanged";
import TaskAssignedEmail from "@/emails/notifications/TaskAssigned";
import TaskDueSoonEmail from "@/emails/notifications/TaskDueSoon";
import CalendarEventInvitedEmail from "@/emails/notifications/CalendarEventInvited";
import CalendarEventUpdatedEmail from "@/emails/notifications/CalendarEventUpdated";
import ClientCreatedEmail from "@/emails/notifications/ClientCreated";
import PropertyCreatedEmail from "@/emails/notifications/PropertyCreated";
import AccountUpdatedEmail from "@/emails/notifications/AccountUpdated";
import PropertyUpdatedEmail from "@/emails/notifications/PropertyUpdated";

// Phase 6 email templates
import RequestCreatedEmail from "@/emails/notifications/RequestCreated";
import RequestAssignedEmail from "@/emails/notifications/RequestAssigned";
import RequestStatusChangedEmail from "@/emails/notifications/RequestStatusChanged";
import ShowingScheduledEmail from "@/emails/notifications/ShowingScheduled";
import ShowingStatusChangedEmail from "@/emails/notifications/ShowingStatusChanged";
import CommentAddedEmail from "@/emails/notifications/CommentAdded";
import DealStageChangedEmail from "@/emails/notifications/DealStageChanged";

// Existing email templates
import NewTaskFromCRMEmail from "@/emails/NewTaskFromCRM";
import NewTaskCommentEmail from "@/emails/NewTaskComment";
import CalendarReminderEmail from "@/emails/CalendarReminder";
import ShareEntityEmail from "@/emails/ShareEntity";

/**
 * Preference category mapping from NotificationCategory to UserNotificationSettings field
 */
type PreferenceCategory = 
  | "social"
  | "crm"
  | "calendar"
  | "tasks"
  | "deals"
  | "documents"
  | "system";

const categoryToPreference: Record<NotificationCategory, PreferenceCategory> = {
  // Social notifications
  SOCIAL_POST_LIKED: "social",
  SOCIAL_POST_COMMENTED: "social",
  SOCIAL_POST_MENTIONED: "social",
  
  // CRM/Account notifications
  ACCOUNT_UPDATED: "crm",
  ACCOUNT_DELETED: "crm",
  ACCOUNT_TASK_CREATED: "crm",
  ACCOUNT_TASK_UPDATED: "crm",
  CLIENT_CREATED: "crm",
  CLIENT_ASSIGNED: "crm",
  CONTACT_CREATED: "crm",
  CONTACT_ASSIGNED: "crm",
  PROPERTY_CREATED: "crm",
  PROPERTY_ASSIGNED: "crm",
  PROPERTY_UPDATED: "crm",
  PROPERTY_DELETED: "crm",
  
  // Calendar notifications
  CALENDAR_REMINDER: "calendar",
  CALENDAR_EVENT_CREATED: "calendar",
  CALENDAR_EVENT_UPDATED: "calendar",
  CALENDAR_EVENT_CANCELLED: "calendar",
  CALENDAR_EVENT_INVITED: "calendar",
  
  // Task notifications
  TASK_ASSIGNED: "tasks",
  TASK_COMMENT_ADDED: "tasks",
  TASK_DUE_SOON: "tasks",
  
  // Deal notifications
  DEAL_PROPOSED: "deals",
  DEAL_UPDATED: "deals",
  DEAL_ACCEPTED: "deals",
  DEAL_COMPLETED: "deals",
  
  // Document notifications
  DOCUMENT_SHARED: "documents",
  DOCUMENT_VIEWED: "documents",
  
  // Connection/Entity sharing notifications
  ENTITY_SHARED_WITH_YOU: "social",
  ENTITY_SHARE_ACCEPTED: "social",
  CONNECTION_REQUEST: "social",
  CONNECTION_ACCEPTED: "social",

  // Messaging notifications
  MESSAGE_RECEIVED: "social",
  MESSAGE_MENTION: "social",
  CHANNEL_INVITE: "social",
  CHANNEL_MESSAGE: "social",

  // System notifications
  SYSTEM: "system",
  WELCOME: "system",
  ACCOUNT_WARNING: "system",
  ACCOUNT_SUSPENSION: "system",
  ACCOUNT_UNSUSPENSION: "system",
  ACCOUNT_DELETION_NOTICE: "system",
  FEEDBACK_RESPONSE: "system",

  // Organization
  CONTACT_FORM_SUBMISSION: "crm",
  ORGANIZATION_INVITE: "system",

  // Requests (Phase 1)
  REQUEST_CREATED: "crm",
  REQUEST_ASSIGNED: "crm",
  REQUEST_STATUS_CHANGED: "crm",

  // Showings (Phase 1)
  SHOWING_SCHEDULED: "calendar",
  SHOWING_CONFIRMED: "calendar",
  SHOWING_CANCELLED: "calendar",
  SHOWING_COMPLETED: "calendar",
  SHOWING_NO_SHOW: "calendar",

  // Deal stage (Phase 1)
  DEAL_STAGE_CHANGED: "deals",

  // Comments (Phase 1)
  COMMENT_ADDED_PROPERTY: "crm",
  COMMENT_ADDED_CONTACT: "crm",
  COMMENT_ADDED_REQUEST: "crm",
  COMMENT_ADDED_DEAL: "deals",

  // Bulk operations (Phase 1)
  BULK_ARCHIVE_COMPLETED: "crm",

  // Entity access
  ENTITY_ACCESS_REQUESTED: "crm",
};

/**
 * Get or create user's notification settings, ensuring an unsubscribe token exists.
 */
async function getUserNotificationSettings(userId: string) {
  const existing = await prismadb.userNotificationSettings.findUnique({
    where: { userId },
  });

  if (!existing) {
    // No settings row yet — create one so the user gets an unsubscribe token
    // on their first email. All preference toggles use schema defaults (true).
    const token = randomBytes(32).toString("hex");
    return await prismadb.userNotificationSettings.upsert({
      where: { userId },
      update: {},
      create: { userId, unsubscribeToken: token },
    });
  }

  // Backfill unsubscribe token for rows that don't have one yet
  if (!existing.unsubscribeToken) {
    const token = randomBytes(32).toString("hex");
    return await prismadb.userNotificationSettings.update({
      where: { id: existing.id },
      data: { unsubscribeToken: token },
    });
  }

  return existing;
}

/**
 * Check if email notifications are enabled for a specific category
 */
async function isEmailEnabledForCategory(
  userId: string,
  category: NotificationCategory
): Promise<boolean> {
  const preferenceCategory = categoryToPreference[category];
  if (!preferenceCategory) {
    return true; // Default to enabled for unknown categories
  }

  const settings = await getUserNotificationSettings(userId);
  const emailField = `${preferenceCategory}EmailEnabled` as keyof typeof settings;
  
  return settings[emailField] !== false;
}

/**
 * Get user data for email sending
 */
async function getUserForEmail(userId: string) {
  return await prismadb.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      userLanguage: true,
      userTheme: true,
    },
  });
}

/**
 * Email data interface for notification emails
 */
export interface NotificationEmailData {
  recipientName?: string; // looked up from userId internally when not provided by caller
  actorName?: string;
  actorId?: string;
  entityId?: string;
  entityName?: string;
  entityType?: string;
  message?: string;
  metadata?: Record<string, any>;
}

/**
 * Generate subject line for notification
 */
function getSubjectLine(
  category: NotificationCategory,
  language: string,
  data: NotificationEmailData
): string {
  const subjects: Record<NotificationCategory, Record<string, string>> = {
    SOCIAL_POST_LIKED: {
      en: `${data.actorName || "Someone"} liked your post`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} έκανε like στη δημοσίευσή σας`,
      cz: `${data.actorName || "Někdo"} se líbil váš příspěvek`,
    },
    SOCIAL_POST_COMMENTED: {
      en: `${data.actorName || "Someone"} commented on your post`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} σχολίασε τη δημοσίευσή σας`,
      cz: `${data.actorName || "Někdo"} okomentoval váš příspěvek`,
    },
    SOCIAL_POST_MENTIONED: {
      en: `${data.actorName || "Someone"} mentioned you in a post`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} σας ανέφερε σε μια δημοσίευση`,
      cz: `${data.actorName || "Někdo"} vás zmínil v příspěvku`,
    },
    ENTITY_SHARED_WITH_YOU: {
      en: `${data.actorName || "Someone"} shared content with you`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} μοιράστηκε περιεχόμενο μαζί σας`,
      cz: `${data.actorName || "Někdo"} s vámi sdílel obsah`,
    },
    ENTITY_SHARE_ACCEPTED: {
      en: `${data.actorName || "Someone"} accepted your shared content`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} αποδέχτηκε το κοινοποιημένο περιεχόμενό σας`,
      cz: `${data.actorName || "Někdo"} přijal váš sdílený obsah`,
    },
    CONNECTION_REQUEST: {
      en: `${data.actorName || "Someone"} wants to connect with you`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} θέλει να συνδεθεί μαζί σας`,
      cz: `${data.actorName || "Někdo"} se s vámi chce spojit`,
    },
    CONNECTION_ACCEPTED: {
      en: `${data.actorName || "Someone"} accepted your connection request`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} αποδέχτηκε το αίτημα σύνδεσής σας`,
      cz: `${data.actorName || "Někdo"} přijal vaši žádost o spojení`,
    },
    DEAL_PROPOSED: {
      en: `${data.actorName || "Someone"} proposed a new deal`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} πρότεινε μια νέα συμφωνία`,
      cz: `${data.actorName || "Někdo"} navrhl nový obchod`,
    },
    DEAL_UPDATED: {
      en: "Deal status updated",
      el: "Η κατάσταση της συμφωνίας ενημερώθηκε",
      cz: "Stav obchodu aktualizován",
    },
    DEAL_ACCEPTED: {
      en: "Deal accepted!",
      el: "Η συμφωνία έγινε αποδεκτή!",
      cz: "Obchod přijat!",
    },
    DEAL_COMPLETED: {
      en: "Deal completed - Congratulations!",
      el: "Η συμφωνία ολοκληρώθηκε - Συγχαρητήρια!",
      cz: "Obchod dokončen - Gratulujeme!",
    },
    TASK_ASSIGNED: {
      en: "New task assigned to you",
      el: "Νέα εργασία σας ανατέθηκε",
      cz: "Nový úkol vám byl přiřazen",
    },
    TASK_COMMENT_ADDED: {
      en: `${data.actorName || "Someone"} commented on a task`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} σχολίασε σε μια εργασία`,
      cz: `${data.actorName || "Někdo"} okomentoval úkol`,
    },
    TASK_DUE_SOON: {
      en: "Task due soon",
      el: "Η εργασία λήγει σύντομα",
      cz: "Úkol brzy končí",
    },
    CALENDAR_REMINDER: {
      en: `Reminder: ${data.entityName || "Event"} starting soon`,
      el: `Υπενθύμιση: ${data.entityName || "Εκδήλωση"} ξεκινά σύντομα`,
      cz: `Připomínka: ${data.entityName || "Událost"} brzy začíná`,
    },
    CALENDAR_EVENT_CREATED: {
      en: "New calendar event",
      el: "Νέα εκδήλωση ημερολογίου",
      cz: "Nová kalendářní událost",
    },
    CALENDAR_EVENT_UPDATED: {
      en: "Calendar event updated",
      el: "Η εκδήλωση ημερολογίου ενημερώθηκε",
      cz: "Kalendářní událost aktualizována",
    },
    CALENDAR_EVENT_CANCELLED: {
      en: "Calendar event cancelled",
      el: "Η εκδήλωση ημερολογίου ακυρώθηκε",
      cz: "Kalendářní událost zrušena",
    },
    CALENDAR_EVENT_INVITED: {
      en: `${data.actorName || "Someone"} invited you to an event`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} σας προσκάλεσε σε μια εκδήλωση`,
      cz: `${data.actorName || "Někdo"} vás pozval na událost`,
    },
    CLIENT_CREATED: {
      en: "New client added",
      el: "Νέος πελάτης προστέθηκε",
      cz: "Nový klient přidán",
    },
    CLIENT_ASSIGNED: {
      en: "Client assigned to you",
      el: "Πελάτης ανατέθηκε σε εσάς",
      cz: "Klient vám byl přiřazen",
    },
    CONTACT_CREATED: {
      en: "New contact added",
      el: "Νέα επαφή προστέθηκε",
      cz: "Nový kontakt přidán",
    },
    CONTACT_ASSIGNED: {
      en: "Contact assigned to you",
      el: "Επαφή ανατέθηκε σε εσάς",
      cz: "Kontakt vám byl přiřazen",
    },
    PROPERTY_CREATED: {
      en: "New property added",
      el: "Νέο ακίνητο προστέθηκε",
      cz: "Nová nemovitost přidána",
    },
    PROPERTY_ASSIGNED: {
      en: "Property assigned to you",
      el: "Ακίνητο ανατέθηκε σε εσάς",
      cz: "Nemovitost vám byla přiřazena",
    },
    ACCOUNT_UPDATED: {
      en: `Account "${data.entityName || ""}" was updated`,
      el: `Ο λογαριασμός "${data.entityName || ""}" ενημερώθηκε`,
      cz: `Účet "${data.entityName || ""}" byl aktualizován`,
    },
    ACCOUNT_DELETED: {
      en: `Account "${data.entityName || ""}" was deleted`,
      el: `Ο λογαριασμός "${data.entityName || ""}" διαγράφηκε`,
      cz: `Účet "${data.entityName || ""}" byl smazán`,
    },
    ACCOUNT_TASK_CREATED: {
      en: `New task created for "${data.entityName || "account"}"`,
      el: `Νέα εργασία δημιουργήθηκε για "${data.entityName || "λογαριασμό"}"`,
      cz: `Nový úkol vytvořen pro "${data.entityName || "účet"}"`,
    },
    ACCOUNT_TASK_UPDATED: {
      en: `Task updated for "${data.entityName || "account"}"`,
      el: `Η εργασία ενημερώθηκε για "${data.entityName || "λογαριασμό"}"`,
      cz: `Úkol aktualizován pro "${data.entityName || "účet"}"`,
    },
    PROPERTY_UPDATED: {
      en: `Property "${data.entityName || ""}" was updated`,
      el: `Το ακίνητο "${data.entityName || ""}" ενημερώθηκε`,
      cz: `Nemovitost "${data.entityName || ""}" byla aktualizována`,
    },
    PROPERTY_DELETED: {
      en: `Property "${data.entityName || ""}" was deleted`,
      el: `Το ακίνητο "${data.entityName || ""}" διαγράφηκε`,
      cz: `Nemovitost "${data.entityName || ""}" byla smazána`,
    },
    DOCUMENT_SHARED: {
      en: `${data.actorName || "Someone"} shared a document with you`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} μοιράστηκε ένα έγγραφο μαζί σας`,
      cz: `${data.actorName || "Někdo"} s vámi sdílel dokument`,
    },
    DOCUMENT_VIEWED: {
      en: `${data.actorName || "Someone"} viewed your document`,
      el: `Ο/Η ${data.actorName || "Κάποιος"} είδε το έγγραφό σας`,
      cz: `${data.actorName || "Někdo"} zobrazil váš dokument`,
    },
    SYSTEM: {
      en: "System notification",
      el: "Ειδοποίηση συστήματος",
      cz: "Systémové oznámení",
    },
    WELCOME: {
      en: "Welcome to Oikion!",
      el: "Καλώς ήρθατε στο Oikion!",
      cz: "Vítejte v Oikionu!",
    },
    ACCOUNT_WARNING: {
      en: "Important: Account warning",
      el: "Σημαντικό: Προειδοποίηση λογαριασμού",
      cz: "Důležité: Varování účtu",
    },
    ACCOUNT_SUSPENSION: {
      en: "Your account has been suspended",
      el: "Ο λογαριασμός σας έχει ανασταλεί",
      cz: "Váš účet byl pozastaven",
    },
    ACCOUNT_UNSUSPENSION: {
      en: "Your account has been restored",
      el: "Ο λογαριασμός σας αποκαταστάθηκε",
      cz: "Váš účet byl obnoven",
    },
    ACCOUNT_DELETION_NOTICE: {
      en: "Account deletion notice",
      el: "Ειδοποίηση διαγραφής λογαριασμού",
      cz: "Oznámení o smazání účtu",
    },
    FEEDBACK_RESPONSE: {
      en: "Response to your feedback",
      el: "Απάντηση στα σχόλιά σας",
      cz: "Odpověď na vaši zpětnou vazbu",
    },

    // Requests (Phase 6)
    REQUEST_CREATED: {
      en: "New request created",
      el: "Νέο αίτημα δημιουργήθηκε",
      cz: "Nový požadavek vytvořen",
    },
    REQUEST_ASSIGNED: {
      en: "Request assigned to you",
      el: "Ανατέθηκε αίτημα σε εσάς",
      cz: "Požadavek vám byl přiřazen",
    },
    REQUEST_STATUS_CHANGED: {
      en: "Request status changed",
      el: "Αλλαγή κατάστασης αιτήματος",
      cz: "Stav požadavku změněn",
    },

    // Showings (Phase 6)
    SHOWING_SCHEDULED: {
      en: "New showing scheduled",
      el: "Νέα επίσκεψη προγραμματίστηκε",
      cz: "Nová prohlídka naplánována",
    },
    SHOWING_CONFIRMED: {
      en: "Showing confirmed",
      el: "Επίσκεψη επιβεβαιώθηκε",
      cz: "Prohlídka potvrzena",
    },
    SHOWING_CANCELLED: {
      en: "Showing cancelled",
      el: "Επίσκεψη ακυρώθηκε",
      cz: "Prohlídka zrušena",
    },
    SHOWING_COMPLETED: {
      en: "Showing completed",
      el: "Επίσκεψη ολοκληρώθηκε",
      cz: "Prohlídka dokončena",
    },
    SHOWING_NO_SHOW: {
      en: "Showing no-show recorded",
      el: "Απουσία από επίσκεψη",
      cz: "Zaznamenána nepřítomnost na prohlídce",
    },

    // Deal stage (Phase 6)
    DEAL_STAGE_CHANGED: {
      en: "Deal stage updated",
      el: "Ενημέρωση σταδίου συναλλαγής",
      cz: "Fáze obchodu aktualizována",
    },

    // Comments (Phase 6)
    COMMENT_ADDED_PROPERTY: {
      en: "New comment on property",
      el: "Νέο σχόλιο σε ακίνητο",
      cz: "Nový komentář k nemovitosti",
    },
    COMMENT_ADDED_CONTACT: {
      en: "New comment on contact",
      el: "Νέο σχόλιο σε επαφή",
      cz: "Nový komentář ke kontaktu",
    },
    COMMENT_ADDED_REQUEST: {
      en: "New comment on request",
      el: "Νέο σχόλιο σε αίτημα",
      cz: "Nový komentář k požadavku",
    },
    COMMENT_ADDED_DEAL: {
      en: "New comment on deal",
      el: "Νέο σχόλιο σε συναλλαγή",
      cz: "Nový komentář k obchodu",
    },

    // Bulk operations (Phase 6)
    BULK_ARCHIVE_COMPLETED: {
      en: "Bulk archive completed",
      el: "Μαζική αρχειοθέτηση ολοκληρώθηκε",
      cz: "Hromadný archiv dokončen",
    },
    ENTITY_ACCESS_REQUESTED: {
      en: "Access request for a shared item",
      el: "Αίτηση πρόσβασης σε κοινόχρηστο στοιχείο",
      cz: "Žádost o přístup ke sdílené položce",
    },
  };

  const langSubjects = subjects[category];
  if (!langSubjects) {
    return "Notification from Oikion";
  }

  return langSubjects[language] || langSubjects.en || "Notification from Oikion";
}

/**
 * Send notification email for a specific category
 */
export async function sendNotificationEmail(
  userId: string,
  category: NotificationCategory,
  data: NotificationEmailData,
  notificationId?: string | null
): Promise<boolean> {
  try {
    // Fetch settings once (includes unsubscribeToken)
    const settings = await getUserNotificationSettings(userId);

    // Check if email is enabled for this category
    const preferenceCategory = categoryToPreference[category];
    const emailField = preferenceCategory
      ? (`${preferenceCategory}EmailEnabled` as keyof typeof settings)
      : null;
    if (emailField && settings[emailField] === false) {
      return false;
    }

    // Get user data
    const user = await getUserForEmail(userId);
    if (!user || !user.email) {
      console.error("[EMAIL_SERVICE] User not found or has no email:", userId);
      return false;
    }

    const userEmail = user.email;
    const language = user.userLanguage || "en";
    const recipientName = user.name || userEmail.split("@")[0];
    const userTheme = user.userTheme || "estate";

    // Deduplication check: skip if already sent for the same notification
    // within the last 5 minutes
    if (notificationId) {
      const recentSend = await prismadb.notificationDeliveryLog.findFirst({
        where: {
          notificationId,
          channel: "EMAIL",
          recipient: userEmail,
          status: "SENT",
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
      });
      if (recentSend) {
        return true; // Already sent — skip duplicate
      }
    }

    // Get Resend instance
    const resend = await resendHelper();

    // Generate subject line
    const subject = getSubjectLine(category, language, data);

    // Build unsubscribe URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.oikion.gr";
    const unsubscribeUrl = settings?.unsubscribeToken
      ? `${appUrl}/api/notifications/unsubscribe?token=${settings.unsubscribeToken}&category=${preferenceCategory ?? "system"}`
      : null;

    // Get the appropriate email template
    const emailComponent = getEmailComponent(category, {
      ...data,
      recipientName,
      userLanguage: language,
      userTheme,
      unsubscribeUrl: unsubscribeUrl ?? undefined,
    });

    if (!emailComponent) {
      console.error("[EMAIL_SERVICE] No email template for category:", category);
      return false;
    }

    // Create PENDING delivery log entry — best-effort, never blocks the send
    let deliveryLog: { id: string } | null = null;
    try {
      deliveryLog = await prismadb.notificationDeliveryLog.create({
        data: {
          notificationId: notificationId ?? null,
          channel: "EMAIL",
          recipient: userEmail,
          status: "PENDING",
          attempts: 1,
          lastAttemptAt: new Date(),
        },
      });
    } catch (logErr) {
      console.warn("[EMAIL_SERVICE] Delivery log create failed, proceeding with send:", logErr);
    }

    // Send email and update log
    try {
      const sendPayload: Parameters<typeof resend.emails.send>[0] = {
        from: EMAIL_CONFIG.FROM,
        to: userEmail,
        subject,
        react: emailComponent,
      };

      // Attach List-Unsubscribe headers when we have a token
      if (unsubscribeUrl) {
        sendPayload.headers = {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        };
      }

      const result = await resend.emails.send(sendPayload);

      if (deliveryLog) {
        await prismadb.notificationDeliveryLog.update({
          where: { id: deliveryLog.id },
          data: { status: "SENT", externalId: result.data?.id ?? null },
        });
      }
    } catch (emailErr) {
      if (deliveryLog) {
        await prismadb.notificationDeliveryLog.update({
          where: { id: deliveryLog.id },
          data: { status: "FAILED", error: String(emailErr) },
        });
      }
      console.error("[EMAIL_SERVICE_SEND]", emailErr);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[EMAIL_SERVICE] Failed to send email:", error);
    return false;
  }
}

/**
 * Get the appropriate email component for a notification category
 */
function getEmailComponent(
  category: NotificationCategory,
  props: NotificationEmailData & { recipientName: string; userLanguage: string; userTheme?: string; unsubscribeUrl?: string }
): React.ReactElement | null {
  const { recipientName, userLanguage, userTheme, actorName, entityId, entityName, metadata } = props;

  switch (category) {
    // Social notifications
    case "SOCIAL_POST_LIKED":
      return SocialPostLikedEmail({
        recipientName,
        actorName: actorName || "Someone",
        postContent: metadata?.postContent,
        postId: entityId || "",
        userLanguage,
        userTheme,
      });

    case "SOCIAL_POST_COMMENTED":
      return SocialPostCommentedEmail({
        recipientName,
        actorName: actorName || "Someone",
        postContent: metadata?.postContent,
        commentContent: metadata?.commentContent || "",
        postId: entityId || "",
        userLanguage,
        userTheme,
      });

    case "SOCIAL_POST_MENTIONED":
      return SocialPostMentionedEmail({
        recipientName,
        actorName: actorName || "Someone",
        postContent: metadata?.postContent || "",
        postId: entityId || "",
        userLanguage,
        userTheme,
      });

    // Entity sharing
    case "ENTITY_SHARED_WITH_YOU":
      return EntitySharedWithYouEmail({
        recipientName,
        sharedByName: actorName || "Someone",
        entityType: (metadata?.entityType || "PROPERTY") as "PROPERTY" | "CONTACT" | "DOCUMENT",
        entityName: entityName || "",
        entityId: entityId || "",
        entityFriendlyId: metadata?.friendlyId,
        personalMessage: metadata?.shareMessage,
        userLanguage,
        userTheme,
      });

    case "ENTITY_SHARE_ACCEPTED":
      return EntityShareAcceptedEmail({
        recipientName,
        acceptedByName: actorName || "Someone",
        entityType: (metadata?.entityType || "PROPERTY") as "PROPERTY" | "CONTACT" | "DOCUMENT",
        entityName: entityName || "",
        entityId: entityId || "",
        entityFriendlyId: metadata?.friendlyId,
        userLanguage,
        userTheme,
      });

    // Connections
    case "CONNECTION_REQUEST":
      return ConnectionRequestEmail({
        recipientName,
        requesterName: actorName || "Someone",
        requesterTitle: metadata?.requesterTitle,
        connectionId: entityId || "",
        userLanguage,
        userTheme,
      });

    case "CONNECTION_ACCEPTED":
      return ConnectionAcceptedEmail({
        recipientName,
        acceptedByName: actorName || "Someone",
        acceptedByTitle: metadata?.acceptedByTitle,
        userLanguage,
        userTheme,
      });

    // Deals
    case "DEAL_PROPOSED":
      return DealProposedEmail({
        recipientName,
        proposerName: actorName || "Someone",
        dealId: entityId || "",
        dealTitle: metadata?.dealTitle,
        propertyName: metadata?.propertyName || "",
        clientName: metadata?.clientName || "",
        userLanguage,
        userTheme,
      });

    case "DEAL_UPDATED":
    case "DEAL_ACCEPTED":
    case "DEAL_COMPLETED":
      return DealStatusChangedEmail({
        recipientName,
        actorName: actorName || "Someone",
        dealId: entityId || "",
        dealTitle: metadata?.dealTitle,
        propertyName: metadata?.propertyName || "",
        clientName: metadata?.clientName,
        status: metadata?.status || "UPDATED",
        userLanguage,
        userTheme,
      });

    // Tasks
    case "TASK_ASSIGNED":
      return TaskAssignedEmail({
        recipientName,
        assignerName: actorName || "Someone",
        taskId: entityId || "",
        taskTitle: entityName || metadata?.taskTitle || "",
        taskDescription: metadata?.taskDescription,
        priority: metadata?.priority,
        dueDate: metadata?.dueDate,
        accountName: metadata?.accountName,
        userLanguage,
        userTheme,
      });

    case "TASK_DUE_SOON":
      return TaskDueSoonEmail({
        recipientName,
        taskId: entityId || "",
        taskTitle: entityName || metadata?.taskTitle || "",
        taskDescription: metadata?.taskDescription,
        priority: metadata?.priority,
        dueDate: metadata?.dueDate,
        timeUntilDue: metadata?.timeUntilDue || "soon",
        accountName: metadata?.accountName,
        userLanguage,
        userTheme,
      });

    // Calendar
    case "CALENDAR_EVENT_INVITED":
      return CalendarEventInvitedEmail({
        recipientName,
        inviterName: actorName || "Someone",
        eventId: entityId || "",
        eventTitle: entityName || metadata?.eventTitle || "",
        eventDescription: metadata?.eventDescription,
        startTime: metadata?.startTime || new Date(),
        endTime: metadata?.endTime || new Date(),
        location: metadata?.location,
        userLanguage,
        userTheme,
      });

    case "CALENDAR_EVENT_CREATED":
    case "CALENDAR_EVENT_UPDATED":
    case "CALENDAR_EVENT_CANCELLED":
      return CalendarEventUpdatedEmail({
        recipientName,
        actorName: actorName || "Someone",
        eventId: entityId || "",
        eventTitle: entityName || metadata?.eventTitle || "",
        eventDescription: metadata?.eventDescription,
        startTime: metadata?.startTime || new Date(),
        endTime: metadata?.endTime || new Date(),
        location: metadata?.location,
        action: category === "CALENDAR_EVENT_CREATED" ? "CREATED" :
                category === "CALENDAR_EVENT_CANCELLED" ? "CANCELLED" : "UPDATED",
        userLanguage,
        userTheme,
      });

    // CRM - Clients
    case "CLIENT_CREATED":
      return ClientCreatedEmail({
        recipientName,
        creatorName: actorName || "Someone",
        clientId: entityId || "",
        clientName: entityName || metadata?.clientName || "",
        isAssigned: false,
        userLanguage,
        userTheme,
      });

    case "CLIENT_ASSIGNED":
      return ClientCreatedEmail({
        recipientName,
        creatorName: actorName || "Someone",
        clientId: entityId || "",
        clientName: entityName || metadata?.clientName || "",
        isAssigned: true,
        userLanguage,
        userTheme,
      });

    case "CONTACT_CREATED":
      return ClientCreatedEmail({
        recipientName,
        creatorName: actorName || "Someone",
        clientId: entityId || "",
        clientName: entityName || metadata?.clientName || "",
        isAssigned: false,
        userLanguage,
        userTheme,
      });

    case "CONTACT_ASSIGNED":
      return ClientCreatedEmail({
        recipientName,
        creatorName: actorName || "Someone",
        clientId: entityId || "",
        clientName: entityName || metadata?.clientName || "",
        isAssigned: true,
        userLanguage,
        userTheme,
      });

    // CRM - Properties
    case "PROPERTY_CREATED":
      return PropertyCreatedEmail({
        recipientName,
        creatorName: actorName || "Someone",
        propertyId: entityId || "",
        propertyFriendlyId: metadata?.friendlyId,
        propertyName: entityName || metadata?.propertyName || "",
        propertyAddress: metadata?.propertyAddress,
        isAssigned: false,
        userLanguage,
        userTheme,
      });

    case "PROPERTY_ASSIGNED":
      return PropertyCreatedEmail({
        recipientName,
        creatorName: actorName || "Someone",
        propertyId: entityId || "",
        propertyFriendlyId: metadata?.friendlyId,
        propertyName: entityName || metadata?.propertyName || "",
        propertyAddress: metadata?.propertyAddress,
        isAssigned: true,
        userLanguage,
        userTheme,
      });

    // Account/Property updates (for watchers)
    case "ACCOUNT_UPDATED":
    case "ACCOUNT_DELETED":
      return AccountUpdatedEmail({
        recipientName,
        actorName: actorName || "Someone",
        accountId: entityId || "",
        accountName: entityName || metadata?.accountName || "",
        updateType: category === "ACCOUNT_DELETED" ? "DELETED" : "UPDATED",
        changes: metadata?.changes,
        userLanguage,
        userTheme,
      });

    case "PROPERTY_UPDATED":
    case "PROPERTY_DELETED":
      return PropertyUpdatedEmail({
        recipientName,
        actorName: actorName || "Someone",
        propertyId: entityId || "",
        propertyFriendlyId: metadata?.friendlyId,
        propertyName: entityName || metadata?.propertyName || "",
        propertyAddress: metadata?.propertyAddress,
        updateType: category === "PROPERTY_DELETED" ? "DELETED" : "UPDATED",
        changes: metadata?.changes,
        userLanguage,
        userTheme,
      });

    // Requests (Phase 6)
    case "REQUEST_CREATED":
      return RequestCreatedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    case "REQUEST_ASSIGNED":
      return RequestAssignedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    case "REQUEST_STATUS_CHANGED":
      return RequestStatusChangedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    // Showings (Phase 6)
    case "SHOWING_SCHEDULED":
      return ShowingScheduledEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    case "SHOWING_CONFIRMED":
      return ShowingStatusChangedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        status: "CONFIRMED",
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    case "SHOWING_CANCELLED":
      return ShowingStatusChangedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        status: "CANCELLED",
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    case "SHOWING_COMPLETED":
      return ShowingStatusChangedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        status: "COMPLETED",
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    case "SHOWING_NO_SHOW":
      return ShowingStatusChangedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        status: "NO_SHOW",
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    // Deal stage (Phase 6)
    case "DEAL_STAGE_CHANGED":
      return DealStageChangedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    // Comments (Phase 6)
    case "COMMENT_ADDED_PROPERTY":
      return CommentAddedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        entityType: "PROPERTY",
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    case "COMMENT_ADDED_CONTACT":
      return CommentAddedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        entityType: "CONTACT",
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    case "COMMENT_ADDED_REQUEST":
      return CommentAddedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        entityType: "REQUEST",
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    case "COMMENT_ADDED_DEAL":
      return CommentAddedEmail({
        recipientName,
        actorName: actorName || "Someone",
        entityId: entityId || "",
        entityName,
        entityType: "DEAL",
        metadata,
        userLanguage,
        userTheme,
        unsubscribeUrl: props.unsubscribeUrl,
      });

    // Bulk operations (Phase 6) — no email template, fall through to default
    case "BULK_ARCHIVE_COMPLETED":
      return null;

    // For other categories, return null (no email template available)
    default:
      return null;
  }
}

/**
 * Send notification emails to multiple users
 */
export async function sendNotificationEmailToUsers(
  userIds: string[],
  category: NotificationCategory,
  data: Omit<NotificationEmailData, "recipientName">,
  notificationId?: string | null
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    const success = await sendNotificationEmail(userId, category, data, notificationId);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

export { categoryToPreference, isEmailEnabledForCategory, getUserNotificationSettings };
