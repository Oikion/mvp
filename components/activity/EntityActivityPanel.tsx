"use client";

import { QuickLogActivity } from "@/components/activity/QuickLogActivity";
import { ActivityFeed } from "@/components/activity/ActivityFeed";
import type { ActivityParentType } from "@/hooks/swr/useActivities";

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
  return (
    <div className="space-y-4">
      <QuickLogActivity
        parentType={parentType}
        parentId={parentId}
        onSuccess={onSuccess ?? (() => {})}
      />
      <ActivityFeed parentType={parentType} parentId={parentId} unified />
    </div>
  );
}
