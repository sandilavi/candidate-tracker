import { describe, it, expect } from 'vitest';
import { CandidateSchema, ApplicationSchema } from './index';

describe('Shared Schemas', () => {
  describe('CandidateSchema', () => {
    it('valid input passes', () => {
      const validCandidate = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '123-456-7890',
        location: 'New York',
        linkedin_url: 'https://linkedin.com/in/johndoe',
        notes: 'Great candidate',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const result = CandidateSchema.safeParse(validCandidate);
      expect(result.success).toBe(true);
    });

    it('fails when name is missing', () => {
      const invalidCandidate = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'john@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const result = CandidateSchema.safeParse(invalidCandidate);
      expect(result.success).toBe(false);
    });

    it('fails on invalid email', () => {
      const invalidCandidate = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'John Doe',
        email: 'not-an-email',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const result = CandidateSchema.safeParse(invalidCandidate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid email format');
      }
    });
  });

  describe('ApplicationSchema', () => {
    it('valid input passes', () => {
      const validApp = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        candidate_id: '123e4567-e89b-12d3-a456-426614174000',
        job_title: 'Software Engineer',
        company: 'Acme Corp',
        status: 'applied',
        applied_at: new Date().toISOString(),
        salary_expectation: 120000,
        source: 'LinkedIn',
        notes: 'Good application',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const result = ApplicationSchema.safeParse(validApp);
      expect(result.success).toBe(true);
    });

    it('fails on invalid status enum', () => {
      const invalidApp = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        candidate_id: '123e4567-e89b-12d3-a456-426614174000',
        job_title: 'Software Engineer',
        company: 'Acme Corp',
        status: 'unknown-status',
        applied_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      const result = ApplicationSchema.safeParse(invalidApp);
      expect(result.success).toBe(false);
    });
  });
});
