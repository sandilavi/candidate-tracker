import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { ApplicationSchema } from '@candidate-tracker/shared';

const prisma = new PrismaClient();

export default async function applicationRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // GET /applications - List applications with cross-entity search support
  server.get(
    '/',
    {
      schema: {
        querystring: z.object({
          search: z.string().optional(),
        }),
        response: {
          // Returning application alongside the candidate name for UI display
          200: z.array(ApplicationSchema.extend({
            candidate_name: z.string()
          })),
        },
      },
    },
    async (request, reply) => {
      const { search } = request.query;

      // Cross-entity search: search by candidate name OR application status
      const applications = await prisma.application.findMany({
        where: search
          ? {
              OR: [
                { status: { contains: search, mode: 'insensitive' } },
                {
                  candidate: {
                    name: { contains: search, mode: 'insensitive' },
                  },
                },
              ],
            }
          : undefined,
        include: {
          candidate: {
            select: { name: true },
          },
        },
        orderBy: { applied_at: 'desc' },
      });

      // Flatten the candidate name for easier UI rendering
      return applications.map((app) => ({
        ...app,
        candidate_name: app.candidate.name,
      })) as any;
    }
  );

  // GET /applications/:id - Get a single application
  server.get(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: ApplicationSchema,
          404: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const application = await prisma.application.findUnique({
        where: { id },
      });

      if (!application) {
        return reply.status(404).send({ error: 'Application not found' });
      }

      return application as any;
    }
  );

  // POST /applications - Create a new application
  server.post(
    '/',
    {
      schema: {
        body: ApplicationSchema.omit({ id: true, created_at: true, updated_at: true }),
        response: {
          201: ApplicationSchema,
          400: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const data = request.body;
      try {
        const newApplication = await prisma.application.create({
          data: data as any,
        });
        return reply.status(201).send(newApplication as any);
      } catch (error) {
        console.error("POST Application Error:", error);
        return reply.status(500).send({ error: 'Failed to create application. Please verify all fields.' } as any);
      }
    }
  );

  // PUT /applications/:id - Update an existing application (e.g. changing status)
  server.put(
    '/:id',
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: ApplicationSchema.omit({ id: true, created_at: true, updated_at: true }).partial(),
        response: {
          200: ApplicationSchema,
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const data = request.body;

      try {
        const updatedApplication = await prisma.application.update({
          where: { id },
          data: data as any,
        });
        return updatedApplication as any;
      } catch (error: any) {
        if (error.code === 'P2025') {
           return reply.status(404).send({ error: 'Application not found' } as any);
        }
        console.error("PUT Application Error:", error);
        return reply.status(500).send({ error: 'Failed to update application. Please verify all fields.' } as any);
      }
    }
  );

  // DELETE /applications/:id - Delete an application
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
        await prisma.application.delete({
          where: { id },
        });
        return { success: true };
      } catch (error) {
        return reply.status(404).send({ error: 'Application not found' });
      }
    }
  );
}
