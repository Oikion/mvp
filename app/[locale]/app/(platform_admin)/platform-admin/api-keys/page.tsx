import { ApiKeysClient } from "./components/ApiKeysClient";

export default async function ApiKeysPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="flex flex-col">
      <div className="flex-1 container mx-auto px-4 py-8">
        <ApiKeysClient />
      </div>
    </div>
  );
}
