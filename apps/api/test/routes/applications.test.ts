import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server, prisma } from '../../index';

describe('Applications Routes', () => {
  beforeAll(async () => {
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /api/applications should return paginated response', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/applications?page=1&limit=5',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data).toHaveProperty('data');
    expect(data).toHaveProperty('meta');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('GET /api/applications (search) searching by candidate name returns matching apps', async () => {
    const candidate = await prisma.candidate.findFirst();
    if (!candidate) return;

    const response = await server.inject({
      method: 'GET',
      url: `/api/applications?search=${encodeURIComponent(candidate.name)}`,
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('POST /api/applications 400 with missing required fields', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/applications',
      payload: {
        job_title: 'Software Engineer',
        // missing candidate_id, company, status, applied_at
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it('PUT /api/applications/:id 404 on unknown ID', async () => {
    const response = await server.inject({
      method: 'PUT',
      url: '/api/applications/00000000-0000-0000-0000-000000000000',
      payload: {
        job_title: 'Software Engineer Updated',
      },
    });

    expect(response.statusCode).toBe(404);
  });
});
