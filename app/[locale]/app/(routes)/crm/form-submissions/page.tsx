import { getFormSubmissions, getSubmissionCounts } from "@/actions/crm/form-submissions";
import { getUser } from "@/actions/get-user";
import { getDictionary } from "@/dictionaries";
import Container from "../../components/ui/Container";
import { FormSubmissionsPage } from "./components/FormSubmissionsPage";

export default async function FormSubmissionsRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const [userData, { submissions, total }, counts] = await Promise.all([
    getUser(),
    getFormSubmissions(),
    getSubmissionCounts(),
  ]);

  if (!userData) {
    return <div>Not authenticated</div>;
  }

  return (
    <Container
      title={dict?.crm?.formSubmissions?.title || "Contact Form Submissions"}
      description={dict?.crm?.formSubmissions?.description || "Manage messages from your profile contact form"}
    >
      <FormSubmissionsPage
        initialSubmissions={submissions}
        initialTotal={total}
        counts={counts}
        dict={dict}
        locale={locale}
      />
    </Container>
  );
}
