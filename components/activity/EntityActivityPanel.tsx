"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { QuickLogActivity } from "@/components/activity/QuickLogActivity";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { useActivities } from "@/hooks/swr/useActivities";
import type { ActivityParentType } from "@/hooks/swr/useActivities";
import { useMessagingCredentials } from "@/hooks/swr/useMessaging";
import { useAblyChannel } from "@/hooks/useAbly";

interface EntityActivityPanelProps {
  parentType: ActivityParentType;
  parentId: string;
  onSuccess?: () => void;
}

/**
 * Shared inner content for the Activity section in entity detail views.
 * Renders QuickLogActivity + unified ActivityFeed (activities + changelog merged).
 * Does NOT include a Card wrapper — compose inside the entity view's own Card or TabsContent.
 */
export function EntityActivityPanel({
  parentType,
  parentId,
  onSuccess,
}: EntityActivityPanelProps) {
  const { orgId } = useAuth();
  // Share the same SWR cache key that ActivityFeed uses so that calling
  // refresh() here revalidates the feed immediately after a new entry is logged.
  const { refresh } = useActivities({ parentType, parentId, unified: true });

  const handleSuccess = () => {
    refresh();
    onSuccess?.();
  };

  // Subscribe to org-level Ably channel and refresh when an activity is created
  // for this specific entity — enables real-time feed updates (e.g. after linking).
  const { credentials } = useMessagingCredentials();
  const orgChannel = orgId ? `org:${orgId}` : null;
  const { channel, isSubscribed } = useAblyChannel(orgChannel, credentials);

  useEffect(() => {
    if (!channel || !isSubscribed) return;

    const handleActivityCreated = (message: { data: unknown }) => {
      const data = message.data as { parentType?: string; parentId?: string };
      if (data?.parentId === parentId) {
        refresh();
      }
    };

    channel.subscribe("activity:created", handleActivityCreated);
    return () => {
      channel.unsubscribe("activity:created", handleActivityCreated);
    };
  }, [channel, isSubscribed, parentId, refresh]);

  return (
    <div className="space-y-4">
      <QuickLogActivity
        parentType={parentType}
        parentId={parentId}
        onSuccess={handleSuccess}
      />
      <ActivityFeed parentType={parentType} parentId={parentId} unified />
    </div>
  );
}
