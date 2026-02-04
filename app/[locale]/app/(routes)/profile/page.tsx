import { getUser } from "@/actions/get-user";
import { getMyAgentProfile } from "@/actions/social/profile";

import Container from "../components/ui/Container";
import { ProfileSettingsTabs } from "./components/ProfileSettingsTabs";

const ProfilePage = async () => {
  const [data, agentProfile] = await Promise.all([
    getUser(),
    getMyAgentProfile(),
  ]);

  if (!data) {
    return <div>No user data.</div>;
  }

  return (
    <Container
      title="Settings"
      description="Manage your account settings and preferences"
    >
      <ProfileSettingsTabs user={data} agentProfile={agentProfile} />
    </Container>
  );
};

export default ProfilePage;
