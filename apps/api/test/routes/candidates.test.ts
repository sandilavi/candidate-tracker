import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server } from '../../index';

describe('Candidates API', () => {
  beforeAll(async () => {
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /api/candidates should return paginated response', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/candidates?page=1&limit=5'
    });
    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    expect(data.data).toBeDefined();
    expect(data.meta).toBeDefined();
    expect(data.meta.page).toBe(1);
    expect(data.meta.limit).toBe(5);
  });

  it('POST /api/candidates should handle validation errors', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/candidates',
      payload: {
        name: 'Invalid Candidate',
        // Missing email
      }
    });
    expect(response.statusCode).toBe(400);
    const data = JSON.parse(response.payload);
    expect(data.error).toBe('Validation Error');
  });

  it('DELETE /api/candidates/:id should handle non-existent candidates', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const response = await server.inject({
      method: 'DELETE',
      url: `/api/candidates/${nonExistentId}`
    });
    expect(response.statusCode).toBe(404);
    const data = JSON.parse(response.payload);
    expect(data.error).toBe('Candidate not found');
  });
});
