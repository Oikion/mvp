import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prismadb } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/get-current-user";
import { getOrgMembersFromDb } from "@/lib/org-members";
import { Link } from "@/navigation";
import { redirect } from "next/navigation";
import TryAgain from "./components/TryAgain";
import { Users } from "@prisma/client";
import { getTranslations } from "next-intl/server";

type Props = {
  params: Promise<{ locale: string }>;
};

const PendingPage = async ({ params }: Props) => {
  await params;
  const t = await getTranslations("auth");
  const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Oikion";

  const { clerkUserIds } = await getOrgMembersFromDb();
  const adminUsers: Users[] = await prismadb.users.findMany({
    where: {
      clerkUserId: { in: clerkUserIds },
      is_admin: true,
      userStatus: "ACTIVE",
    },
  });

  const user = await getCurrentUser();

  if (user.userStatus !== "PENDING") {
    return redirect("/");
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("pending.title")}</CardTitle>
        <CardDescription>
          {t("pending.description", { appName })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {adminUsers.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              {t("pending.adminsHeading")}
            </h2>
            <ul className="space-y-2">
              {adminUsers.map((admin: Users) => (
                <li
                  key={admin.id}
                  className="flex flex-col gap-0.5 rounded-md border p-4"
                >
                  <span className="font-medium text-foreground">{admin.name}</span>
                  <Link
                    href={`mailto:${admin.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {admin.email}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild variant="outline">
            <Link href="/app/sign-in">{t("pending.signInOther")}</Link>
          </Button>
          <span className="text-sm text-muted-foreground">{t("pending.or")}</span>
          <TryAgain />
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingPage;
