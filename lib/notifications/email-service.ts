// @ts-nocheck
// TODO: Fix type errors
/**
 * Email Notification Service
 * Handles sending email notifications based on user preferences
 */

import { prismadb } from "@/lib/prisma";
import resendHelper from "@/lib/resend";
import { NotificationCategory } from "@prisma/client";

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
  
  // System notifications
  SYSTEM: "system",
  WELCOME: "system",
  ACCOUNT_WARNING: "system",
  ACCOUNT_SUSPENSION: "system",
  ACCOUNT_UNSUSPENSION: "system",
  ACCOUNT_DELETION_NOTICE: "system",
  FEEDBACK_RESPONSE: "system",
};

/**
 * Get user's notification settings
 */
async function getUserNotificationSettings(userId: string) {
  const settings = await prismadb.userNotificationSettings.findUnique({
    where: { userId },
  });

  // Return defaults if no settings exist
  if (!settings) {
    return {
      socialEmailEnabled: true,
      crmEmailEnabled: true,
      calendarEmailEnabled: true,
      tasksEmailEnabled: true,
      dealsEmailEnabled: true,
      documentsEmailEnabled: true,
      systemEmailEnabled: true,
    };
  }

  return settings;
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
    },
  });
}

/**
 * Email data interface for notification emails
 */
export interface NotificationEmailData {
  recipientName: string;
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
  data: NotificationEmailData
): Promise<boolean> {
  try {
    // Check if email is enabled for this category
    const isEnabled = await isEmailEnabledForCategory(userId, category);
    if (!isEnabled) {
      return false;
    }

    // Get user data
    const user = await getUserForEmail(userId);
    if (!user || !user.email) {
      console.error("[EMAIL_SERVICE] User not found or has no email:", userId);
      return false;
    }

    const language = user.userLanguage || "en";
    const recipientName = user.name || user.email.split("@")[0];
    
    // Get Resend instance
    const resend = await resendHelper();
    
    // Generate subject line
    const subject = getSubjectLine(category, language, data);

    // Get the appropriate email template
    const emailComponent = getEmailComponent(category, {
      ...data,
      recipientName,
      userLanguage: language,
    });

    if (!emailComponent) {
      console.error("[EMAIL_SERVICE] No email template for category:", category);
      return false;
    }

    // Send email
    await resend.emails.send({
      from: process.env.EMAIL_FROM || "Oikion <mail@oikion.com>",
      to: user.email,
      subject,
      react: emailComponent,
    });

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
  props: NotificationEmailData & { recipientName: string; userLanguage: string }
): React.ReactElement | null {
  const { recipientName, userLanguage, actorName, entityId, entityName, metadata } = props;

  switch (category) {
    // Social notifications
    case "SOCIAL_POST_LIKED":
      return SocialPostLikedEmail({
        recipientName,
        actorName: actorName || "Someone",
        postContent: metadata?.postContent,
        postId: entityId || "",
        userLanguage,
      });

    case "SOCIAL_POST_COMMENTED":
      return SocialPostCommentedEmail({
        recipientName,
        actorName: actorName || "Someone",
        postContent: metadata?.postContent,
        commentContent: metadata?.commentContent || "",
        postId: entityId || "",
        userLanguage,
      });

    case "SOCIAL_POST_MENTIONED":
      return SocialPostMentionedEmail({
        recipientName,
        actorName: actorName || "Someone",
        postContent: metadata?.postContent || "",
        postId: entityId || "",
        userLanguage,
      });

    // Entity sharing
    case "ENTITY_SHARED_WITH_YOU":
      return EntitySharedWithYouEmail({
        recipientName,
        sharedByName: actorName || "Someone",
        entityType: (metadata?.entityType || "PROPERTY") as "PROPERTY" | "CLIENT" | "DOCUMENT",
        entityName: entityName || "",
        entityId: entityId || "",
        personalMessage: metadata?.shareMessage,
        userLanguage,
      });

    case "ENTITY_SHARE_ACCEPTED":
      return EntityShareAcceptedEmail({
        recipientName,
        acceptedByName: actorName || "Someone",
        entityType: (metadata?.entityType || "PROPERTY") as "PROPERTY" | "CLIENT" | "DOCUMENT",
        entityName: entityName || "",
        entityId: entityId || "",
        userLanguage,
      });

    // Connections
    case "CONNECTION_REQUEST":
      return ConnectionRequestEmail({
        recipientName,
        requesterName: actorName || "Someone",
        requesterTitle: metadata?.requesterTitle,
        connectionId: entityId || "",
        userLanguage,
      });

    case "CONNECTION_ACCEPTED":
      return ConnectionAcceptedEmail({
        recipientName,
        acceptedByName: actorName || "Someone",
        acceptedByTitle: metadata?.acceptedByTitle,
        userLanguage,
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
      });

    case "CLIENT_ASSIGNED":
      return ClientCreatedEmail({
        recipientName,
        creatorName: actorName || "Someone",
        clientId: entityId || "",
        clientName: entityName || metadata?.clientName || "",
        isAssigned: true,
        userLanguage,
      });

    // CRM - Properties
    case "PROPERTY_CREATED":
      return PropertyCreatedEmail({
        recipientName,
        creatorName: actorName || "Someone",
        propertyId: entityId || "",
        propertyName: entityName || metadata?.propertyName || "",
        propertyAddress: metadata?.propertyAddress,
        isAssigned: false,
        userLanguage,
      });

    case "PROPERTY_ASSIGNED":
      return PropertyCreatedEmail({
        recipientName,
        creatorName: actorName || "Someone",
        propertyId: entityId || "",
        propertyName: entityName || metadata?.propertyName || "",
        propertyAddress: metadata?.propertyAddress,
        isAssigned: true,
        userLanguage,
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
      });

    case "PROPERTY_UPDATED":
    case "PROPERTY_DELETED":
      return PropertyUpdatedEmail({
        recipientName,
        actorName: actorName || "Someone",
        propertyId: entityId || "",
        propertyName: entityName || metadata?.propertyName || "",
        propertyAddress: metadata?.propertyAddress,
        updateType: category === "PROPERTY_DELETED" ? "DELETED" : "UPDATED",
        changes: metadata?.changes,
        userLanguage,
      });

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
  data: Omit<NotificationEmailData, "recipientName">
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const userId of userIds) {
    const success = await sendNotificationEmail(userId, category, data);
    if (success) {
      sent++;
    } else {
      failed++;
    }
  }

  return { sent, failed };
}

export { categoryToPreference, isEmailEnabledForCategory, getUserNotificationSettings };
