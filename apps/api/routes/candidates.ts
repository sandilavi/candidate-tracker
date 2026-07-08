import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { CandidateSchema } from '@candidate-tracker/shared';

const prisma = new PrismaClient();

export default async function candidateRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // GET /candidates - List all candidates
  server.get(
    '/',
    {
      schema: {
        response: {
          200: z.array(CandidateSchema),
        },
      },
    },
    async (request, reply) => {
      const candidates = await prisma.candidate.findMany({
        where: { deleted_at: null },
        orderBy: { created_at: 'desc' },
      });
      return candidates as any;
    }
  );

  // GET /candidates/:id - Get a single candidate by ID
  server.get(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: CandidateSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const candidate = await prisma.candidate.findUnique({
        where: { id, deleted_at: null },
      });

      if (!candidate) {
        return reply.status(404).send({ error: 'Candidate not found' });
      }

      return candidate as any;
    }
  );

  // POST /candidates - Create a new candidate
  server.post(
    '/',
    {
      schema: {
        body: CandidateSchema.omit({ id: true, created_at: true, updated_at: true, deleted_at: true }),
        response: {
          201: CandidateSchema,
          400: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const data = request.body;
      try {
        const newCandidate = await prisma.candidate.create({
          data: data as any,
        });
        return reply.status(201).send(newCandidate as any);
      } catch (error: any) {
        if (error.code === 'P2002') {
          return reply.status(400).send({ error: 'A candidate with this email already exists' } as any);
        }
        return reply.status(500).send({ error: 'Internal server error' } as any);
      }
    }
  );

  // PUT /candidates/:id - Update an existing candidate
  server.put(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: CandidateSchema.omit({ id: true, created_at: true, updated_at: true, deleted_at: true }).partial(),
        response: {
          200: CandidateSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const data = request.body;

      try {
        const updatedCandidate = await prisma.candidate.update({
          where: { id },
          data: data as any,
        });
        return updatedCandidate as any;
      } catch (error) {
        return reply.status(404).send({ error: 'Candidate not found or update failed' });
      }
    }
  );

  // DELETE /candidates/:id - Soft delete a candidate
  server.delete(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ success: z.boolean() }),
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        await prisma.candidate.update({
          where: { id },
          data: { deleted_at: new Date() },
        });
        return { success: true };
      } catch (error) {
        return reply.status(404).send({ error: 'Candidate not found' });
      }
    }
  );
}
