export function projectQuery(projectId: number | null | undefined): { params: { project_id: number } } | undefined {
  return projectId ? {params: {project_id: projectId}} : undefined;
}
