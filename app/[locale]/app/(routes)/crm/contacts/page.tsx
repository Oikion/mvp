// @ts-nocheck
import React, { Suspense } from "react";

import ContactsPageView from "./components/ContactsPageView";
import Container from "../../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";
import { getContacts } from "@/actions/contacts/get-contacts";
import { getAllCrmData } from "@/actions/crm/get-crm-data";
import { getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

const ContactsPage = async () => {
  const t = await getTranslations("crm");

  const [contacts, crmData] = await Promise.all([
    getContacts(),
    getAllCrmData(),
  ]);

  return (
    <Container
      title={t("contacts.pageTitle")}
      description={t("contacts.pageDescription")}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <ContactsPageView
          contacts={contacts}
          crmData={crmData}
        />
      </Suspense>
    </Container>
  );
};

export default ContactsPage;
