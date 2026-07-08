import { z } from "zod";

// Base schemas that reflect the database structure
export const CandidateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().nullable().optional(),
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

// Types inferred from schemas for frontend/backend usage
export type Candidate = z.infer<typeof CandidateSchema>;
export type Application = z.infer<typeof ApplicationSchema>;
export type ApplicationStatus = z.infer<typeof ApplicationStatusEnum>;

// Schemas for Creating new records (omit id, created_at, updated_at, deleted_at)
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

// Schemas for Updating records (all fields optional)
export const UpdateCandidateSchema = CreateCandidateSchema.partial();
export const UpdateApplicationSchema = CreateApplicationSchema.partial();

export type UpdateCandidateInput = z.infer<typeof UpdateCandidateSchema>;
export type UpdateApplicationInput = z.infer<typeof UpdateApplicationSchema>;
