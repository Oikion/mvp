import { CalendarView } from "@/components/calendar/CalendarView";
import { CreateBookingButton } from "@/components/calendar/CreateBookingButton";
import { Suspense } from "react";
import { getDictionary } from "@/dictionaries";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return (
    <div className="w-full px-2 sm:px-4 lg:px-6 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{dict.calendar.page.title}</h1>
          <p className="text-muted-foreground">
            {dict.calendar.page.description}
          </p>
        </div>
        <div className="flex gap-2">
          <CreateBookingButton />
        </div>
      </div>

      <Suspense fallback={<div>{dict.calendar.page.loadingCalendar}</div>}>
        <CalendarView />
      </Suspense>
    </div>
  );
}

