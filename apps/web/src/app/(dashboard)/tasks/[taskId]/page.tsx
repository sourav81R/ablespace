import { TaskDetail } from '@/components/tasks/detail/task-detail';

/**
 * A server component.
 *
 * The route parameter is available here without `useParams`, so the client
 * boundary starts at TaskDetail rather than at the page — nothing above it
 * needs to ship to the browser.
 */
export default function TaskDetailPage({ params }: { params: { taskId: string } }) {
  return <TaskDetail taskId={params.taskId} />;
}
