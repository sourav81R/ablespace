import { ProjectDetail } from '@/components/projects/project-detail';

/**
 * A server component — the route parameter arrives as a prop, so the client
 * boundary starts at ProjectDetail.
 */
export default function ProjectDetailPage({ params }: { params: { projectId: string } }) {
  return <ProjectDetail projectId={params.projectId} />;
}
