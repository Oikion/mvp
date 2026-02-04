import { getDictionary } from "@/dictionaries";
import { MessagesPage } from "./components/MessagesPage";

export const metadata = {
  title: "Messages",
  description: "Team messaging and direct conversations",
};

export default async function Messages({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return <MessagesPage dict={dict} locale={locale} />;
}
