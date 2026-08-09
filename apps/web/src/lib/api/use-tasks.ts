'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ActivityDto,
  ApiListResponse,
  CommentDto,
  Priority,
  SubtaskDto,
  TaskDto,
  TaskStatus,
} from '@ablespace/shared';
import { api, ApiError } from './client';
import { queryKeys } from './queries';

/** Filters accepted by GET /tasks, mirroring the API's query DTO. */
export interface TaskFilters {
  search?: string;
  status?: TaskStatus[];
  priority?: Priority[];
  memberId?: string;
  labelId?: string;
  reporterId?: string;
  projectId?: string;
  dueFrom?: string;
  dueTo?: string;
  page?: number;
  limit?: number;
}

/** Body accepted by POST /tasks and PATCH /tasks/:id. */
export interface TaskInput {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: Priority;
  projectId?: string | null;
  memberIds?: string[];
  labelIds?: string[];
  teamIds?: string[];
  dueDate?: string | null;
}

export function useTasks(filters: TaskFilters = {}) {
  return useQuery<ApiListResponse<TaskDto>, ApiError>({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () =>
      api.list<TaskDto>('/tasks', {
        params: {
          ...filters,
          // The board shows every column at once, so it asks for a page large
          // enough to avoid a column appearing empty for want of pagination.
          limit: filters.limit ?? 100,
        },
      }),
    // Keeps the previous page on screen while the next loads, so the board
    // does not blank out on every keystroke of a search.
    placeholderData: (previous) => previous,
  });
}

export function useTask(taskId: string) {
  return useQuery<TaskDto, ApiError>({
    queryKey: queryKeys.tasks.detail(taskId),
    queryFn: () => api.get<TaskDto>(`/tasks/${taskId}`),
    enabled: Boolean(taskId),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation<TaskDto, ApiError, TaskInput>({
    mutationFn: (input) => api.post<TaskDto>('/tasks', input),
    onSuccess: () => {
      // Every list is now stale; the detail caches are untouched.
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation<TaskDto, ApiError, TaskInput>({
    mutationFn: (input) => api.patch<TaskDto>(`/tasks/${taskId}`, input),
    onSuccess: (task) => {
      // Seed the detail cache from the response rather than refetching it.
      queryClient.setQueryData(queryKeys.tasks.detail(taskId), task);
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      // A mutation may have produced activity, so the timeline is stale too.
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(taskId) });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}`),
    onSuccess: (_result, taskId) => {
      queryClient.removeQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

/* -------------------------------------------------------------------------
 * Subtasks
 * ---------------------------------------------------------------------- */

export function useSubtasks(taskId: string) {
  return useQuery<SubtaskDto[], ApiError>({
    queryKey: queryKeys.subtasks(taskId),
    queryFn: () => api.get<SubtaskDto[]>(`/tasks/${taskId}/subtasks`),
    enabled: Boolean(taskId),
  });
}

export interface SubtaskInput {
  title?: string;
  status?: TaskStatus;
  priority?: Priority;
  memberId?: string | null;
  dueDate?: string | null;
}

export function useCreateSubtask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation<SubtaskDto, ApiError, SubtaskInput>({
    mutationFn: (input) => api.post<SubtaskDto>(`/tasks/${taskId}/subtasks`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subtasks(taskId) });
      // subtaskCount is part of the task payload, so the detail is stale.
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(taskId) });
    },
  });
}

export function useUpdateSubtask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation<SubtaskDto, ApiError, { subtaskId: string; input: SubtaskInput }>({
    mutationFn: ({ subtaskId, input }) => api.patch<SubtaskDto>(`/subtasks/${subtaskId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subtasks(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(taskId) });
    },
  });
}

export function useDeleteSubtask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (subtaskId) => api.delete(`/subtasks/${subtaskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subtasks(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    },
  });
}

/* -------------------------------------------------------------------------
 * Comments
 * ---------------------------------------------------------------------- */

export function useComments(taskId: string) {
  return useQuery<ApiListResponse<CommentDto>, ApiError>({
    queryKey: queryKeys.comments(taskId),
    queryFn: () => api.list<CommentDto>(`/tasks/${taskId}/comments`, { params: { limit: 50 } }),
    enabled: Boolean(taskId),
  });
}

export function useCreateComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation<CommentDto, ApiError, string>({
    mutationFn: (body) => api.post<CommentDto>(`/tasks/${taskId}/comments`, { body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.activity(taskId) });
    },
  });
}

export function useDeleteComment(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (commentId) => api.delete(`/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.comments(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
    },
  });
}

/* -------------------------------------------------------------------------
 * Activity
 * ---------------------------------------------------------------------- */

export function useActivity(taskId: string) {
  return useQuery<ApiListResponse<ActivityDto>, ApiError>({
    queryKey: queryKeys.activity(taskId),
    queryFn: () => api.list<ActivityDto>(`/tasks/${taskId}/activity`, { params: { limit: 50 } }),
    enabled: Boolean(taskId),
  });
}
