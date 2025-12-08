import useSWR from "swr";

export interface Task {
  id: string;
  title: string;
  content: string | null;
  priority: string;
  dueDateAt: Date | string | null;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  assigned_user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  } | null;
  crm_accounts: {
    id: string;
    client_name: string;
    primary_email: string | null;
  } | null;
  calcomEvent: {
    id: string;
    title: string | null;
    startTime: Date | string;
    endTime: Date | string;
  } | null;
  comments: Array<{
    id: string;
    comment: string;
    createdAt: Date | string;
    assigned_user: {
      id: string;
      name: string | null;
      email: string;
      avatar: string | null;
    } | null;
  }>;
}

interface UseTaskOptions {
  /**
   * If false, the hook will not fetch data
   */
  enabled?: boolean;
}

/**
 * Custom fetcher for task API
 */
async function taskFetcher(url: string): Promise<Task> {
  const res = await fetch(url);

  if (res.status === 404) {
    const error = new Error("Task not found");
    (error as Error & { status: number }).status = 404;
    throw error;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch task: ${res.status}`);
  }

  return res.json();
}

/**
 * Get the SWR cache key for a task
 */
export function getTaskKey(taskId: string | undefined) {
  return taskId ? `/api/crm/tasks/${taskId}` : null;
}

/**
 * Hook to fetch a single task by ID
 */
export function useTask(taskId: string | undefined, options: UseTaskOptions = {}) {
  const { enabled = true } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<Task>(
    enabled && taskId ? getTaskKey(taskId) : null,
    taskFetcher,
    {
      revalidateOnFocus: true,
    }
  );

  return {
    task: data ?? null,
    isLoading,
    isValidating,
    error,
    isNotFound: error?.status === 404,
    mutate,
  };
}
