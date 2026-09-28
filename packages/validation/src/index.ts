import { z } from "zod";

export const createProjectSchema = z.object({
  description: z.string().max(1000).optional(),
  name: z.string().min(2).max(100),
});

export const updateProjectSchema = z.object({
  description: z.string().max(1000).optional(),
  name: z.string().min(2).max(100).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
});

export const projectIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
