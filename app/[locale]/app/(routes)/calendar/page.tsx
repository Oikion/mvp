import { CalendarPageView } from "@/components/calendar/CalendarPageView";
import { Suspense } from "react";
import { getDictionary } from "@/dictionaries";
import Container from "../components/ui/Container";
import SuspenseLoading from "@/components/loadings/suspense";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <Container
      title={dict.calendar.page.title}
      description={dict.calendar.page.description}
    >
      <Suspense fallback={<SuspenseLoading />}>
        <CalendarPageView />
      </Suspense>
    </Container>
  );
}

