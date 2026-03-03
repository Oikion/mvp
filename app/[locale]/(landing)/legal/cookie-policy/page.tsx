import { getTranslations } from "next-intl/server";

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });
  return {
    title: `${t("cookiePolicy.title")} | Oikion`,
    description: t("cookiePolicy.subtitle"),
  };
}

export default async function CookiePolicyPage({
  params,
}: Readonly<PageProps>) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  const inventoryRows = t.raw("cookiePolicy.inventory.rows") as Array<{
    name: string;
    purpose: string;
    stage: string;
    category: string;
  }>;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 font-gallery">
          {t("cookiePolicy.title")}
        </h1>
        <p className="text-lg text-muted-foreground">{t("cookiePolicy.subtitle")}</p>
        <p className="text-sm text-muted-foreground mt-4">
          {t("common.lastUpdated")}: {t("common.lastUpdatedDate")}
        </p>
      </div>

      <div className="prose prose-gray dark:prose-invert max-w-none">
        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t("cookiePolicy.whatAreCookies.title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("cookiePolicy.whatAreCookies.content")}
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t("cookiePolicy.howWeUse.title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("cookiePolicy.howWeUse.intro")}
          </p>

          <h3 className="text-xl font-semibold text-foreground mb-3">
            {t("cookiePolicy.howWeUse.essential.title")}
          </h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("cookiePolicy.howWeUse.essential.intro")}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            {(
              t.raw("cookiePolicy.howWeUse.essential.items") as string[]
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">
            {t("cookiePolicy.howWeUse.functional.title")}
          </h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("cookiePolicy.howWeUse.functional.intro")}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            {(
              t.raw("cookiePolicy.howWeUse.functional.items") as string[]
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">
            {t("cookiePolicy.howWeUse.analytics.title")}
          </h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("cookiePolicy.howWeUse.analytics.intro")}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            {(
              t.raw("cookiePolicy.howWeUse.analytics.items") as string[]
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">
            {t("cookiePolicy.howWeUse.marketing.title")}
          </h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("cookiePolicy.howWeUse.marketing.intro")}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            {(
              t.raw("cookiePolicy.howWeUse.marketing.items") as string[]
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t("cookiePolicy.inventory.title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("cookiePolicy.inventory.intro")}
          </p>
          <div className="overflow-x-auto border border-border rounded-lg">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 font-semibold text-foreground">
                    {t("cookiePolicy.inventory.tableHeaders.name")}
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    {t("cookiePolicy.inventory.tableHeaders.purpose")}
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    {t("cookiePolicy.inventory.tableHeaders.stage")}
                  </th>
                  <th className="px-4 py-3 font-semibold text-foreground">
                    {t("cookiePolicy.inventory.tableHeaders.category")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {inventoryRows.map((row) => (
                  <tr
                    key={`${row.name}-${row.purpose}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {row.name}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.purpose}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.stage}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t("cookiePolicy.thirdParty.title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("cookiePolicy.thirdParty.intro")}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            {(
              t.raw("cookiePolicy.thirdParty.items") as Array<{
                label: string;
                detail: string;
              }>
            ).map((item) => (
              <li key={item.label}>
                <strong className="text-foreground">{item.label}</strong> {item.detail}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t("cookiePolicy.managing.title")}
          </h2>

          <h3 className="text-xl font-semibold text-foreground mb-3">
            {t("cookiePolicy.managing.browserSettings.title")}
          </h3>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("cookiePolicy.managing.browserSettings.intro")}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-6">
            {(
              t.raw("cookiePolicy.managing.browserSettings.items") as string[]
            ).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <h3 className="text-xl font-semibold text-foreground mb-3">
            {t("cookiePolicy.managing.instructions.title")}
          </h3>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            {(
              t.raw("cookiePolicy.managing.instructions.items") as Array<{
                browser: string;
                path: string;
              }>
            ).map((item) => (
              <li key={item.browser}>
                <strong className="text-foreground">{item.browser}:</strong> {item.path}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t("cookiePolicy.impact.title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            {t("cookiePolicy.impact.intro")}
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-2">
            {(t.raw("cookiePolicy.impact.items") as string[]).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t("cookiePolicy.contact.title")}
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            {t("cookiePolicy.contact.intro")}
          </p>
          <p className="text-muted-foreground mt-4">
            <strong className="text-foreground">Email:</strong> {t("common.email")}
          </p>
        </section>
      </div>
    </div>
  );
}
