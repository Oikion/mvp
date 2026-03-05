import { getUser } from "@/actions/get-user";
import { getMyAgentProfile } from "@/actions/social/profile";
import { getShowcaseProperties, getAvailablePropertiesForShowcase } from "@/actions/social/showcase";
import {
  getAcceptedConnections,
  getPendingRequests,
  getSentRequests,
} from "@/actions/social/connections";
import { getDictionary } from "@/dictionaries";

import Container from "../../components/ui/Container";
import { ProfilePage } from "./components/ProfilePage";

export default async function NetworkProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  const [userData, profile, showcaseProperties, availableProperties, connections, pendingReceived, pendingSent] =
    await Promise.all([
      getUser(),
      getMyAgentProfile(),
      getShowcaseProperties(),
      getAvailablePropertiesForShowcase(),
      getAcceptedConnections(),
      getPendingRequests(),
      getSentRequests(),
    ]);

  if (!userData) {
    return <div>{dict.profile.publicProfile.noUserData}</div>;
  }

  return (
    <Container
      title={dict.profile.publicProfile.title}
      description={dict.profile.publicProfile.description}
    >
      <ProfilePage
        userData={userData}
        profile={profile}
        showcaseProperties={showcaseProperties}
        availableProperties={availableProperties}
        connections={connections}
        pendingReceived={pendingReceived}
        pendingSent={pendingSent}
        dict={dict}
        locale={locale}
      />
    </Container>
  );
}
