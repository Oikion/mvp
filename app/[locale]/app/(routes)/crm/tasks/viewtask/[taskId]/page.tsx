import { TaskViewPage } from './components/TaskViewPage';
import { notFound } from 'next/navigation';

export default async function ViewTaskPage({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  if (!taskId) {
    notFound();
  }

  return <TaskViewPage taskId={taskId} />;
}


