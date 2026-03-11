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

interface TaskDueSoonEmailProps {
  recipientName: string;
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  priority?: Priority;
  dueDate: Date | string;
  timeUntilDue: string; // e.g., "2 hours", "1 day"
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
    preview: (time: string) => `Task due in ${time}`,
    badge: "Due Soon",
    title: "Task Due Soon",
    subtitle: (time: string) => `This task is due in ${time}`,
    greeting: (name: string) => `Hello ${name},`,
    intro: (time: string) => `This is a reminder that you have a task due in ${time}.`,
    taskDetails: "Task Details",
    titleLabel: "Title",
    descriptionLabel: "Description",
    priorityLabel: "Priority",
    dueDateLabel: "Due Date",
    accountLabel: "Account",
    ctaButton: "View Task",
    altLink: "Or view at:",
    footer: "You're receiving this because you have a task due soon.",
    footerNote: "Manage your notification preferences in settings.",
  },
  el: {
    preview: (time: string) => `Εργασία που λήγει σε ${time}`,
    badge: "Λήγει Σύντομα",
    title: "Η Εργασία Λήγει Σύντομα",
    subtitle: (time: string) => `Αυτή η εργασία λήγει σε ${time}`,
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (time: string) => `Αυτή είναι μια υπενθύμιση ότι έχετε μια εργασία που λήγει σε ${time}.`,
    taskDetails: "Λεπτομέρειες Εργασίας",
    titleLabel: "Τίτλος",
    descriptionLabel: "Περιγραφή",
    priorityLabel: "Προτεραιότητα",
    dueDateLabel: "Προθεσμία",
    accountLabel: "Λογαριασμός",
    ctaButton: "Προβολή Εργασίας",
    altLink: "Ή δείτε στο:",
    footer: "Λαμβάνετε αυτό επειδή έχετε μια εργασία που λήγει σύντομα.",
    footerNote: "Διαχειριστείτε τις προτιμήσεις ειδοποιήσεων στις ρυθμίσεις.",
  },
  cz: {
    preview: (time: string) => `Úkol končí za ${time}`,
    badge: "Brzy Končí",
    title: "Úkol Brzy Končí",
    subtitle: (time: string) => `Tento úkol končí za ${time}`,
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (time: string) => `Toto je připomínka, že máte úkol, který končí za ${time}.`,
    taskDetails: "Detaily Úkolu",
    titleLabel: "Název",
    descriptionLabel: "Popis",
    priorityLabel: "Priorita",
    dueDateLabel: "Termín",
    accountLabel: "Účet",
    ctaButton: "Zobrazit Úkol",
    altLink: "Nebo zobrazte na:",
    footer: "Tento email dostáváte, protože máte úkol, který brzy končí.",
    footerNote: "Spravujte své preference oznámení v nastavení.",
  },
};

export const TaskDueSoonEmail = ({
  recipientName,
  taskId,
  taskTitle,
  taskDescription,
  priority = "normal",
  dueDate,
  timeUntilDue,
  accountName,
  userLanguage,
  userTheme,
}: TaskDueSoonEmailProps) => {
  const colors = resolveColors(userTheme);
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const taskUrl = `${baseUrl}/app/crm/tasks/viewtask/${taskId}`;
  const priorityStyle = priorityConfig[priority] || priorityConfig.normal;
  const priorityLabel = priorityStyle.label[userLanguage] || priorityStyle.label.en;

  const formatDueDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(userLanguage === "el" ? "el-GR" : userLanguage === "cz" ? "cs-CZ" : "en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <BaseLayout
      previewText={t.preview(timeUntilDue)}
      footerText={`${t.footer} ${t.footerNote}`}
      emailTheme={userTheme}
    >
      <EmailBadge
        icon="⏰"
        text={t.badge}
        colorClass="bg-orange-50 text-orange-700 border-orange-200"
      />

      <Heading
        style={{ color: colors.textPrimary }}
        className="text-2xl font-semibold text-center p-0 m-0 mb-3"
      >
        {t.title}
      </Heading>

      <Text style={{ color: colors.textSecondary }} className="text-base text-center m-0 mb-6 leading-relaxed">
        {t.subtitle(timeUntilDue)}
      </Text>

      <Hr style={{ borderColor: colors.hrColor }} className="my-6" />

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-4">
        {t.greeting(recipientName)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {t.intro(timeUntilDue)}
      </Text>

      {/* Task Details Card — orange is semantic urgency color, kept as Tailwind */}
      <Section className="bg-orange-50 border border-orange-200 rounded-lg p-5 mb-6">
        <Text className="text-orange-700 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
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
              {taskDescription.length > 150
                ? `${taskDescription.substring(0, 150)}...`
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

        {/* Priority */}
        <Section className="mb-4">
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.priorityLabel}
          </Text>
          <span className={`inline-block ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} text-xs font-semibold px-2 py-1 rounded border`}>
            {priorityLabel}
          </span>
        </Section>

        {/* Due Date */}
        <Section>
          <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
            {t.dueDateLabel}
          </Text>
          <Text className="text-orange-700 text-sm font-semibold m-0">
            {formatDueDate(dueDate)}
          </Text>
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

export default TaskDueSoonEmail;
