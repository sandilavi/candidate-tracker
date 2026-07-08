import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const server = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

// Configure Zod for strict schema validation and typing on all routes
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Enable CORS so the React frontend can communicate with this API
server.register(cors, {
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
});

import candidateRoutes from './routes/candidates';
import applicationRoutes from './routes/applications';
import dashboardRoutes from './routes/dashboard';

// Register modular API route prefixes
server.register(candidateRoutes, { prefix: '/api/candidates' });
server.register(applicationRoutes, { prefix: '/api/applications' });
server.register(dashboardRoutes, { prefix: '/api/dashboard' });

// Centralized error handler to ensure consistent API responses
server.setErrorHandler(function (error: any, request, reply) {
  if (error.validation) {
    return reply.status(400).send({ error: 'Validation Error', details: error.validation });
  }

  // Map Prisma unique constraint violations (e.g. duplicate emails) to 400 Bad Request
  if (error.code === 'P2002') {
    return reply.status(400).send({ error: 'A record with this value already exists' });
  }

  // Pass through any custom thrown errors
  if (error.statusCode) {
    return reply.status(error.statusCode).send({ error: error.message });
  }

  // Fallback catch-all for unhandled exceptions
  this.log.error(error);
  return reply.status(500).send({ error: 'Internal Server Error' });
});

// Bootstrap the Fastify server
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

if (process.env.NODE_ENV !== 'test') {
  start();
}

export { server };
