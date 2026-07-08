import { z } from "zod";

// Base Zod schemas reflecting the core database entity structure.
export const CandidateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^\+?[0-9\s\-\(\)]*$/, "Invalid phone number format").nullable().optional(),
  location: z.string().nullable().optional(),
  linkedin_url: z.string().url("Invalid URL").nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
  deleted_at: z.coerce.date().nullable().optional(),
});

export const ApplicationStatusEnum = z.enum([
  "applied",
  "screening",
  "interview",
  "offer",
  "hired",
  "rejected",
]);

export const ApplicationSchema = z.object({
  id: z.string().uuid(),
  candidate_id: z.string().uuid(),
  job_title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company is required"),
  status: ApplicationStatusEnum,
  applied_at: z.coerce.date(),
  salary_expectation: z.number().nullable().optional(),
  source: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date(),
});

// TypeScript types inferred from the base Zod schemas.
export type Candidate = z.infer<typeof CandidateSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;

// Schemas for payload validation during record creation (excludes system fields).
export const CreateCandidateSchema = CandidateSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  deleted_at: true,
});

export const CreateApplicationSchema = ApplicationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export type CreateCandidateInput = z.infer<typeof CreateCandidateSchema>;
export type CreateApplicationInput = z.infer<typeof CreateApplicationSchema>;

// Schemas for payload validation during record updates (all fields made optional).
export const UpdateCandidateSchema = CreateCandidateSchema.partial();
export const UpdateApplicationSchema = CreateApplicationSchema.partial();

export type UpdateCandidateInput = z.infer<typeof UpdateCandidateSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;

// Schemas for query parameter validation and pagination.
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().optional(),
});

export const ApplicationQuerySchema = PaginationQuerySchema.extend({
  status: ApplicationStatusEnum.optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  candidate_id: z.string().uuid().optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
export type ApplicationQuery = z.infer<typeof ApplicationQuerySchema>;

// Standard envelope type for paginated API responses.
export type PaginatedResponse<T> = {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};
