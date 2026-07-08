import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const server = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

// Add schema validation and serialization compilers
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Register CORS
server.register(cors, {
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
});

import candidateRoutes from './routes/candidates';
import applicationRoutes from './routes/applications';
import dashboardRoutes from './routes/dashboard';

// --- ROUTES ---

// Healthcheck
server.get('/health', async () => {
  return { status: 'ok', time: new Date() };
});

// Register API Routes
server.register(candidateRoutes, { prefix: '/api/candidates' });
server.register(applicationRoutes, { prefix: '/api/applications' });
server.register(dashboardRoutes, { prefix: '/api/dashboard' });

// Start the server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
    await server.listen({ port, host: '0.0.0.0' });
    server.log.info(`Server listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
