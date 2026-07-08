import Fastify from 'fastify';
import cors from '@fastify/cors';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const server = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>();

// Configure Zod as the primary validator and serializer for Fastify routes.
server.setValidatorCompiler(validatorCompiler);
server.setSerializerCompiler(serializerCompiler);

// Enable CORS to allow cross-origin requests from client applications.
server.register(cors, {
  origin: '*', // For development, allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
});

import candidateRoutes from './routes/candidates';
import applicationRoutes from './routes/applications';
import dashboardRoutes from './routes/dashboard';

// Register modular route prefixes for domain entities.
server.register(candidateRoutes, { prefix: '/api/candidates' });
server.register(applicationRoutes, { prefix: '/api/applications' });
server.register(dashboardRoutes, { prefix: '/api/dashboard' });

// Centralized error handler intercepting and normalizing all thrown errors.
server.setErrorHandler(function (error: any, request, reply) {
  if (error.validation) {
    return reply.status(400).send({ error: 'Validation Error', details: error.validation });
  }

  /* Map Prisma P2002 unique constraint violations to a 400 Bad Request error. */
  if (error.code === 'P2002') {
    const fields = error.meta?.target as string[] | string | undefined;
    const fieldName = Array.isArray(fields) ? fields.join(', ') : (fields || 'value');
    
    if (fieldName.includes('email')) {
      return reply.status(400).send({ error: 'This email address is already in use by another candidate.' });
    }
    
    if (fieldName.includes('phone')) {
      return reply.status(400).send({ error: 'This phone number is already in use by another candidate.' });
    }

    if (fieldName.includes('linkedin')) {
      return reply.status(400).send({ error: 'This LinkedIn profile is already registered to another candidate.' });
    }

    return reply.status(400).send({ error: `A record with this ${fieldName} already exists.` });
  }

  // Pass through errors that already have a defined HTTP status code.
  if (error.statusCode) {
    return reply.status(error.statusCode).send({ error: error.message });
  }

  // Fallback catch-all error handler returning a 500 Internal Server Error.
  this.log.error(error);
  return reply.status(500).send({ error: 'Internal Server Error.' });
});

// Bootstraps and starts the Fastify server instance.
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

export { server, prisma };
