"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { TagManager } from "@/components/tags";
import { useTags, useTagMutations, useTagCategories } from "@/hooks/swr";
import type { Tag } from "@/hooks/swr/useTags";

interface TagsAdminClientProps {
  initialTags: Tag[];
  initialCategories: string[];
}

export function TagsAdminClient({
  initialTags,
  initialCategories,
}: TagsAdminClientProps) {
  const t = useTranslations("common.tags");
  const { tags, isLoading, mutate } = useTags();
  const { categories } = useTagCategories();
  const { createTag, updateTag, deleteTag } = useTagMutations();

  // Use initial data if SWR hasn't loaded yet
  const displayTags = tags.length > 0 ? tags : initialTags;
  const displayCategories = categories.length > 0 ? categories : initialCategories;

  const handleCreateTag = useCallback(async (data: {
    name: string;
    color: string;
    category?: string;
    description?: string;
  }): Promise<boolean> => {
    const result = await createTag(data);
    if (result) {
      toast.success(t("created"));
      mutate();
      return true;
    } else {
      toast.error(t("createError"));
      return false;
    }
  }, [createTag, mutate, t]);

  const handleUpdateTag = useCallback(async (
    id: string,
    data: {
      name?: string;
      color?: string;
      category?: string | null;
      description?: string | null;
    }
  ): Promise<boolean> => {
    const result = await updateTag(id, data);
    if (result) {
      toast.success(t("updated"));
      mutate();
      return true;
    } else {
      toast.error(t("updateError"));
      return false;
    }
  }, [updateTag, mutate, t]);

  const handleDeleteTag = useCallback(async (id: string): Promise<boolean> => {
    const success = await deleteTag(id);
    if (success) {
      toast.success(t("deleted"));
      mutate();
      return true;
    } else {
      toast.error(t("deleteError"));
      return false;
    }
  }, [deleteTag, mutate, t]);

  return (
    <TagManager
      tags={displayTags}
      categories={displayCategories}
      onCreateTag={handleCreateTag}
      onUpdateTag={handleUpdateTag}
      onDeleteTag={handleDeleteTag}
      isLoading={isLoading && initialTags.length === 0}
    />
  );
}
