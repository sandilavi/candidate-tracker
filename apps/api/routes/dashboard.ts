import { FastifyInstance } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

export default async function dashboardRoutes(app: FastifyInstance) {
  const server = app.withTypeProvider<ZodTypeProvider>();

  // Fetch all the KPI metrics for the main dashboard view
  server.get(
    '/stats',
    {
      schema: {
        response: {
          200: z.object({
            totalCandidates: z.number(),
            totalApplications: z.number(),
            hiredThisMonth: z.number(),
            rejectionRate: z.number(),
            statusDistribution: z.array(z.object({
              name: z.string(),
              value: z.number()
            })).optional(),
            latestApplications: z.array(z.object({
              id: z.string(),
              candidate_name: z.string(),
              job_title: z.string(),
              company: z.string(),
              status: z.string(),
              applied_at: z.string()
            })).optional(),
          }),
        },
      },
    },
    async () => {
      const totalCandidates = await prisma.candidate.count({
        where: { deleted_at: null },
      });

      const totalApplications = await prisma.application.count();

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const hiredThisMonth = await prisma.application.count({
        where: {
          status: 'hired',
          updated_at: {
            gte: startOfMonth,
          },
        },
      });

      const rejectedApplications = await prisma.application.count({
        where: { status: 'rejected' },
      });
      
      const rejectionRate = totalApplications > 0 
        ? Math.round((rejectedApplications / totalApplications) * 100) 
        : 0;
      
      const groupByStatus = await prisma.application.groupBy({
        by: ['status'],
        _count: {
          id: true,
        },
      });
      
      const statusDistribution = groupByStatus.map(item => ({
        name: item.status,
        value: item._count.id
      }));

      const latestApplicationsRaw = await prisma.application.findMany({
        take: 5,
        orderBy: { applied_at: 'desc' },
        include: {
          candidate: { select: { name: true } },
        },
      });
      
      const latestApplications = latestApplicationsRaw.map(app => ({
        id: app.id,
        candidate_name: app.candidate.name,
        job_title: app.job_title,
        company: app.company,
        status: app.status,
        applied_at: app.applied_at.toISOString(),
      }));

      return {
        totalCandidates,
        totalApplications,
        hiredThisMonth,
        rejectionRate,
        statusDistribution,
        latestApplications,
      };
    }
  );
}
