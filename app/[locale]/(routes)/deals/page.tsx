import { getMyDeals } from "@/actions/deals";
import Container from "../components/ui/Container";
import { DealsList } from "./components/DealsList";
import { CreateDealButton } from "./components/CreateDealButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Handshake, Clock, CheckCircle2, XCircle, PlayCircle } from "lucide-react";
import { getDictionary } from "@/dictionaries";

interface DealsPageProps {
  params: Promise<{ locale: string }>;
}

export default async function DealsPage({ params }: DealsPageProps) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  const t = dict.deals;

  const allDeals = await getMyDeals();

  const proposedDeals = allDeals.filter(
    (d) => d.status === "PROPOSED" || d.status === "NEGOTIATING"
  );
  const acceptedDeals = allDeals.filter((d) => d.status === "ACCEPTED");
  const inProgressDeals = allDeals.filter((d) => d.status === "IN_PROGRESS");
  const completedDeals = allDeals.filter((d) => d.status === "COMPLETED");
  const cancelledDeals = allDeals.filter((d) => d.status === "CANCELLED");

  const pendingCount = proposedDeals.filter((d) => !d.isProposer).length;

  return (
    <Container
      title={t.title}
      description={t.description}
    >
      <div className="flex justify-end mb-6">
        <CreateDealButton translations={t} />
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="pending" className="gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">{t.tabs.pending}</span>
            {proposedDeals.length > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  pendingCount > 0
                    ? "bg-orange-500 text-white"
                    : "bg-primary/10"
                }`}
              >
                {proposedDeals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t.tabs.accepted}</span>
            {acceptedDeals.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 text-xs">
                {acceptedDeals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <PlayCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t.tabs.active}</span>
            {inProgressDeals.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-xs">
                {inProgressDeals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-2">
            <Handshake className="h-4 w-4" />
            <span className="hidden sm:inline">{t.tabs.completed}</span>
            {completedDeals.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/10 text-xs">
                {completedDeals.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="cancelled" className="gap-2">
            <XCircle className="h-4 w-4" />
            <span className="hidden sm:inline">{t.tabs.cancelled}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                {t.sections.pending.title}
              </CardTitle>
              <CardDescription>
                {t.sections.pending.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DealsList deals={proposedDeals} translations={t} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accepted">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                {t.sections.accepted.title}
              </CardTitle>
              <CardDescription>
                {t.sections.accepted.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DealsList deals={acceptedDeals} translations={t} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-blue-600" />
                {t.sections.active.title}
              </CardTitle>
              <CardDescription>
                {t.sections.active.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DealsList deals={inProgressDeals} translations={t} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Handshake className="h-5 w-5 text-primary" />
                {t.sections.completed.title}
              </CardTitle>
              <CardDescription>
                {t.sections.completed.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DealsList deals={completedDeals} translations={t} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                {t.sections.cancelled.title}
              </CardTitle>
              <CardDescription>
                {t.sections.cancelled.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DealsList deals={cancelledDeals} translations={t} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </Container>
  );
}



