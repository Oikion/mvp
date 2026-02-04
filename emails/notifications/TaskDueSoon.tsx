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
}: TaskDueSoonEmailProps) => {
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
    <Html>
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{t.preview(timeUntilDue)}</Preview>
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
                <span className="inline-block bg-orange-50 text-orange-700 text-xs font-semibold px-3 py-1 rounded-full border border-orange-200">
                  ⏰ {t.badge}
                </span>
              </Section>

              <Heading className="text-zinc-900 text-2xl font-semibold text-center p-0 m-0 mb-3">
                {t.title}
              </Heading>

              <Text className="text-zinc-500 text-base text-center m-0 mb-6 leading-relaxed">
                {t.subtitle(timeUntilDue)}
              </Text>

              <Hr className="border-zinc-200 my-6" />

              {/* Greeting & Intro */}
              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-4">
                {t.greeting(recipientName)}
              </Text>

              <Text className="text-zinc-700 text-sm leading-6 m-0 mb-6">
                {t.intro(timeUntilDue)}
              </Text>

              {/* Task Details Card */}
              <Section className="bg-orange-50 border border-orange-200 rounded-lg p-5 mb-6">
                <Text className="text-orange-700 text-xs font-medium m-0 mb-4 uppercase tracking-wide">
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
                      {taskDescription.length > 150 
                        ? `${taskDescription.substring(0, 150)}...` 
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

                {/* Priority */}
                <Section className="mb-4">
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
                    {t.priorityLabel}
                  </Text>
                  <span className={`inline-block ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border} text-xs font-semibold px-2 py-1 rounded border`}>
                    {priorityLabel}
                  </span>
                </Section>

                {/* Due Date */}
                <Section>
                  <Text className="text-zinc-500 text-xs m-0 mb-1">
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

export default TaskDueSoonEmail;
