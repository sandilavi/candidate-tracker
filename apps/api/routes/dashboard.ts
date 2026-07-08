import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

export default async function dashboardRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // GET /dashboard/stats - Returns aggregated metrics for the dashboard
  server.get(
    '/stats',
    {
      schema: {
        response: {
          200: z.object({
            totalCandidates: z.number(),
            totalApplications: z.number(),
            activeApplications: z.number(), // not rejected
            hiredCandidates: z.number(),
          }),
        },
      },
    },
    async () => {
      const totalCandidates = await prisma.candidate.count({
        where: { deleted_at: null },
      });

      const totalApplications = await prisma.application.count();

      const activeApplications = await prisma.application.count({
        where: {
          status: { not: 'rejected' },
        },
      });

      const hiredCandidates = await prisma.application.count({
        where: {
          status: 'hired',
        },
      });

      return {
        totalCandidates,
        totalApplications,
        activeApplications,
        hiredCandidates,
      };
    }
  );
}
