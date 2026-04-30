import useSWR from "swr";
import fetcher from "@/lib/fetcher";

interface UseRequestCommentsOptions {
  enabled?: boolean;
}

export function useRequestComments(
  requestId: string | null,
  options: UseRequestCommentsOptions = {}
) {
  const { enabled = true } = options;

  const { data, error, isLoading, mutate } = useSWR(
    enabled && requestId ? `/api/requests/${requestId}/comments` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    comments: Array.isArray(data) ? data : [],
    isLoading: !data && !error,
    error,
    refresh: () => mutate(),
  };
}

export function useAddRequestComment(requestId: string | null) {
  const { mutate } = useSWR(
    requestId ? `/api/requests/${requestId}/comments` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const addComment = async (content: string) => {
    if (!requestId) return;
    const res = await fetch(`/api/requests/${requestId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) throw new Error("Failed to post comment");
    const created = await res.json();
    await mutate((current: unknown[] | undefined) =>
      Array.isArray(current) ? [...current, created] : [created],
      false
    );
    return created;
  };

  return { addComment };
}

export function useDeleteRequestComment(requestId: string | null) {
  const { mutate } = useSWR(
    requestId ? `/api/requests/${requestId}/comments` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const deleteComment = async (commentId: string) => {
    if (!requestId) return;
    const res = await fetch(`/api/requests/${requestId}/comments/${commentId}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete comment");
    await mutate((current: unknown[] | undefined) =>
      Array.isArray(current)
        ? current.filter((c: { id: string }) => c.id !== commentId)
        : [],
      false
    );
  };

  return { deleteComment };
}
