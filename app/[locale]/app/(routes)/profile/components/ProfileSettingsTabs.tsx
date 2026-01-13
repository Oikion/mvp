"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Shield, Gift } from "lucide-react";
import { Users, AgentProfile } from "@prisma/client";

import { ProfileTab } from "./ProfileTab";
import { NotificationsTab } from "./NotificationsTab";
import { PrivacySecurityTab } from "./PrivacySecurityTab";
import { ReferralsTab } from "./ReferralsTab";

const VALID_TABS = ["profile", "notifications", "referrals", "privacy"] as const;
type TabValue = (typeof VALID_TABS)[number];

function getValidTab(tab: string | null): TabValue {
  return VALID_TABS.includes(tab as TabValue) ? (tab as TabValue) : "profile";
}

interface ProfileSettingsTabsProps {
  user: Users;
  agentProfile: AgentProfile | null;
}

export function ProfileSettingsTabs({ user, agentProfile }: ProfileSettingsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Use state to avoid hydration mismatch - initialize with default, then sync with URL
  const [currentTab, setCurrentTab] = useState<TabValue>("profile");
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Sync tab state with URL after hydration
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    setCurrentTab(getValidTab(tabParam));
    setIsHydrated(true);
  }, [searchParams]);

  const handleTabChange = useCallback((value: string) => {
    const newTab = getValidTab(value);
    setCurrentTab(newTab);
    
    // Create new URLSearchParams with the updated tab
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", newTab);
    
    // Update URL without causing a full page reload
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [router, pathname, searchParams]);

  // Show nothing until hydrated to prevent flash of wrong tab
  if (!isHydrated) {
    return (
      <div className="w-full">
        <div className="grid w-full grid-cols-4 mb-8 h-10 items-center justify-center rounded-md bg-muted p-1">
          {/* Skeleton tab list */}
        </div>
      </div>
    );
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid w-full grid-cols-4 mb-8">
        <TabsTrigger value="profile" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Profile</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Notifications</span>
        </TabsTrigger>
        <TabsTrigger value="referrals" className="flex items-center gap-2">
          <Gift className="h-4 w-4" />
          <span className="hidden sm:inline">Referrals</span>
        </TabsTrigger>
        <TabsTrigger value="privacy" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Privacy & Security</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileTab user={user} />
      </TabsContent>

      <TabsContent value="notifications">
        <NotificationsTab />
      </TabsContent>

      <TabsContent value="referrals">
        <ReferralsTab />
      </TabsContent>

      <TabsContent value="privacy">
        <PrivacySecurityTab user={user} agentProfile={agentProfile} />
      </TabsContent>
    </Tabs>
  );
}
