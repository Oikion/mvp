import { getUser } from "@/actions/get-user";
import { getMyAgentProfile } from "@/actions/social/profile";

import Container from "../components/ui/Container";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Shield } from "lucide-react";

import { ProfileTab } from "./components/ProfileTab";
import { NotificationsTab } from "./components/NotificationsTab";
import { PrivacySecurityTab } from "./components/PrivacySecurityTab";

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
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="privacy" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Privacy & Security</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab user={data} />
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>

        <TabsContent value="privacy">
          <PrivacySecurityTab user={data} agentProfile={agentProfile} />
        </TabsContent>
      </Tabs>
    </Container>
  );
};

export default ProfilePage;
