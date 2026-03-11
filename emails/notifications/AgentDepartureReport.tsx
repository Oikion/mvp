import * as React from "react";
import {
  BaseLayout,
  EmailHeader,
  EmailText,
  EmailDetailsCard,
  EmailDetailRow,
  EmailCTAButton,
  BADGE_COLORS,
  baseUrl,
  commonTranslations,
  getTranslations,
  type SupportedLanguage,
} from "../components/BaseLayout";

interface AgentDepartureReportProps {
  ownerName: string;
  agentName: string;
  departureDate: string;
  policyApplied: "AGENCY" | "AGENT";
  entityCounts: {
    properties: number;
    clients: number;
    mandates: number;
    deals: number;
  };
  departureLogId: string;
  language?: string;
}

const translations = {
  en: {
    badge: "Agent Departure",
    title: "Agent Departure Report",
    subtitle: (agentName: string) =>
      `${agentName} has departed from your organization.`,
    body: "A departure report has been generated with details about the affected entities and the data ownership policy that was applied.",
    agent: "Agent",
    date: "Departure Date",
    policy: "Policy Applied",
    policyAgency: "Agency-Owned (data stays)",
    policyAgent: "Agent-Owned (data migrated)",
    entities: "Affected Entities",
    properties: "Properties",
    clients: "Clients",
    mandates: "Mandates",
    dealsCancelled: "Deals Cancelled",
    viewReport: "View Departure Report",
    altLink: "Or view at:",
    footer: "This is an automated notification from Oikion.",
  },
  el: {
    badge: "Αποχώρηση Συνεργάτη",
    title: "Αναφορά Αποχώρησης",
    subtitle: (agentName: string) =>
      `Ο/Η ${agentName} αποχώρησε από τον οργανισμό σας.`,
    body: "Δημιουργήθηκε αναφορά αποχώρησης με λεπτομέρειες για τις επηρεαζόμενες οντότητες και την πολιτική ιδιοκτησίας δεδομένων που εφαρμόστηκε.",
    agent: "Συνεργάτης",
    date: "Ημερομηνία Αποχώρησης",
    policy: "Εφαρμοσμένη Πολιτική",
    policyAgency: "Ιδιοκτησία Γραφείου (τα δεδομένα παραμένουν)",
    policyAgent: "Ιδιοκτησία Συνεργάτη (τα δεδομένα μεταφέρθηκαν)",
    entities: "Επηρεαζόμενες Οντότητες",
    properties: "Ακίνητα",
    clients: "Πελάτες",
    mandates: "Εντολές",
    dealsCancelled: "Ακυρωμένες Συμφωνίες",
    viewReport: "Προβολή Αναφοράς",
    altLink: "Ή δείτε στο:",
    footer: "Αυτή είναι μια αυτόματη ειδοποίηση από το Oikion.",
  },
  cz: {
    badge: "Odchod Agenta",
    title: "Zpráva o Odchodu",
    subtitle: (agentName: string) =>
      `${agentName} opustil(a) vaši organizaci.`,
    body: "Byla vytvořena zpráva o odchodu s podrobnostmi o dotčených entitách a uplatněné politice vlastnictví dat.",
    agent: "Agent",
    date: "Datum Odchodu",
    policy: "Uplatněná Politika",
    policyAgency: "Vlastnictví Agentury (data zůstávají)",
    policyAgent: "Vlastnictví Agenta (data přenesena)",
    entities: "Dotčené Entity",
    properties: "Nemovitosti",
    clients: "Klienti",
    mandates: "Mandáty",
    dealsCancelled: "Zrušené Obchody",
    viewReport: "Zobrazit Zprávu",
    altLink: "Nebo zobrazte na:",
    footer: "Toto je automatické oznámení z Oikion.",
  },
};

export default function AgentDepartureReport({
  ownerName,
  agentName,
  departureDate,
  policyApplied,
  entityCounts,
  departureLogId,
  language = "en",
}: AgentDepartureReportProps) {
  const t = getTranslations(translations, language);
  const common = getTranslations(commonTranslations, language);
  const reportUrl = `${baseUrl}/app/settings/departures/${departureLogId}`;

  return (
    <BaseLayout
      previewText={t.subtitle(agentName)}
      footerText={t.footer}
    >
      <EmailHeader
        badge={{
          icon: "👤",
          text: t.badge,
          colorClass: BADGE_COLORS.amber,
        }}
        title={t.title}
        subtitle={t.subtitle(agentName)}
      />

      <EmailText>
        {common.greeting(ownerName)} {t.body}
      </EmailText>

      <EmailDetailsCard title={t.entities}>
        <EmailDetailRow label={t.agent} value={agentName} />
        <EmailDetailRow label={t.date} value={departureDate} />
        <EmailDetailRow
          label={t.policy}
          value={policyApplied === "AGENT" ? t.policyAgent : t.policyAgency}
        />
        <EmailDetailRow label={t.properties} value={String(entityCounts.properties)} />
        <EmailDetailRow label={t.clients} value={String(entityCounts.clients)} />
        <EmailDetailRow label={t.mandates} value={String(entityCounts.mandates)} />
        <EmailDetailRow
          label={t.dealsCancelled}
          value={String(entityCounts.deals)}
          isLast
        />
      </EmailDetailsCard>

      <EmailCTAButton
        href={reportUrl}
        text={t.viewReport}
        altLinkText={t.altLink}
      />
    </BaseLayout>
  );
}
