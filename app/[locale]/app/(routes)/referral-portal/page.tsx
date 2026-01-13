import { getUser } from "@/actions/get-user";
import { prismadb } from "@/lib/prisma";
import Container from "../components/ui/Container";
import { ReferralPortalClient } from "./components/ReferralPortalClient";

export default async function ReferralPortalPage() {
  const user = await getUser();

  if (!user) {
    return <div>No user data.</div>;
  }

  // Check if user has a referral code
  const referralCode = await prismadb.referralCode.findUnique({
    where: { userId: user.id },
    select: { id: true, code: true },
  });

  return (
    <Container
      title="Referral Programme"
      description="Join our referral programme and start earning commissions"
    >
      <ReferralPortalClient
        userName={user.name || ""}
        userEmail={user.email}
        applicationStatus={user.referralApplicationStatus as "PENDING" | "APPROVED" | "DENIED" | null}
        hasReferralCode={!!referralCode}
      />
    </Container>
  );
}
