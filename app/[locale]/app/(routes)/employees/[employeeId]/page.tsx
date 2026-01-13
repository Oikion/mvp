import Container from "../../components/ui/Container";
import { prismadb } from "@/lib/prisma";
import EmployeeView from "./components/EmployeeView";

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const user = await prismadb.users.findUnique({
    where: { id: employeeId },
  });
  if (!user) return null;

  const displayName = user.name || user.email || "User";

  return (
    <Container title={displayName} description={`User ID: ${user.id}`}>
      <div className="max-w-5xl">
        <EmployeeView data={user} />
      </div>
    </Container>
  );
}

