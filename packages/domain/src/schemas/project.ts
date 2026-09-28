/**
 * Domain: Project
 * Pure types — no infrastructure deps. Validation via zod in `packages/validation`
 * or via Effect Schema if adopted later. Keep this file free of Hono/Drizzle/Better Auth.
 */

export type ProjectId = string & { readonly __brand: "ProjectId" };
export type ProjectStatus = "draft" | "published" | "archived";

export interface Project {
  readonly createdAt: Date;
  readonly description: string | null;
  readonly id: ProjectId;
  readonly name: string;
  readonly ownerId: string;
  readonly slug: string;
  readonly status: ProjectStatus;
  readonly updatedAt: Date;
}

export interface CreateProjectInput {
  readonly description?: string;
  readonly name: string;
}

export interface UpdateProjectInput {
  readonly description?: string;
  readonly name?: string;
  readonly status?: ProjectStatus;
}

export const isProjectStatus = (v: string): v is ProjectStatus =>
  v === "draft" || v === "published" || v === "archived";
