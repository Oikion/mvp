import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import * as React from "react";

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
}: TaskAssignedEmailProps) => {
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
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview}</Preview>
      <Tailwind>
        <Body className="bg-zinc-50 my-auto mx-auto font-sans">
          <Container className="bg-white border border-zinc-200 rounded-xl my-10 mx-auto p-0 max-w-[520px] overflow-hidden">
            {/* Header */}
            <Section className="bg-zinc-900 px-8 py-10 text-center">
              <Text className="text-white text-2xl font-bold m-0 tracking-tight">
                Oikion
              </Text>
              <Text className="text-zinc-400 text-sm m-0 mt-1">
                Real Estate, Reimagined
              </Text>
            </Section>

            {/* Content */}
            <Section className="px-8 py-10">
              {/* Badge */}
              <Section className="mb-6 text-center">
                <span className="inline-block bg-purple-50 text-purple-700 text-xs font-semibold px-3 py-1 rounded-full border border-purple-200">
                  📋 {t.badge}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting & Intro */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(recipientName)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro(assignerName)}
              </Text>

              {/* Task Details Card */}
              <Section className="bg-zinc-50 border border-zinc-200 rounded-lg p-5 mb-6">
                <Text className="text-zinc-500 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
                  {t.taskDetails}
                </Text>

                {/* Task Title */}
                <Section className="mb-4">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.titleLabel}
                  </Text>
                  <Text className="text-zinc-900 text-base font-semibold m-0">
                    {taskTitle}
                  </Text>
                </Section>

                {/* Task Description */}
                {taskDescription && (
                  <Section className="mb-4">
                    <Text className="text-zinc-500 text-xs m-0 mb-1">
                      {t.descriptionLabel}
                    </Text>
                    <Text className="text-zinc-700 text-sm m-0 leading-relaxed">
                      {taskDescription.length > 200 
                        ? `${taskDescription.substring(0, 200)}...` 
                        : taskDescription}
                    </Text>
                  </Section>
                )}

                {/* Account */}
                {accountName && (
                  <Section className="mb-4">
                    <Text className="text-zinc-500 text-xs m-0 mb-1">
                      {t.accountLabel}
                    </Text>
                    <Text className="text-zinc-700 text-sm font-medium m-0">
                      {accountName}
                    </Text>
                  </Section>
                )}

                {/* Priority & Due Date */}
                <Section className="flex gap-4">
                  <Section className="flex-1">
                    <Text className="text-zinc-500 text-xs m-0 mb-1">
                      {t.priorityLabel}
                    </Text>
                    <span className={`inline-block ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} text-xs font-semibold px-2 py-1 rounded border`}>
                      {priorityLabel}
                    </span>
                  </Section>

                  <Section className="flex-1">
                    <Text className="text-zinc-500 text-xs m-0 mb-1">
                      {t.dueDateLabel}
                    </Text>
                    <Text className="text-zinc-700 text-sm font-medium m-0">
                      {formatDueDate(dueDate)}
                    </Text>
                  </Section>
                </Section>
              </Section>

              {/* CTA Button */}
              <Section className="text-center mb-6">
                <Button
                  className="bg-zinc-900 rounded-lg text-white py-3 px-8 text-sm font-semibold no-underline text-center inline-block"
                  href={taskUrl}
                >
                  {t.ctaButton}
                </Button>
              </Section>

              {/* Alternative Link */}
              <Text className="text-zinc-500 text-xs text-center m-0 mb-2">
                {t.altLink}
              </Text>
              <Text className="text-center m-0">
                <Link href={taskUrl} className="text-blue-600 text-xs underline break-all">
                  {taskUrl}
                </Link>
              </Text>
            </Section>

            {/* Footer */}
            <Section className="bg-zinc-50 border-t border-zinc-200 px-8 py-6">
              <Text className="text-zinc-400 text-xs text-center m-0 mb-2">
                {t.footer} {t.footerNote}
              </Text>
              <Text className="text-zinc-400 text-xs text-center m-0 mt-3">
                © {new Date().getFullYear()} Oikion. All rights reserved.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default TaskAssignedEmail;
