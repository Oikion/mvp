import { getNotifications } from "@/actions/notifications/get-notifications";
import { NotificationCenter } from "./components/NotificationCenter";
import { getDictionary } from "@/dictionaries";

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const dict = await getDictionary(locale);
  
  const notifications = await getNotifications({ limit: 100 });

  // Convert Date objects to ISO strings and handle nulls for client component
  const serializedNotifications = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt.toISOString(),
    entityType: n.entityType ?? undefined,
    entityId: n.entityId ?? undefined,
    metadata: (n.metadata && typeof n.metadata === "object" && !Array.isArray(n.metadata)) 
      ? n.metadata as Record<string, unknown> 
      : undefined,
  }));

  return <NotificationCenter initialNotifications={serializedNotifications} dict={dict} />;
}





