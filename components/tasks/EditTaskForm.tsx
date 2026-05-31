'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAppToast } from "@/hooks/use-app-toast";
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import useSWR from 'swr';
import { z } from 'zod';
import fetcher from '@/lib/fetcher';
import { useTranslations } from 'next-intl';

interface Task {
  id: string;
  title: string;
  content: string | null;
  priority: string;
  dueDateAt: Date | string | null;
  user: string | null;
  account: string | null;
}

interface EditTaskFormProps {
  task: Task;
  onSuccess?: () => void;
}

type TFunc = ReturnType<typeof useTranslations<"crm">>;

const createFormSchema = (t: TFunc) =>
  z.object({
    title: z.string().min(3, t('tasks.form.validation.titleMin')).max(255),
    content: z.string().min(3, t('tasks.form.validation.descriptionMin')).max(500),
    priority: z.enum(['low', 'medium', 'high', 'critical']),
    dueDateAt: z.date().optional(),
    user: z.string().min(1, t('tasks.form.validation.selectUser')),
    account: z.string().optional(),
  });

type EditTaskFormValues = z.infer<ReturnType<typeof createFormSchema>>;

export function EditTaskForm({ task, onSuccess }: EditTaskFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useAppToast();
  const t = useTranslations("crm");
  const formSchema = createFormSchema(t);

  const { data: users, isLoading: isLoadingUsers } = useSWR<Array<{ id: string; name: string | null; email: string }>>(
    '/api/user',
    fetcher
  );

  const form = useForm<EditTaskFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: task.title,
      content: task.content || '',
      priority: task.priority as 'low' | 'medium' | 'high' | 'critical',
      dueDateAt: task.dueDateAt ? new Date(task.dueDateAt) : undefined,
      user: task.user || '',
      account: task.account || '',
    },
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  const onSubmit = async (data: EditTaskFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/crm/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          dueDateAt: data.dueDateAt?.toISOString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('tasks.form.toast.updateError'));
      }

      toast.info("success", { description: t("tasks.form.toast.updateSuccess") });

      onSuccess?.();
    } catch (error: any) {
      toast.error("error", { description: error.message || t('tasks.form.toast.updateError') });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingUsers) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("tasks.form.labels.taskTitle")}</FormLabel>
              <FormControl>
                <Input
                  disabled={isLoading}
                  placeholder={t("tasks.form.placeholders.taskTitle")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("tasks.form.labels.taskContent")}</FormLabel>
              <FormControl>
                <Textarea
                  disabled={isLoading}
                  placeholder={t("tasks.form.placeholders.taskDescription")}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dueDateAt"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("tasks.form.labels.dueDate")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                      disabled={isLoading}
                    >
                      {field.value ? (
                        format(field.value, 'PPP')
                      ) : (
                        <span>{t("tasks.form.placeholders.pickDate")}</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="user"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("tasks.form.labels.assignedToLong")}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.form.placeholders.selectAssignedUser")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="max-h-56 overflow-y-auto">
                  {users?.map((user: any) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("tasks.form.labels.priority")}</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={t("tasks.form.placeholders.selectPriority")} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="low">{t("tasks.priority.low")}</SelectItem>
                  <SelectItem value="medium">{t("tasks.priority.medium")}</SelectItem>
                  <SelectItem value="high">{t("tasks.priority.high")}</SelectItem>
                  <SelectItem value="critical">{t("tasks.priority.critical")}</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onSuccess?.()}
            disabled={isLoading}
          >
            {t("tasks.form.buttons.cancel")}
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("tasks.form.buttons.updateTask")}
          </Button>
        </div>
      </form>
    </Form>
  );
}


