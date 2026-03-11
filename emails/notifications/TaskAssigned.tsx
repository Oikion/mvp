import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import { BaseLayout, EmailBadge, resolveColors } from "../components/BaseLayout";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

type Priority = "high" | "medium" | "low" | "normal";

interface TaskAssignedEmailProps {
  recipientName: string;
  assignerName: string;
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  priority?: Priority;
  dueDate?: Date | string;
  accountName?: string;
  userLanguage: string;
  userTheme?: string;
}

const priorityConfig: Record<Priority, { bg: string; text: string; border: string; label: Record<string, string> }> = {
  high: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: { en: "High", el: "Υψηλή", cz: "Vysoká" } },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: { en: "Medium", el: "Μεσαία", cz: "Střední" } },
  low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: { en: "Low", el: "Χαμηλή", cz: "Nízká" } },
  normal: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: { en: "Normal", el: "Κανονική", cz: "Normální" } },
};

const translations = {
  en: {
    preview: "New task assigned to you",
    badge: "Task Assigned",
    title: "You've Been Assigned a Task",
    subtitle: "A new task requires your attention",
    greeting: (name: string) => `Hello ${name},`,
    intro: (assigner: string) => `${assigner} has assigned a new task to you on Oikion.`,
    taskDetails: "Task Details",
    titleLabel: "Title",
    descriptionLabel: "Description",
    priorityLabel: "Priority",
    dueDateLabel: "Due Date",
    accountLabel: "Account",
    noDueDate: "No due date set",
    ctaButton: "View Task",
    altLink: "Or view at:",
    footer: "You're receiving this because a task was assigned to you.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: "Νέα εργασία που σας ανατέθηκε",
    badge: "Ανάθεση Εργασίας",
    title: "Σας Ανατέθηκε μια Εργασία",
    subtitle: "Μια νέα εργασία απαιτεί την προσοχή σας",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (assigner: string) => `Ο/Η ${assigner} σας ανέθεσε μια νέα εργασία στο Oikion.`,
    taskDetails: "Λεπτομέρειες Εργασίας",
    titleLabel: "Τίτλος",
    descriptionLabel: "Περιγραφή",
    priorityLabel: "Προτεραιότητα",
    dueDateLabel: "Προθεσμία",
    accountLabel: "Λογαριασμός",
    noDueDate: "Χωρίς προθεσμία",
    ctaButton: "Προβολή Εργασίας",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή σας ανατέθηκε μια εργασία.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: "Nový úkol vám byl přiřazen",
    badge: "Úkol Přiřazen",
    title: "Byl Vám Přiřazen Úkol",
    subtitle: "Nový úkol vyžaduje vaši pozornost",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (assigner: string) => `${assigner} vám přiřadil nový úkol na Oikionu.`,
    taskDetails: "Detaily Úkolu",
    titleLabel: "Název",
    descriptionLabel: "Popis",
    priorityLabel: "Priorita",
    dueDateLabel: "Termín",
    accountLabel: "Účet",
    noDueDate: "Bez termínu",
    ctaButton: "Zobrazit Úkol",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože vám byl přiřazen úkol.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const TaskAssignedEmail = ({
  recipientName,
  assignerName,
  taskId,
  taskTitle,
  taskDescription,
  priority = "normal",
  dueDate,
  accountName,
  userLanguage,
  userTheme,
}: TaskAssignedEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const taskUrl = `${baseUrl}/app/crm/tasks/viewtask/${taskId}`;
  const priorityStyle = priorityConfig[priority] || priorityConfig.normal;
  const priorityLabel = priorityStyle.label[userLanguage] || priorityStyle.label.en;

  const formatDueDate = (date: Date | string | undefined) => {
    if (!date) return t.noDueDate;
    const d = new Date(date);
    return d.toLocaleDateString(userLanguage === "el" ? "el-GR" : userLanguage === "cz" ? "cs-CZ" : "en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <BaseLayout
      previewText={t.preview}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="📋"
        text={t.badge}
        colorClass="bg-purple-50 text-purple-700 border-purple-200"
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {t.title}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {t.subtitle}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {t.greeting(recipientName)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {t.intro(assignerName)}
      </Text>

      {/* Task Details Card */}
      <Section
        style={{ backgroundColor: colors.cardBg, border: `1px solid ${colors.cardBorder}` }}
        className="rounded-lg p-5 mb-6"
      >
        <Text style={{ color: colors.textMuted }} className="text-xs font-medium m-0 mb-4 uppercase tracking-wide">
          {t.taskDetails}
        </Text>

        {/* Task Title */}
        <Section className="mb-4">
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.titleLabel}
          </Text>
          <Text style={{ color: colors.textPrimary }} className="text-base font-semibold m-0">
            {taskTitle}
          </Text>
        </Section>

        {/* Task Description */}
        {taskDescription && (
          <Section className="mb-4">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.descriptionLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm m-0 leading-relaxed">
              {taskDescription.length > 200
                ? `${taskDescription.substring(0, 200)}...`
                : taskDescription}
            </Text>
          </Section>
        )}

        {/* Account */}
        {accountName && (
          <Section className="mb-4">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.accountLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-medium m-0">
              {accountName}
            </Text>
          </Section>
        )}

        {/* Priority & Due Date */}
        <Section className="flex gap-4">
          <Section className="flex-1">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.priorityLabel}
            </Text>
            <span className={`inline-block ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} text-xs font-semibold px-2 py-1 rounded border`}>
              {priorityLabel}
            </span>
          </Section>

          <Section className="flex-1">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.dueDateLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-medium m-0">
              {formatDueDate(dueDate)}
            </Text>
          </Section>
        </Section>
      </Section>

      {/* CTA Button */}
      <Section className="text-center mb-6">
        <Button
          style={{ backgroundColor: colors.buttonBg, color: colors.buttonText }}
          className="rounded-lg py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
          href={taskUrl}
        >
          {t.ctaButton}
        </Button>
      </Section>

      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link href={taskUrl} style={{ color: colors.linkColor }} className="text-xs underline break-all">
          {taskUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default TaskAssignedEmail;
