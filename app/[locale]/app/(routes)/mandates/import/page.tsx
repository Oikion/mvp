import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function LegacyImportRedirect({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/app/import/add`);
}
