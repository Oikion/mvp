import { getSharedWithMe, getMyShares } from "@/actions/social/sharing";
import { getShowcaseProperties } from "@/actions/social/showcase";
import { getMyNetworkItems } from "@/actions/network/get-my-network-items";
import Container from "../../components/ui/Container";
import { SharedEntitiesList } from "../shared/components/SharedEntitiesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, FileText, Share2, Globe, Shield, Lock } from "lucide-react";
import { getDictionary } from "@/dictionaries";
import Link from "next/link";

interface SharingHubPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SharingHubPage({ params }: SharingHubPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const t = dict.sharedWithMe;

  const [allShared, propertiesShared, clientsShared, documentsShared, myShares, showcaseProps, networkItems] =
    await Promise.all([
      getSharedWithMe(),
      getSharedWithMe("PROPERTY"),
      getSharedWithMe("CONTACT"),
      getSharedWithMe("DOCUMENT"),
      getMyShares(),
      getShowcaseProperties(),
      getMyNetworkItems(),
    ]);

  const visibilityBadge = (visibility: string) => {
    if (visibility === "PUBLIC") {
      return (
        <Badge className="bg-success/15 text-success border-0 gap-1">
          <Globe className="h-3 w-3" />Public
        </Badge>
      );
    }
    if (visibility === "SECURE") {
      return (
        <Badge className="bg-primary/15 text-primary border-0 gap-1">
          <Shield className="h-3 w-3" />Secure
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Lock className="h-3 w-3" />Personal
      </Badge>
    );
  };

  return (
    <Container
      title={t.pageTitle}
      description={t.pageDescription}
    >
      <Tabs defaultValue="shared-with-me" className="space-y-6">
        <TabsList className="inline-grid grid-cols-2">
          <TabsTrigger value="shared-with-me">
            <Share2 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline ml-2">{t.topTabs.sharedWithMe}</span>
            {allShared.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-sidebar-primary-foreground/20 text-xs">
                {allShared.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-sharing">
            <Globe className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline ml-2">{t.topTabs.mySharing}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Shared with Me */}
        <TabsContent value="shared-with-me">
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList className="inline-grid grid-cols-4">
              <TabsTrigger value="all">
                <Share2 className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline ml-1">{t.tabs.all}</span>
                {allShared.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-sidebar-primary-foreground/20 text-xs">
                    {allShared.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="properties">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline ml-1">{t.tabs.properties}</span>
              </TabsTrigger>
              <TabsTrigger value="clients">
                <Users className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline ml-1">{t.tabs.clients}</span>
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline ml-1">{t.tabs.documents}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Share2 className="h-5 w-5 text-primary" />
                    {t.sections.all.title}
                  </CardTitle>
                  <CardDescription>{t.sections.all.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <SharedEntitiesList entities={allShared} translations={t} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="properties">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {t.sections.properties.title}
                  </CardTitle>
                  <CardDescription>{t.sections.properties.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <SharedEntitiesList entities={propertiesShared} entityType="PROPERTY" translations={t} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clients">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    {t.sections.clients.title}
                  </CardTitle>
                  <CardDescription>{t.sections.clients.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <SharedEntitiesList entities={clientsShared} entityType="CONTACT" translations={t} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documents">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    {t.sections.documents.title}
                  </CardTitle>
                  <CardDescription>{t.sections.documents.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <SharedEntitiesList entities={documentsShared} entityType="DOCUMENT" translations={t} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab 2: My Sharing */}
        <TabsContent value="my-sharing" className="space-y-6">

          {/* Section 1: Public Showcase */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-success" />
                On My Showcase
              </CardTitle>
              <CardDescription>
                PUBLIC properties displayed on your agent profile.{" "}
                <Link href="/app/network/profile" className="text-primary hover:underline">
                  Manage showcase →
                </Link>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {showcaseProps.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No properties in your showcase yet. Mark properties as PUBLIC to add them.
                </p>
              ) : (
                <div className="space-y-2">
                  {(showcaseProps as Array<{ id: string; propertyId: string; property: { property_name: string } | null }>).map((item) => (
                    <Link
                      key={item.id}
                      href={`/app/mls/properties/${item.propertyId}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {item.property?.property_name ?? "Property"}
                        </span>
                      </div>
                      {visibilityBadge("PUBLIC")}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 2: In Polis Network */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                In Polis Network
              </CardTitle>
              <CardDescription>
                SECURE and PUBLIC items visible to your network partners in the Polis matching system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {networkItems.properties.length === 0 && networkItems.requests.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No items shared with the Polis network. Set an item&apos;s visibility to Secure or Public to share it.
                </p>
              ) : (
                <div className="space-y-2">
                  {networkItems.properties.map((p) => (
                    <Link
                      key={p.id}
                      href={`/app/mls/properties/${p.friendlyId}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{p.property_name}</p>
                          {p.address_city && (
                            <p className="text-xs text-muted-foreground truncate">{p.address_city}</p>
                          )}
                        </div>
                      </div>
                      {visibilityBadge(p.visibility)}
                    </Link>
                  ))}
                  {networkItems.requests.map((m) => (
                    <Link
                      key={m.id}
                      href={`/app/requests/${m.friendlyId}`}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{m.name ?? "Request"}</p>
                          {m.requestType && (
                            <p className="text-xs text-muted-foreground truncate">{m.requestType}</p>
                          )}
                        </div>
                      </div>
                      {visibilityBadge(m.visibility)}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Shared with Connections */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                Shared with Connections
              </CardTitle>
              <CardDescription>
                Items you&apos;ve explicitly shared with specific connections.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {myShares.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  You haven&apos;t shared anything with connections yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {myShares.map((share) => (
                    <div
                      key={share.id}
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {share.entityType === "PROPERTY" ? (
                          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : share.entityType === "CONTACT" ? (
                          <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate capitalize">
                            {share.entityType.toLowerCase()} shared
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            with {share.sharedWith?.name ?? share.sharedWith?.email ?? "connection"}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {share.permissions === "VIEW_ONLY" ? "View" : "Comment"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
}
