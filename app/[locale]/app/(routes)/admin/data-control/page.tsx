import { redirect } from "next/navigation";
import Container from "../../components/ui/Container";
import { isOrgAdmin } from "@/lib/org-admin";
import { OrgDataControlContent } from "./components/OrgDataControlContent";

export default async function AdminDataControlPage() {
  const isAdmin = await isOrgAdmin();

  if (!isAdmin) {
    redirect("/app/admin");
  }

  return (
    <Container
      title="Data Control"
      description="Manage organization data encryption, exports, and deletion"
    >
      <OrgDataControlContent />
    </Container>
  );
}
