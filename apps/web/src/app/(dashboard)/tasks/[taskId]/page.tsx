'use client';

import { useParams } from 'next/navigation';
import { TaskDetail } from '@/components/tasks/detail/task-detail';

export default function TaskDetailPage() {
  const params = useParams<{ taskId: string }>();

  return <TaskDetail taskId={params.taskId} />;
}
