import { getTranslations } from "next-intl/server";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token";
import { UnsubscribeForm } from "./unsubscribe-form";

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string; token?: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "website" });
  return {
    title: `${t("unsubscribe.title")} | Oikion`,
    robots: "noindex, nofollow",
  };
}

export default async function UnsubscribePage({
  params,
  searchParams,
}: PageProps) {
  const { locale } = await params;
  const { email, token } = await searchParams;
  const t = await getTranslations({ locale, namespace: "website" });

  const isValid = !!(email && token && verifyUnsubscribeToken(email, token));

  return (
    <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-4 font-gallery">
          {t("unsubscribe.title")}
        </h1>

        {isValid ? (
          <UnsubscribeForm
            email={email!}
            token={token!}
            confirmLabel={t("unsubscribe.confirm")}
            cancelLabel={t("unsubscribe.cancel")}
            description={t("unsubscribe.description")}
            successTitle={t("unsubscribe.successTitle")}
            successMessage={t("unsubscribe.successMessage")}
            errorMessage={t("unsubscribe.errorMessage")}
          />
        ) : (
          <div className="mt-6">
            <p className="text-muted-foreground">
              {t("unsubscribe.invalidLink")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
