/**
 * Query keys.
 *
 * Centralised so invalidation is precise: mutating a task can invalidate
 * `tasks.all` without touching projects, and a task's own detail without
 * refetching every list. Scattering key arrays through components makes that
 * impossible to get right.
 */
export const queryKeys = {
  session: ['session'] as const,

  tasks: {
    all: ['tasks'] as const,
    list: (filters: Record<string, unknown>) => ['tasks', 'list', filters] as const,
    detail: (taskId: string) => ['tasks', 'detail', taskId] as const,
  },

  projects: {
    all: ['projects'] as const,
    list: (filters: Record<string, unknown>) => ['projects', 'list', filters] as const,
    detail: (projectId: string) => ['projects', 'detail', projectId] as const,
  },

  subtasks: (taskId: string) => ['subtasks', taskId] as const,
  comments: (taskId: string) => ['comments', taskId] as const,
  activity: (taskId: string) => ['activity', taskId] as const,

  labels: ['labels'] as const,
  members: ['workspace', 'members'] as const,
} as const;
