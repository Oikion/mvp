'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EventCreateForm } from './EventCreateForm';
import { useTranslations } from 'next-intl';

interface CreateBookingButtonProps {
  readonly clientId?: string;
  readonly propertyId?: string;
  readonly eventType?: string;
  readonly prefilledData?: {
    name?: string;
    email?: string;
    notes?: string;
  };
}

export function CreateBookingButton({
  clientId,
  propertyId,
  eventType,
  prefilledData,
}: CreateBookingButtonProps) {
  const t = useTranslations("calendar");
  const [isOpen, setIsOpen] = useState(false);

  const handleEventCreated = () => {
    setIsOpen(false);
    globalThis.location.reload();
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="h-4 w-4 mr-2" />
        {t("createBookingButton.createEvent")}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t("createBookingButton.createCalendarEvent")}</DialogTitle>
            <DialogDescription>
              {clientId || propertyId
                ? t("createBookingButton.scheduleAppointment")
                : t("createBookingButton.createNewEvent")}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <EventCreateForm 
              clientId={clientId}
              propertyId={propertyId}
              onSuccess={handleEventCreated} 
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

