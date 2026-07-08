import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PrismaClient, Prisma } from '@prisma/client';
import { z } from 'zod';
import { ApplicationSchema, ApplicationQuerySchema } from '@candidate-tracker/shared';

const prisma = new PrismaClient();

export default async function applicationRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // Fetch paginated applications (supports advanced cross-entity search)
  server.get(
    '/',
    {
      schema: {
        querystring: ApplicationQuerySchema,
        response: {
          // Include the candidate's name so the UI doesn't have to fetch it separately
          200: z.object({
            data: z.array(ApplicationSchema.extend({
              candidate_name: z.string()
            })),
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
      const { page, limit, search, status, date_from, date_to } = request.query;

      const AND: Prisma.ApplicationWhereInput[] = [{ candidate: { deleted_at: null } }];

      if (status) {
        AND.push({ status });
      }

      if (date_from || date_to) {
        const dateFilter: Prisma.DateTimeFilter = {};
        if (date_from) dateFilter.gte = new Date(date_from);
        if (date_to) dateFilter.lte = new Date(date_to);
        AND.push({ applied_at: dateFilter });
      }

      if (search) {
        AND.push({
          OR: [
            { job_title: { contains: search, mode: 'insensitive' } },
            { company: { contains: search, mode: 'insensitive' } },
            { source: { contains: search, mode: 'insensitive' } },
            { notes: { contains: search, mode: 'insensitive' } },
            { candidate: { name: { contains: search, mode: 'insensitive' } } },
            { candidate: { email: { contains: search, mode: 'insensitive' } } },
            { candidate: { location: { contains: search, mode: 'insensitive' } } },
          ],
        });
      }

      const whereClause = { AND };

      const [total, applications] = await Promise.all([
        prisma.application.count({ where: whereClause }),
        prisma.application.findMany({
          where: whereClause,
          skip: (page - 1) * limit,
          take: limit,
          include: {
            candidate: {
              select: { name: true },
            },
          },
          orderBy: { applied_at: 'desc' },
        })
      ]);

      return {
        data: applications.map((app) => ({
          ...app,
          status: app.status as 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected',
          candidate_name: app.candidate.name,
        })),
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      };
    }
  );

  // Fetch a single application by ID
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

      return {
        ...application,
        status: application.status as 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected',
      };
    }
  );

  // Create a new application
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
      const newApplication = await prisma.application.create({
        data,
      });
      return reply.status(201).send({
        ...newApplication,
        status: newApplication.status as 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected',
      });
    }
  );

  // Update application details (like changing the status to 'interview' or 'hired')
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
          data,
        });
        return {
          ...updatedApplication,
          status: updatedApplication.status as 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected',
        };
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          throw Object.assign(new Error('Application not found'), { statusCode: 404 });
        }
        throw error;
      }
    }
  );

  // Delete an application entirely
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
      } catch (error: unknown) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
          throw Object.assign(new Error('Application not found'), { statusCode: 404 });
        }
        throw error;
      }
    }
  );
}
