import { prismadb } from "@/lib/prisma";
import { Globe, Users, BarChart3, Clock, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default async function PlatformAdminNetworkPage() {
  const [networkSettings, partnerRows, matchStats] = await Promise.all([
    prismadb.orgNetworkSettings.findMany({
      orderBy: { updatedAt: "desc" },
    }),
    prismadb.orgNetworkPartner.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prismadb.crossOrgMatch.aggregate({
      _count: { id: true },
      _max: { computedAt: true },
    }),
  ]);

  // Load agency profiles for display names
  const orgIds = [
    ...new Set(networkSettings.map((s) => s.organizationId)),
  ];
  const profiles = await prismadb.agencyProfile.findMany({
    where: { organizationId: { in: orgIds } },
    select: { organizationId: true, name: true },
  });
  const profileMap = new Map(profiles.map((p) => [p.organizationId, p.name]));

  const memberOrgs = networkSettings.filter((s) => s.membership !== "NONE");
  const pendingPartners = partnerRows.filter((p) => p.status === "PENDING");
  const activePartners = partnerRows.filter((p) => p.status === "ACCEPTED");

  const membershipBadge = (m: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      POOL: "default",
      BILATERAL: "secondary",
      BOTH: "default",
    };
    return <Badge variant={variants[m] ?? "outline"}>{m}</Badge>;
  };

  const partnerStatusBadge = (s: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "secondary",
      ACCEPTED: "default",
      REJECTED: "destructive",
      REVOKED: "outline",
    };
    return <Badge variant={variants[s] ?? "outline"}>{s}</Badge>;
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Polis</h1>
            <p className="text-muted-foreground">Cross-agency matchmaking network overview</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Member Orgs</CardTitle>
              <Building2 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{memberOrgs.length}</div>
              <p className="text-xs text-muted-foreground">of {networkSettings.length} total</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Partners</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activePartners.length}</div>
              <p className="text-xs text-muted-foreground">{pendingPartners.length} pending</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cross-Org Matches</CardTitle>
              <BarChart3 className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{matchStats._count.id}</div>
              <p className="text-xs text-muted-foreground">stored match rows</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Last Computed</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-sm pt-1">
                {matchStats._max.computedAt
                  ? format(matchStats._max.computedAt, "dd/MM HH:mm")
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">cron runs every 30 min</p>
            </CardContent>
          </Card>
        </div>

        {/* Member Orgs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Network Members
            </CardTitle>
            <CardDescription>Organizations with active network membership</CardDescription>
          </CardHeader>
          <CardContent>
            {memberOrgs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No organizations have joined the network yet.</p>
            ) : (
              <div className="space-y-2">
                {memberOrgs.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium text-sm">
                        {profileMap.get(s.organizationId) ?? s.organizationId}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Properties: {s.shareProperties ? "shared" : "private"} ·
                        Mandates: {s.shareMandates ? "shared" : "private"} ·
                        Updated {format(s.updatedAt, "dd/MM/yyyy")}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {membershipBadge(s.membership)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bilateral Partners */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Bilateral Partner Requests
            </CardTitle>
            <CardDescription>Recent org-to-org partnership invitations (latest 50)</CardDescription>
          </CardHeader>
          <CardContent>
            {partnerRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bilateral partner requests yet.</p>
            ) : (
              <div className="space-y-2">
                {partnerRows.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="text-sm">
                      <span className="font-medium">{p.initiatorOrgId.slice(0, 8)}…</span>
                      <span className="text-muted-foreground"> → </span>
                      <span className="font-medium">{p.partnerOrgId.slice(0, 8)}…</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {format(p.createdAt, "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    {partnerStatusBadge(p.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
