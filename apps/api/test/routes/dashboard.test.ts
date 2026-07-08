import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { server } from '../../index';

describe('Dashboard Routes', () => {
  beforeAll(async () => {
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  it('GET /api/dashboard/stats should return all required metrics', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/dashboard/stats',
    });

    expect(response.statusCode).toBe(200);
    const data = JSON.parse(response.payload);
    
    expect(typeof data.totalCandidates).toBe('number');
    expect(typeof data.totalApplications).toBe('number');
    expect(typeof data.statusDistribution).toBe('object');
    expect(typeof data.hiredThisMonth).toBe('number');
    expect(typeof data.rejectionRate).toBe('number');
    expect(Array.isArray(data.latestApplications)).toBe(true);
  });
});
