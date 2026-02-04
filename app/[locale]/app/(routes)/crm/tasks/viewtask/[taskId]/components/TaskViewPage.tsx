'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  User, 
  Building2, 
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { EditTaskForm } from '@/components/tasks/EditTaskForm';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAppToast } from "@/hooks/use-app-toast";
import { useTask } from '@/hooks/swr';

export function TaskViewPage({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { toast } = useAppToast();
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Use SWR for task fetching
  const { task, isLoading, isNotFound, mutate } = useTask(taskId);

  // Handle 404 redirect
  useEffect(() => {
    if (isNotFound) {
      toast.error("Task not found", { description: "The task you are looking for does not exist.", isTranslationKey: false });
      router.push('/crm/tasks');
    }
  }, [isNotFound, router, toast]);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'critical':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleTaskUpdated = () => {
    setIsEditOpen(false);
    mutate(); // Revalidate SWR cache
    toast.info("Task updated", { description: "The task has been updated successfully.", isTranslationKey: false });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Task not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dueDate = task.dueDateAt ? new Date(task.dueDateAt) : null;
  const createdDate = task.createdAt ? new Date(task.createdAt) : null;
  const updatedDate = task.updatedAt ? new Date(task.updatedAt) : null;
  const comments = task.comments ?? [];

  return (
    <>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Task Details</h1>
              <p className="text-muted-foreground">
                View and manage task information
              </p>
            </div>
          </div>
          <Button onClick={() => setIsEditOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Task
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-2xl flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  {task.title}
                </CardTitle>
                <Badge variant={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.content && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Description</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {task.content}
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                {dueDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Due Date:</span>
                    <span className="font-medium">
                      {format(dueDate, 'PPP p')}
                    </span>
                  </div>
                )}

                {task.assigned_user && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Assigned to:</span>
                    <span className="font-medium">
                      {task.assigned_user.name || task.assigned_user.email}
                    </span>
                  </div>
                )}

                {task.crm_accounts && (
                  <div className="flex items-center gap-2 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Account:</span>
                    <Button
                      variant="link"
                      className="h-auto p-0 font-medium"
                      onClick={() => router.push(`/app/crm/clients/${task.crm_accounts?.id}`)}
                    >
                      {task.crm_accounts.client_name}
                    </Button>
                  </div>
                )}

                {createdDate && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Created:</span>
                    <span className="font-medium">
                      {format(createdDate, 'PPP p')}
                    </span>
                  </div>
                )}

                {updatedDate && updatedDate.getTime() !== createdDate?.getTime() && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last updated:</span>
                    <span className="font-medium">
                      {format(updatedDate, 'PPP p')}
                    </span>
                  </div>
                )}
              </div>

              {task.calendarEvent && (
                <>
                  <Separator />
                  <div>
                    <h3 className="text-sm font-semibold mb-2">Linked Calendar Event</h3>
                    <div className="text-sm text-muted-foreground">
                      <p className="font-medium">{task.calendarEvent.title || 'Untitled Event'}</p>
                      <p>
                        {format(new Date(task.calendarEvent.startTime), 'PPP p')} - {' '}
                        {format(new Date(task.calendarEvent.endTime), 'p')}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comments</CardTitle>
            </CardHeader>
            <CardContent>
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No comments yet
                </p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.assigned_user?.name || comment.assigned_user?.email || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(comment.createdAt), 'PPP p')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {comment.comment}
                      </p>
                      <Separator />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="sm:max-w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Task</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <EditTaskForm 
              task={{
                ...task,
                user: task.assigned_user?.id || null,
                account: task.crm_accounts?.id || null,
              }} 
              onSuccess={handleTaskUpdated} 
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
