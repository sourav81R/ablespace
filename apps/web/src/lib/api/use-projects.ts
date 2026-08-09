'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiListResponse, LabelDto, Priority, ProjectDto, UserDto } from '@ablespace/shared';
import { api, ApiError } from './client';
import { queryKeys } from './queries';

export interface ProjectFilters {
  search?: string;
  priority?: Priority;
  page?: number;
  limit?: number;
}

export interface ProjectInput {
  name?: string;
  description?: string | null;
  priority?: Priority;
  leadId?: string | null;
  dueDate?: string | null;
}

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery<ApiListResponse<ProjectDto>, ApiError>({
    queryKey: queryKeys.projects.list(filters),
    queryFn: () => api.list<ProjectDto>('/projects', { params: { ...filters, limit: 50 } }),
    placeholderData: (previous) => previous,
  });
}

export function useProject(projectId: string) {
  return useQuery<ProjectDto, ApiError>({
    queryKey: queryKeys.projects.detail(projectId),
    queryFn: () => api.get<ProjectDto>(`/projects/${projectId}`),
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<ProjectDto, ApiError, ProjectInput>({
    mutationFn: (input) => api.post<ProjectDto>('/projects', input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.projects.all }),
  });
}

export function useUpdateProject(projectId: string) {
  const queryClient = useQueryClient();

  return useMutation<ProjectDto, ApiError, ProjectInput>({
    mutationFn: (input) => api.patch<ProjectDto>(`/projects/${projectId}`, input),
    onSuccess: (project) => {
      queryClient.setQueryData(queryKeys.projects.detail(projectId), project);
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      // A task card shows its project name, so renaming one restales the lists.
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: (projectId) => api.delete(`/projects/${projectId}`),
    onSuccess: (_result, projectId) => {
      queryClient.removeQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
      // Deleting a project detaches its tasks rather than removing them, so
      // every task list now shows a different project column.
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

/* -------------------------------------------------------------------------
 * Workspace reference data, used by pickers throughout the UI.
 * ---------------------------------------------------------------------- */

export function useLabels() {
  return useQuery<LabelDto[], ApiError>({
    queryKey: queryKeys.labels,
    queryFn: () => api.get<LabelDto[]>('/labels'),
    // Labels change rarely and are read by nearly every screen.
    staleTime: 5 * 60_000,
  });
}

export function useMembers() {
  return useQuery<UserDto[], ApiError>({
    queryKey: queryKeys.members,
    queryFn: () => api.get<UserDto[]>('/users'),
    staleTime: 5 * 60_000,
  });
}
