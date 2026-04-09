import { notFound } from "next/navigation";
import { getContact } from "@/actions/contacts/get-contact";
import ContactView from "./components/ContactView";

export const dynamic = "force-dynamic";

interface ContactDetailPageProps {
  params: Promise<{ contactId: string; locale: string }>;
}

const ContactDetailPage = async ({ params }: ContactDetailPageProps) => {
  const { contactId } = await params;

  const contact = await getContact(contactId);

  if (!contact) {
    notFound();
  }

  return <ContactView contact={contact} />;
};

export default ContactDetailPage;
