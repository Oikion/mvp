import { notFound } from "next/navigation";
import { getEvent } from "@/actions/calendar/get-event";
import { getDictionary } from "@/dictionaries";
import Container from "../../../components/ui/Container";
import { EventDetailView } from "./components/EventDetailView";

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; locale: string }>;
  searchParams?: Promise<{ action?: string }>;
}) {
  const resolvedParams = await params;
  const { id, locale } = resolvedParams;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const dict = await getDictionary(locale);

  const event = await getEvent(id);

  if (!event) {
    notFound();
  }

  const defaultEditOpen = resolvedSearchParams?.action === "edit";

  return (
    <Container
      title={event.title || dict.calendar.eventPage.untitledEvent}
      description={dict.calendar.eventPage.eventDetails}
    >
      <div className="max-w-5xl">
        <EventDetailView event={event} defaultEditOpen={defaultEditOpen} />
      </div>
    </Container>
  );
}

