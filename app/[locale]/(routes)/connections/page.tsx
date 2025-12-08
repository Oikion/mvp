import {
  getAcceptedConnections,
  getPendingRequests,
  getSentRequests,
} from "@/actions/social/connections";
import Container from "../components/ui/Container";
import { ConnectionsList } from "./components/ConnectionsList";
import { PendingRequestsList } from "./components/PendingRequestsList";
import { SearchAgents } from "./components/SearchAgents";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Clock, Search } from "lucide-react";
import { getDictionary } from "@/dictionaries";

interface ConnectionsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function ConnectionsPage({ params }: ConnectionsPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const t = dict.connections;

  const [connections, pendingReceived, pendingSent] = await Promise.all([
    getAcceptedConnections(),
    getPendingRequests(),
    getSentRequests(),
  ]);

  const pendingCount = pendingReceived.length;

  return (
    <Container
      title={t.title}
      description={t.description}
    >
      <Tabs defaultValue="connections" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
          <TabsTrigger value="connections" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t.tabs.connections}</span>
            <span className="sm:hidden">{t.tabs.connectionsShort}</span>
            {connections.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs">
                {connections.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{t.tabs.pending}</span>
            <span className="sm:hidden">{t.tabs.pendingShort}</span>
            {pendingCount > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-orange-500 text-white text-xs">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="gap-2">
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t.tabs.sent}</span>
            <span className="sm:hidden">{t.tabs.sentShort}</span>
            {pendingSent.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs">
                {pendingSent.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="search" className="gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t.tabs.findAgents}</span>
            <span className="sm:hidden">{t.tabs.findAgentsShort}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                {t.yourConnections.title}
              </CardTitle>
              <CardDescription>
                {t.yourConnections.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectionsList connections={connections} translations={t} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                {t.pendingRequests.title}
              </CardTitle>
              <CardDescription>
                {t.pendingRequests.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingRequestsList requests={pendingReceived} translations={t} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                {t.sentRequests.title}
              </CardTitle>
              <CardDescription>
                {t.sentRequests.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectionsList
                connections={pendingSent.map((r) => ({
                  ...r,
                  status: "PENDING",
                  isIncoming: false,
                }))}
                showAsSent
                translations={t}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                {t.search.title}
              </CardTitle>
              <CardDescription>
                {t.search.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SearchAgents translations={t} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
}

