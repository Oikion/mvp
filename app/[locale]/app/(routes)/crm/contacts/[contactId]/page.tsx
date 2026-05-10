import { notFound } from "next/navigation";
import { getContact } from "@/actions/contacts/get-contact";
import { getSharedContact } from "@/actions/contacts/get-shared-contact";
import ContactView from "./components/ContactView";
import { SharedAccessBanner } from "@/components/shared/SharedAccessBanner";

export const dynamic = "force-dynamic";

interface ContactDetailPageProps {
  params: Promise<{ contactId: string; locale: string }>;
}

const ContactDetailPage = async ({ params }: ContactDetailPageProps) => {
  const { contactId } = await params;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contact: any = await getContact(contactId);
  let isSharedView = false;
  let shareInfo: NonNullable<Awaited<ReturnType<typeof getSharedContact>>>["_shareInfo"] | null = null;

  if (!contact) {
    const shared = await getSharedContact(contactId);
    if (shared) {
      contact = shared;
      isSharedView = true;
      shareInfo = shared._shareInfo;
    }
  }

  if (!contact) {
    notFound();
  }

  return (
    <div className="space-y-4">
      {isSharedView && shareInfo && (
        <SharedAccessBanner shareInfo={shareInfo} entityType="contact" />
      )}
      <ContactView contact={contact} isReadOnly={isSharedView} sharePermission={shareInfo?.permissions ?? null} />
    </div>
  );
};

export default ContactDetailPage;
