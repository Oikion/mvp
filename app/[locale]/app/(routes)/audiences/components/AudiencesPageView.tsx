"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus, Users, Building2 } from "lucide-react";
import { AudienceCard } from "./AudienceCard";
import { CreateAudienceDialog } from "./CreateAudienceDialog";
import type { AudienceWithMembers } from "@/actions/audiences";

interface AudiencesPageViewProps {
  allAudiences: AudienceWithMembers[];
  personalAudiences: AudienceWithMembers[];
  orgAudiences: AudienceWithMembers[];
  translations: any;
}

export function AudiencesPageView({
  allAudiences,
  personalAudiences,
  orgAudiences,
  translations: t,
}: AudiencesPageViewProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createType, setCreateType] = useState<"personal" | "org">("personal");
  const router = useRouter();

  const handleCreatePersonal = () => {
    setCreateType("personal");
    setCreateDialogOpen(true);
  };

  const handleCreateOrg = () => {
    setCreateType("org");
    setCreateDialogOpen(true);
  };

  const handleSuccess = () => {
    setCreateDialogOpen(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="inline-grid grid-cols-3">
            <TabsTrigger value="all">
              <Users className="h-4 w-4 shrink-0" />
              {t.tabs.all} ({allAudiences.length})
            </TabsTrigger>
            <TabsTrigger value="personal">
              <Users className="h-4 w-4 shrink-0" />
              {t.tabs.personal} ({personalAudiences.length})
            </TabsTrigger>
            <TabsTrigger value="org">
              <Building2 className="h-4 w-4 shrink-0" />
              {t.tabs.organization} ({orgAudiences.length})
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button onClick={handleCreatePersonal} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t.createPersonal}
            </Button>
            <Button onClick={handleCreateOrg} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t.createOrg}
            </Button>
          </div>
        </div>

        <TabsContent value="all" className="space-y-4">
          {allAudiences.length === 0 ? (
            <EmptyState
              title={t.emptyState.noAudiences}
              description={t.emptyState.noAudiencesDescription}
              onCreatePersonal={handleCreatePersonal}
              onCreateOrg={handleCreateOrg}
              translations={t}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {allAudiences.map((audience) => (
                <AudienceCard key={audience.id} audience={audience} translations={t} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="personal" className="space-y-4">
          {personalAudiences.length === 0 ? (
            <EmptyState
              title={t.emptyState.noPersonal}
              description={t.emptyState.noPersonalDescription}
              onCreatePersonal={handleCreatePersonal}
              translations={t}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {personalAudiences.map((audience) => (
                <AudienceCard key={audience.id} audience={audience} translations={t} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="org" className="space-y-4">
          {orgAudiences.length === 0 ? (
            <EmptyState
              title={t.emptyState.noOrg}
              description={t.emptyState.noOrgDescription}
              onCreateOrg={handleCreateOrg}
              translations={t}
            />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {orgAudiences.map((audience) => (
                <AudienceCard key={audience.id} audience={audience} translations={t} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CreateAudienceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        defaultType={createType}
        onSuccess={handleSuccess}
        translations={t}
      />
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  onCreatePersonal?: () => void;
  onCreateOrg?: () => void;
  translations: any;
}

function EmptyState({ title, description, onCreatePersonal, onCreateOrg, translations: t }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1 max-w-md">{description}</p>
      <div className="flex gap-2 mt-4">
        {onCreatePersonal && (
          <Button variant="outline" onClick={onCreatePersonal}>
            <Plus className="h-4 w-4 mr-2" />
            {t.createPersonal}
          </Button>
        )}
        {onCreateOrg && (
          <Button onClick={onCreateOrg}>
            <Plus className="h-4 w-4 mr-2" />
            {t.createOrg}
          </Button>
        )}
      </div>
    </div>
  );
}


