import { getSharedWithMe } from "@/actions/social/sharing";
import Container from "../components/ui/Container";
import { SharedEntitiesList } from "./components/SharedEntitiesList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Users, FileText, Share2 } from "lucide-react";
import { getDictionary } from "@/dictionaries";

interface SharedWithMePageProps {
  params: Promise<{ locale: string }>;
}

export default async function SharedWithMePage({ params }: SharedWithMePageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const t = dict.sharedWithMe;

  const [allShared, propertiesShared, clientsShared, documentsShared] =
    await Promise.all([
      getSharedWithMe(),
      getSharedWithMe("PROPERTY"),
      getSharedWithMe("CLIENT"),
      getSharedWithMe("DOCUMENT"),
    ]);

  return (
    <Container
      title={t.title}
      description={t.description}
    >
      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="inline-grid grid-cols-4">
          <TabsTrigger value="all">
            <Share2 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t.tabs.all}</span>
            {allShared.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-sidebar-primary-foreground/20 text-xs">
                {allShared.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="properties">
            <Building2 className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t.tabs.properties}</span>
            {propertiesShared.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-sidebar-primary-foreground/20 text-xs">
                {propertiesShared.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="clients">
            <Users className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t.tabs.clients}</span>
            {clientsShared.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-sidebar-primary-foreground/20 text-xs">
                {clientsShared.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t.tabs.documents}</span>
            {documentsShared.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-sidebar-primary-foreground/20 text-xs">
                {documentsShared.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                {t.sections.all.title}
              </CardTitle>
              <CardDescription>
                {t.sections.all.description}
              </CardDescription>
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
              <CardDescription>
                {t.sections.properties.description}
              </CardDescription>
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
              <CardDescription>
                {t.sections.clients.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SharedEntitiesList entities={clientsShared} entityType="CLIENT" translations={t} />
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
              <CardDescription>
                {t.sections.documents.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SharedEntitiesList entities={documentsShared} entityType="DOCUMENT" translations={t} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
}



