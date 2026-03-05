"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Home, Users, Clock, Search, Globe, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

import { ProfileHeader } from "./ProfileHeader";
import { ProfileEditTab } from "./tabs/ProfileEditTab";
import { ProfilePreviewTab } from "./tabs/ProfilePreviewTab";
import { ShowcaseTab } from "./tabs/ShowcaseTab";
import { ConnectionsTab } from "./tabs/ConnectionsTab";
import { PendingRequestsTab } from "./tabs/PendingRequestsTab";
import { FindAgentsTab } from "./tabs/FindAgentsTab";

interface ProfilePageProps {
  userData: any;
  profile: any;
  showcaseProperties: any[];
  availableProperties: any[];
  connections: any[];
  pendingReceived: any[];
  pendingSent: any[];
  dict: any;
  locale: string;
}

export function ProfilePage({
  userData,
  profile,
  showcaseProperties,
  availableProperties,
  connections,
  pendingReceived,
  pendingSent,
  dict,
  locale,
}: ProfilePageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeTab = searchParams.get("tab") || "profile";
  const [isEditing, setIsEditing] = useState(!profile);

  const hasUsername = !!userData.username;

  const handleTabChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", value);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const handleToggleEdit = useCallback(() => {
    setIsEditing((prev) => !prev);
  }, []);

  // Build profile data for preview
  const profileForPreview = profile
    ? {
        ...profile,
        slug: userData.username,
        user: {
          ...profile.user,
          name: userData.name,
          avatar: userData.avatar,
          username: userData.username,
          properties: showcaseProperties.map((sp: any) => sp.property),
          _count: {
            properties: showcaseProperties.length,
            followers: 0,
          },
        },
      }
    : null;

  const pendingCount = pendingReceived.length + pendingSent.length;

  const t = dict?.profile;
  const tConn = dict?.connections;

  return (
    <div className="space-y-6">
      {/* Profile Header - always visible */}
      <ProfileHeader
        userData={userData}
        profile={profile}
        connectionsCount={connections.length}
        isEditing={isEditing}
        onToggleEdit={handleToggleEdit}
        dict={dict}
      />

      {/* Only show tabs if user has a username */}
      {hasUsername && (
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="inline-grid grid-cols-5">
            <TabsTrigger value="profile">
              <User className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t?.tabs?.profile || "Profile"}</span>
            </TabsTrigger>
            <TabsTrigger value="showcase">
              <Home className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t?.tabs?.showcase || "Showcase"}</span>
            </TabsTrigger>
            <TabsTrigger value="connections">
              <Users className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tConn?.tabs?.connections || "Connections"}</span>
              {connections.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-sidebar-primary-foreground/20 text-xs">
                  {connections.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="requests">
              <Clock className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tConn?.tabs?.pending || "Requests"}</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-warning text-white text-xs">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="find">
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{tConn?.tabs?.findAgents || "Find Agents"}</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            {isEditing ? (
              <ProfileEditTab
                profile={profile}
                username={userData.username}
                userEmail={userData?.email || ""}
                showcaseProperties={showcaseProperties}
                availableProperties={availableProperties}
                onSave={() => setIsEditing(false)}
              />
            ) : profileForPreview ? (
              <ProfilePreviewTab profile={profileForPreview} dict={dict} />
            ) : (
              <div className="text-center py-12 border rounded-lg bg-muted/20">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="rounded-full w-16 h-16 bg-primary/10 flex items-center justify-center mx-auto">
                    <Globe className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">
                    {t?.preview?.createPublicProfile || "Create Your Public Profile"}
                  </h3>
                  <p className="text-muted-foreground">
                    {t?.preview?.createPublicProfileDesc ||
                      "Set up your public profile to showcase your properties and connect with other agents."}
                  </p>
                  <Button onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {dict?.common?.getStarted || "Get Started"}
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Showcase Tab */}
          <TabsContent value="showcase">
            <ShowcaseTab
              showcaseProperties={showcaseProperties}
              availableProperties={availableProperties}
            />
          </TabsContent>

          {/* Connections Tab */}
          <TabsContent value="connections">
            <ConnectionsTab
              connections={connections}
              translations={tConn}
              locale={locale}
            />
          </TabsContent>

          {/* Requests Tab (Pending + Sent) */}
          <TabsContent value="requests">
            <PendingRequestsTab
              pendingReceived={pendingReceived}
              pendingSent={pendingSent}
              translations={tConn}
              locale={locale}
            />
          </TabsContent>

          {/* Find Agents Tab */}
          <TabsContent value="find">
            <FindAgentsTab translations={tConn} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
