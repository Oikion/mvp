"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Share2, Users, Edit } from "lucide-react";
import { useRouter, Link } from "@/navigation";
import { MentionDisplay } from "../../components/MentionDisplay";
import { ShareSettings } from "../../components/ShareSettings";
import { ShareModal } from "@/components/social/ShareModal";
import { DocumentViewer } from "@/components/documents";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

interface DocumentDetailProps {
  document: any;
  activeTab?: string;
}

export function DocumentDetail({ document, activeTab = "details" }: DocumentDetailProps) {
  const router = useRouter();
  const t = useTranslations("documents");
  const [linkEnabled, setLinkEnabled] = useState(document.linkEnabled || false);
  const [passwordProtected, setPasswordProtected] = useState(document.passwordProtected || false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(document.expiresAt ? new Date(document.expiresAt) : null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Check if document is editable (HTML content from editor)
  const isEditable = document.document_file_mimeType === "text/html";

  const handleEnableShare = async () => {
    const response = await fetch(`/api/documents/${document.id}/share`, {
      method: "POST",
    });

    if (!response.ok) {
      toast.error("Failed to enable sharing");
      return;
    }

    const data = await response.json();
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
      headers: {
        "Content-Type": "application/json",
      },
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
    window.open(document.document_file_url, "_blank");
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

              <div>
                <h3 className="font-semibold mb-2">Linked Entities</h3>
                <MentionDisplay
                  mentions={document.mentions}
                  onMentionClick={(type, id) => {
                    if (type === "client") {
                      router.push(`/app/crm/clients/${id}`);
                    } else if (type === "property") {
                      router.push(`/app/mls/properties/${id}`);
                    }
                    // Add navigation for events and tasks if needed
                  }}
                />
              </div>

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
                url={document.document_file_url}
                mimeType={document.document_file_mimeType}
                fileName={document.document_name}
                height="600px"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="share" className="space-y-4">
          {/* Share with Connections */}
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

          {/* Public Link Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Public Link Settings</CardTitle>
              <CardDescription>Generate a shareable link for anyone</CardDescription>
            </CardHeader>
            <CardContent>
              <ShareSettings
                shareableLink={document.shareableLink}
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
                    {document.views.map((view: any) => (
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

      {/* Share Modal */}
      <ShareModal
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
        entityType="DOCUMENT"
        entityId={document.id}
        entityName={document.document_name}
      />
    </div>
  );
}

