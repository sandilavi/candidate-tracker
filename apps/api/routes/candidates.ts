import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { CandidateSchema, PaginationQuerySchema } from '@candidate-tracker/shared';

const prisma = new PrismaClient();

export default async function candidateRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // Retrieves a paginated list of candidates with optional search filters.
  server.get(
    '/',
    {
      schema: {
        querystring: PaginationQuerySchema,
        response: {
          200: z.object({
            data: z.array(CandidateSchema),
            meta: z.object({
              total: z.number(),
              page: z.number(),
              limit: z.number(),
              totalPages: z.number(),
            }),
          }),
        },
      },
    },
    async (request, reply) => {
      const { page, limit, search } = request.query;

      const whereClause = {
        deleted_at: null,
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
            { location: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search, mode: 'insensitive' as const } },
          ]
        } : {})
      };

      const [total, candidates] = await Promise.all([
        prisma.candidate.count({ where: whereClause }),
        prisma.candidate.findMany({
          where: whereClause,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { created_at: 'desc' },
        })
      ]);

      return {
        data: candidates,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    }
  );

  // Retrieves a single candidate by its unique identifier.
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

      return candidate;
    }
  );

  // Creates a new candidate record.
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
      const newCandidate = await prisma.candidate.create({
        data,
      });
      return reply.status(201).send(newCandidate);
    }
  );

  // Updates an existing candidate record.
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
          data,
        });
        return updatedCandidate;
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          throw Object.assign(new Error('Candidate not found'), { statusCode: 404 });
        }
        throw error;
      }
    }
  );

  // Soft deletes a candidate record by setting the deleted_at timestamp.
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
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          throw Object.assign(new Error('Candidate not found'), { statusCode: 404 });
        }
        throw error;
      }
    }
  );
}
