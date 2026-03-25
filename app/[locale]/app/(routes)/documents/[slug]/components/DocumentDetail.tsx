"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Users, Edit } from "lucide-react";
import { useRouter, Link } from "@/navigation";
import { ShareSettings } from "../../components/ShareSettings";
import { ShareModal } from "@/components/social/ShareModal";
import { DocumentViewer } from "@/components/documents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LinkedEntitiesPanel } from "@/components/linking/LinkedEntitiesPanel";
import { LinkEntityDialog } from "@/components/linking/LinkEntityDialog";
import { useDocumentLinked } from "@/hooks/swr/useDocumentLinked";
import {
  useLinkClientsToDocument,
  useUnlinkClientFromDocument,
  useLinkPropertiesToDocument,
  useUnlinkPropertyFromDocument,
  useLinkMandatesToDocument,
  useUnlinkMandateFromDocument,
} from "@/hooks/swr/useLinkMutations";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { QuickAddClient } from "@/app/[locale]/app/(routes)/crm/components/QuickAddClient";
import { QuickAddProperty } from "@/app/[locale]/app/(routes)/mls/components/QuickAddProperty";
import { QuickAddMandate } from "@/app/[locale]/app/(routes)/mandates/components/QuickAddMandate";
import { useOrgUsers } from "@/hooks/swr/useOrgUsers";

interface DocumentData {
  id: string;
  document_name?: string | null;
  document_file_url?: string | null;
  document_file_mimeType?: string | null;
  description?: string | null;
  linkEnabled?: boolean | null;
  passwordProtected?: boolean | null;
  expiresAt?: Date | string | null;
  shareableLink?: string | null;
  createdAt?: Date | string | null;
  viewsCount?: number | null;
  lastViewedAt?: Date | string | null;
  created_by?: { name?: string | null; email?: string | null } | null;
  assigned_to_user?: { name?: string | null; email?: string | null } | null;
  views?: Array<{ id: string; viewedAt: Date | string; viewerUser?: { name?: string | null; email?: string | null } | null }> | null;
}

interface DocumentDetailProps {
  document: DocumentData;
  activeTab?: string;
}

export function DocumentDetail({ document, activeTab = "details" }: DocumentDetailProps) {
  const router = useRouter();
  const t = useTranslations("documents");
  const tCommon = useTranslations("common");
  const [linkEnabled, setLinkEnabled] = useState(document.linkEnabled || false);
  const [passwordProtected, setPasswordProtected] = useState(document.passwordProtected || false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(document.expiresAt ? new Date(document.expiresAt) : null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Link dialog states
  const [linkClientDialogOpen, setLinkClientDialogOpen] = useState(false);
  const [linkPropertyDialogOpen, setLinkPropertyDialogOpen] = useState(false);
  const [linkMandateDialogOpen, setLinkMandateDialogOpen] = useState(false);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createPropertyOpen, setCreatePropertyOpen] = useState(false);
  const [createMandateOpen, setCreateMandateOpen] = useState(false);
  const [autoLinkNewClient, setAutoLinkNewClient] = useState(false);
  const [autoLinkNewProperty, setAutoLinkNewProperty] = useState(false);
  const [autoLinkNewMandate, setAutoLinkNewMandate] = useState(false);

  const { users: orgUsers } = useOrgUsers();

  // Linked entities data
  const { clients, properties, mandates, isLoading: isLinkedLoading, mutate: mutateLinked } = useDocumentLinked(document.id);

  // Link mutation hooks
  const { linkClients } = useLinkClientsToDocument(document.id);
  const { unlinkClient } = useUnlinkClientFromDocument(document.id);
  const { linkProperties } = useLinkPropertiesToDocument(document.id);
  const { unlinkProperty } = useUnlinkPropertyFromDocument(document.id);
  const { linkMandates } = useLinkMandatesToDocument(document.id);
  const { unlinkMandate } = useUnlinkMandateFromDocument(document.id);

  const isEditable = document.document_file_mimeType === "text/html";

  const handleLinkClients = async (clientIds: string[]) => {
    await linkClients(clientIds);
    toast.success(tCommon("toast.createSuccess"));
    await mutateLinked();
  };

  const handleUnlinkClient = async (clientId: string) => {
    await unlinkClient(clientId);
    toast.success(tCommon("toast.deleteSuccess"));
    await mutateLinked();
  };

  const handleLinkProperties = async (propertyIds: string[]) => {
    await linkProperties(propertyIds);
    toast.success(tCommon("toast.createSuccess"));
    await mutateLinked();
  };

  const handleUnlinkProperty = async (propertyId: string) => {
    await unlinkProperty(propertyId);
    toast.success(tCommon("toast.deleteSuccess"));
    await mutateLinked();
  };

  const handleLinkMandates = async (mandateIds: string[]) => {
    await linkMandates(mandateIds);
    toast.success(tCommon("toast.createSuccess"));
    await mutateLinked();
  };

  const handleUnlinkMandate = async (mandateId: string) => {
    await unlinkMandate(mandateId);
    toast.success(tCommon("toast.deleteSuccess"));
    await mutateLinked();
  };

  const handleEnableShare = async () => {
    const response = await fetch(`/api/documents/${document.id}/share`, {
      method: "POST",
    });

    if (!response.ok) {
      toast.error("Failed to enable sharing");
      return;
    }

    await response.json();
    setLinkEnabled(true);
    toast.success("Sharing enabled");
  };

  const handleShareSettingsUpdate = async (updates: {
    linkEnabled?: boolean;
    passwordProtected?: boolean;
    password?: string;
    expiresAt?: Date | null;
  }) => {
    const response = await fetch(`/api/documents/${document.id}/share`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        linkEnabled: updates.linkEnabled ?? linkEnabled,
        passwordProtected: updates.passwordProtected ?? passwordProtected,
        password: updates.password,
        expiresAt: updates.expiresAt,
      }),
    });

    if (!response.ok) {
      toast.error("Failed to update share settings");
      return;
    }

    if (updates.linkEnabled !== undefined) setLinkEnabled(updates.linkEnabled);
    if (updates.passwordProtected !== undefined) setPasswordProtected(updates.passwordProtected);
    if (updates.expiresAt !== undefined) setExpiresAt(updates.expiresAt);

    toast.success("Share settings updated");
  };

  const handleDownload = () => {
    window.open(document.document_file_url ?? undefined, "_blank");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">{document.document_name}</h1>
          {document.createdAt && (
            <p className="text-muted-foreground mt-1">
              Created {format(new Date(document.createdAt), "MMM d, yyyy")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {isEditable && (
            <Button
              variant="outline"
              leftIcon={<Edit className="h-4 w-4" />}
              asChild
            >
              <Link href={`/app/documents/editor?id=${document.id}`}>
                {t("edit")}
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={handleDownload}
          >
            {t("download")}
          </Button>
        </div>
      </div>

      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="inline-grid grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="share">Share</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left column: Document info + preview */}
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Document Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {document.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-muted-foreground">{document.description}</p>
                    </div>
                  )}

                  {document.created_by && (
                    <div>
                      <h3 className="font-semibold mb-2">Created By</h3>
                      <p className="text-muted-foreground">
                        {document.created_by.name || document.created_by.email}
                      </p>
                    </div>
                  )}

                  {document.assigned_to_user && (
                    <div>
                      <h3 className="font-semibold mb-2">Assigned To</h3>
                      <p className="text-muted-foreground">
                        {document.assigned_to_user.name || document.assigned_to_user.email}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("documentPreview")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DocumentViewer
                    url={document.document_file_url ?? ""}
                    mimeType={document.document_file_mimeType ?? ""}
                    fileName={document.document_name ?? undefined}
                    height="600px"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right column: Linked entities */}
            <div className="space-y-4">
              <LinkedEntitiesPanel
                type="clients"
                entities={clients}
                isLoading={isLinkedLoading}
                onLinkEntity={() => setLinkClientDialogOpen(true)}
                onUnlinkEntity={handleUnlinkClient}
              />
              <LinkedEntitiesPanel
                type="properties"
                entities={properties}
                isLoading={isLinkedLoading}
                onLinkEntity={() => setLinkPropertyDialogOpen(true)}
                onUnlinkEntity={handleUnlinkProperty}
              />
              <LinkedEntitiesPanel
                type="mandates"
                entities={mandates}
                isLoading={isLinkedLoading}
                onLinkEntity={() => setLinkMandateDialogOpen(true)}
                onUnlinkEntity={handleUnlinkMandate}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="share" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle className="text-lg">Share with Connections</CardTitle>
                    <CardDescription>Send this document to agents in your network</CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  leftIcon={<Share2 className="h-4 w-4" />}
                  onClick={() => setShareModalOpen(true)}
                >
                  Share
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Public Link Settings</CardTitle>
              <CardDescription>Generate a shareable link for anyone</CardDescription>
            </CardHeader>
            <CardContent>
              <ShareSettings
                shareableLink={document.shareableLink ?? null}
                linkEnabled={linkEnabled}
                passwordProtected={passwordProtected}
                expiresAt={expiresAt}
                onLinkEnabledChange={(enabled) =>
                  handleShareSettingsUpdate({ linkEnabled: enabled })
                }
                onPasswordProtectedChange={(isProtected) =>
                  handleShareSettingsUpdate({ passwordProtected: isProtected })
                }
                onPasswordChange={(password) =>
                  handleShareSettingsUpdate({ password })
                }
                onExpiresAtChange={(date) =>
                  handleShareSettingsUpdate({ expiresAt: date })
                }
                onEnableShare={handleEnableShare}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>View Analytics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Total Views</h3>
                <p className="text-2xl font-bold">{document.viewsCount || 0}</p>
              </div>

              {document.lastViewedAt && (
                <div>
                  <h3 className="font-semibold mb-2">Last Viewed</h3>
                  <p className="text-muted-foreground">
                    {format(new Date(document.lastViewedAt), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              )}

              {document.views && document.views.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Recent Views</h3>
                  <div className="space-y-2">
                    {document.views.map((view) => (
                      <div
                        key={view.id}
                        className="flex items-center justify-between p-2 border rounded"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {view.viewerUser?.name || view.viewerUser?.email || "Anonymous"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(view.viewedAt), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Link Entity Dialogs */}
      <LinkEntityDialog
        open={linkClientDialogOpen}
        onOpenChange={setLinkClientDialogOpen}
        entityType="client"
        sourceId={document.id}
        sourceType="document"
        alreadyLinkedIds={clients.map((c) => c.id)}
        onLink={handleLinkClients}
        onCreate={() => {
          setLinkClientDialogOpen(false);
          setAutoLinkNewClient(false);
          setCreateClientOpen(true);
        }}
        onCreateAndLink={() => {
          setLinkClientDialogOpen(false);
          setAutoLinkNewClient(true);
          setCreateClientOpen(true);
        }}
      />
      <LinkEntityDialog
        open={linkPropertyDialogOpen}
        onOpenChange={setLinkPropertyDialogOpen}
        entityType="property"
        sourceId={document.id}
        sourceType="document"
        alreadyLinkedIds={properties.map((p) => p.id)}
        onLink={handleLinkProperties}
        onCreate={() => {
          setLinkPropertyDialogOpen(false);
          setAutoLinkNewProperty(false);
          setCreatePropertyOpen(true);
        }}
        onCreateAndLink={() => {
          setLinkPropertyDialogOpen(false);
          setAutoLinkNewProperty(true);
          setCreatePropertyOpen(true);
        }}
      />
      <LinkEntityDialog
        open={linkMandateDialogOpen}
        onOpenChange={setLinkMandateDialogOpen}
        entityType="mandate"
        sourceId={document.id}
        sourceType="document"
        alreadyLinkedIds={mandates.map((m) => m.id)}
        onLink={handleLinkMandates}
        onCreate={() => {
          setLinkMandateDialogOpen(false);
          setAutoLinkNewMandate(false);
          setCreateMandateOpen(true);
        }}
        onCreateAndLink={() => {
          setLinkMandateDialogOpen(false);
          setAutoLinkNewMandate(true);
          setCreateMandateOpen(true);
        }}
      />

      {/* Quick Add Client */}
      <QuickAddClient
        open={createClientOpen}
        onOpenChange={(open) => {
          setCreateClientOpen(open);
          if (!open) setAutoLinkNewClient(false);
        }}
        organizationUsers={orgUsers.map((u) => ({ id: u.id, name: u.name ?? "" }))}
        onSuccess={async (clientId) => {
          if (autoLinkNewClient && clientId) {
            await handleLinkClients([clientId]);
          }
        }}
      />

      {/* Quick Add Property */}
      <QuickAddProperty
        open={createPropertyOpen}
        onOpenChange={(open) => {
          setCreatePropertyOpen(open);
          if (!open) setAutoLinkNewProperty(false);
        }}
        users={orgUsers}
        onSuccess={async (propertyId) => {
          if (autoLinkNewProperty && propertyId) {
            await handleLinkProperties([propertyId]);
          }
        }}
      />

      {/* Quick Add Mandate */}
      <QuickAddMandate
        open={createMandateOpen}
        onOpenChange={(open) => {
          setCreateMandateOpen(open);
          if (!open) setAutoLinkNewMandate(false);
        }}
        organizationUsers={orgUsers.map((u) => ({ id: u.id, name: u.name ?? "" }))}
        onSuccess={async () => {
          if (autoLinkNewMandate) {
            await mutateLinked();
          }
        }}
      />

      {/* Share Modal */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        entityType="DOCUMENT"
        entityId={document.id}
        entityName={document.document_name ?? ""}
      />
    </div>
  );
}
