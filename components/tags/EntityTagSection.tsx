"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Tag as TagIconLucide } from "lucide-react";
import { TagInput } from "./TagInput";
import { TagBadgeList } from "./TagBadge";
import { useTags, useEntityTags, useTagMutations, useEntityTagMutations } from "@/hooks/swr";
import type { EntityType, Tag } from "@/hooks/swr/useTags";

interface EntityTagSectionProps {
  entityId: string;
  entityType: EntityType;
  className?: string;
  readOnly?: boolean;
  compact?: boolean;
  showLabel?: boolean;
}

/**
 * EntityTagSection - Reusable component for displaying and managing tags on any entity
 * 
 * @example
 * <EntityTagSection entityId={propertyId} entityType="property" />
 */
export function EntityTagSection({
  entityId,
  entityType,
  className,
  readOnly = false,
  compact = false,
  showLabel = true,
}: EntityTagSectionProps) {
  const t = useTranslations("common.tags");
  
  // Fetch all available tags and entity's current tags
  const { tags: availableTags, isLoading: tagsLoading } = useTags();
  const { tags: entityTags, isLoading: entityTagsLoading, mutate: mutateEntityTags } = useEntityTags(
    entityType,
    entityId
  );
  const { createTag } = useTagMutations();
  const { updateEntityTags } = useEntityTagMutations(entityType, entityId);

  const isLoading = tagsLoading || entityTagsLoading;

  const handleTagsChange = useCallback(async (newTags: Tag[]) => {
    const success = await updateEntityTags(newTags.map(t => t.id));
    if (success) {
      mutateEntityTags();
    } else {
      toast.error(t("updateError"));
    }
  }, [updateEntityTags, mutateEntityTags, t]);

  const handleCreateTag = useCallback(async (name: string): Promise<Tag | null> => {
    const tag = await createTag({ name });
    if (tag) {
      toast.success(t("created"));
      return tag;
    }
    toast.error(t("createError"));
    return null;
  }, [createTag, t]);

  // Compact mode - just show badges
  if (compact) {
    if (entityTags.length === 0) {
      return null;
    }
    return (
      <TagBadgeList
        tags={entityTags}
        size="sm"
        className={className}
      />
    );
  }

  // Read-only mode - just show badges with label
  if (readOnly) {
    return (
      <div className={className}>
        {showLabel && (
          <div className="flex items-center gap-2 mb-2">
            <TagIconLucide className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">
              {t("title")}
            </span>
          </div>
        )}
        {entityTags.length > 0 ? (
          <TagBadgeList tags={entityTags} size="md" />
        ) : (
          <span className="text-sm text-muted-foreground">{t("noTags")}</span>
        )}
      </div>
    );
  }

  // Full edit mode
  return (
    <div className={className}>
      {showLabel && (
        <div className="flex items-center gap-2 mb-2">
          <TagIconLucide className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {t("title")}
          </span>
        </div>
      )}
      <TagInput
        entityId={entityId}
        entityType={entityType}
        availableTags={availableTags}
        selectedTags={entityTags}
        onTagsChange={handleTagsChange}
        onCreateTag={handleCreateTag}
        isLoading={isLoading}
        placeholder={t("addTags")}
      />
    </div>
  );
}
