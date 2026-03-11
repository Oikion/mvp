import {
  Button,
  Heading,
  Hr,
  Link,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";
import {
  BaseLayout,
  EmailBadge,
  resolveColors,
} from "./components/BaseLayout";

interface NewTaskFromCRMEmailProps {
  taskFromUser: string;
  username: string;
  userLanguage: string;
  taskData: {
    id: string;
    title: string;
    content?: string | null;
    priority?: string | null;
    dueDateAt?: Date | string | null;
    [key: string]: any; // Allow additional properties from Prisma
  };
  userTheme?: string;
}

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://oikion.com";

// Priority colors and labels
const priorityConfig = {
  high: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: { en: "High", el: "Υψηλή" } },
  medium: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", label: { en: "Medium", el: "Μεσαία" } },
  low: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", label: { en: "Low", el: "Χαμηλή" } },
  normal: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: { en: "Normal", el: "Κανονική" } },
};

const translations = {
  en: {
    preview: "New task assigned to you",
    badge: "New Task",
    title: "You've Been Assigned a Task",
    subtitle: "From your CRM module",
    greeting: (name: string) => `Hello ${name},`,
    intro: (assigner: string) => `${assigner} has created a task and assigned it to you.`,
    taskDetails: "Task Details",
    titleLabel: "Title",
    descriptionLabel: "Description",
    priorityLabel: "Priority",
    dueDateLabel: "Due Date",
    noDueDate: "No due date set",
    ctaButton: "View Task",
    altLink: "Or view the task at:",
    footer: "You're receiving this because you were assigned a task.",
    footerNote: "If you didn't expect this, you can safely ignore it.",
  },
  el: {
    preview: "Νέα εργασία που σας ανατέθηκε",
    badge: "Νέα Εργασία",
    title: "Σας Ανατέθηκε μια Εργασία",
    subtitle: "Από το CRM module",
    greeting: (name: string) => `Γεια σας ${name},`,
    intro: (assigner: string) => `Ο/Η ${assigner} δημιούργησε μια εργασία και σας την ανέθεσε.`,
    taskDetails: "Λεπτομέρειες Εργασίας",
    titleLabel: "Τίτλος",
    descriptionLabel: "Περιγραφή",
    priorityLabel: "Προτεραιότητα",
    dueDateLabel: "Προθεσμία",
    noDueDate: "Χωρίς προθεσμία",
    ctaButton: "Προβολή Εργασίας",
    altLink: "Ή δείτε την εργασία στο:",
    footer: "Λαμβάνετε αυτό επειδή σας ανατέθηκε μια εργασία.",
    footerNote: "Αν δεν το περιμένατε, μπορείτε να το αγνοήσετε.",
  },
  cz: {
    preview: "Nový úkol vám byl přiřazen",
    badge: "Nový Úkol",
    title: "Byl Vám Přiřazen Úkol",
    subtitle: "Z modulu CRM",
    greeting: (name: string) => `Dobrý den ${name},`,
    intro: (assigner: string) => `${assigner} vytvořil úkol a přiřadil vám ho.`,
    taskDetails: "Detaily Úkolu",
    titleLabel: "Název",
    descriptionLabel: "Popis",
    priorityLabel: "Priorita",
    dueDateLabel: "Termín",
    noDueDate: "Bez termínu",
    ctaButton: "Zobrazit Úkol",
    altLink: "Nebo zobrazit úkol na:",
    footer: "Tento email dostáváte, protože vám byl přiřazen úkol.",
    footerNote: "Pokud jste to neočekávali, můžete ho ignorovat.",
  },
};

export const NewTaskFromCRMEmail = ({
  taskFromUser,
  username,
  userLanguage,
  taskData,
  userTheme,
}: NewTaskFromCRMEmailProps) => {
  const t = translations[userLanguage as keyof typeof translations] || translations.en;
  const taskUrl = `${baseUrl}/app/crm/tasks/viewtask/${taskData.id}`;
  const colors = resolveColors(userTheme);

  const priority = (taskData.priority?.toLowerCase() || "normal") as keyof typeof priorityConfig;
  const priorityStyle = priorityConfig[priority] || priorityConfig.normal;
  const priorityLabel = priorityStyle.label[userLanguage as "en" | "el"] || priorityStyle.label.en;

  // Format due date
  const formatDueDate = (date: Date | string | null | undefined) => {
    if (!date) return t.noDueDate;
    const d = new Date(date);
    return d.toLocaleDateString(userLanguage === "el" ? "el-GR" : "en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <BaseLayout
      previewText={t.preview}
      footerText={t.footer}
      footerNote={t.footerNote}
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
        {t.greeting(username)}
      </Text>

      <Text style={{ color: colors.textSecondary }} className="text-sm leading-6 m-0 mb-6">
        {t.intro(taskFromUser)}
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
            {taskData.title}
          </Text>
        </Section>

        {/* Task Description (if available) */}
        {taskData.content && (
          <Section className="mb-4">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.descriptionLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm m-0 leading-relaxed">
              {taskData.content.length > 200
                ? `${taskData.content.substring(0, 200)}...`
                : taskData.content}
            </Text>
          </Section>
        )}

        {/* Priority & Due Date Row */}
        <Section className="flex gap-4">
          {/* Priority */}
          <Section className="flex-1">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.priorityLabel}
            </Text>
            <span className={`inline-block ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} text-xs font-semibold px-2 py-1 rounded border`}>
              {priorityLabel}
            </span>
          </Section>

          {/* Due Date */}
          <Section className="flex-1">
            <Text style={{ color: colors.textMuted }} className="text-xs m-0 mb-1">
              {t.dueDateLabel}
            </Text>
            <Text style={{ color: colors.textSecondary }} className="text-sm font-medium m-0">
              {formatDueDate(taskData.dueDateAt)}
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

      {/* Alternative Link */}
      <Text style={{ color: colors.textMuted }} className="text-xs text-center m-0 mb-2">
        {t.altLink}
      </Text>
      <Text className="text-center m-0">
        <Link
          href={taskUrl}
          style={{ color: colors.linkColor }}
          className="text-xs underline break-all"
        >
          {taskUrl}
        </Link>
      </Text>
    </BaseLayout>
  );
};

export default NewTaskFromCRMEmail;
