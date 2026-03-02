"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssignmentCard } from "./AssignmentCard";
import { EmptyState } from "@/components/ui/empty-state";
import type { PropertyInquiry } from "@prisma/client";

interface AssignmentsListProps {
  initialAssignments: PropertyInquiry[];
}

export function AssignmentsList({ initialAssignments }: AssignmentsListProps) {
  const t = useTranslations("assignments");
  const [assignments] = useState<PropertyInquiry[]>(initialAssignments);

  const filterByStatus = (status: string) => {
    if (status === "all") return assignments;
    return assignments.filter((a) => a.status === status);
  };

  const newAssignments = filterByStatus("NEW");
  const readAssignments = filterByStatus("READ");
  const contactedAssignments = filterByStatus("CONTACTED");
  const archivedAssignments = filterByStatus("ARCHIVED");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground mt-2">{t("description")}</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">
            {t("tabs.all")} ({assignments.length})
          </TabsTrigger>
          <TabsTrigger value="NEW">
            {t("tabs.new")} ({newAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="READ">
            {t("tabs.read")} ({readAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="CONTACTED">
            {t("tabs.contacted")} ({contactedAssignments.length})
          </TabsTrigger>
          <TabsTrigger value="ARCHIVED">
            {t("tabs.archived")} ({archivedAssignments.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {assignments.length === 0 ? (
            <EmptyState
              title={t("empty.title")}
              description={t("empty.description")}
              icon="inbox"
            />
          ) : (
            <div className="grid gap-4">
              {assignments.map((inquiry) => (
                <AssignmentCard key={inquiry.id} inquiry={inquiry} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="NEW" className="mt-6">
          {newAssignments.length === 0 ? (
            <EmptyState
              title={t("empty.noNew")}
              description={t("empty.noNewDesc")}
              icon="inbox"
            />
          ) : (
            <div className="grid gap-4">
              {newAssignments.map((inquiry) => (
                <AssignmentCard key={inquiry.id} inquiry={inquiry} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="READ" className="mt-6">
          {readAssignments.length === 0 ? (
            <EmptyState
              title={t("empty.noRead")}
              description={t("empty.noReadDesc")}
              icon="inbox"
            />
          ) : (
            <div className="grid gap-4">
              {readAssignments.map((inquiry) => (
                <AssignmentCard key={inquiry.id} inquiry={inquiry} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="CONTACTED" className="mt-6">
          {contactedAssignments.length === 0 ? (
            <EmptyState
              title={t("empty.noContacted")}
              description={t("empty.noContactedDesc")}
              icon="inbox"
            />
          ) : (
            <div className="grid gap-4">
              {contactedAssignments.map((inquiry) => (
                <AssignmentCard key={inquiry.id} inquiry={inquiry} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ARCHIVED" className="mt-6">
          {archivedAssignments.length === 0 ? (
            <EmptyState
              title={t("empty.noArchived")}
              description={t("empty.noArchivedDesc")}
              icon="inbox"
            />
          ) : (
            <div className="grid gap-4">
              {archivedAssignments.map((inquiry) => (
                <AssignmentCard key={inquiry.id} inquiry={inquiry} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
