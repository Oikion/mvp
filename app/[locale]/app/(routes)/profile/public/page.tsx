import { getUser } from "@/actions/get-user";
import { getMyAgentProfile } from "@/actions/social/profile";
import { getShowcaseProperties, getAvailablePropertiesForShowcase } from "@/actions/social/showcase";
import { getDictionary } from "@/dictionaries";

import Container from "../../components/ui/Container";
import { ProfilePublicClient } from "./components/ProfilePublicClient";

export default async function ProfilePublicPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  
  const [userData, profile, showcaseProperties, availableProperties] = await Promise.all([
    getUser(),
    getMyAgentProfile(),
    getShowcaseProperties(),
    getAvailablePropertiesForShowcase(),
  ]);

  if (!userData) {
    return <div>{dict.profile.publicProfile.noUserData}</div>;
  }

  return (
    <Container
      title={dict.profile.publicProfile.title}
      description={dict.profile.publicProfile.description}
    >
      <ProfilePublicClient
        userData={userData}
        profile={profile}
        showcaseProperties={showcaseProperties}
        availableProperties={availableProperties}
        dict={dict}
      />
    </Container>
  );
}
