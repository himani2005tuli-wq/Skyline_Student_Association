import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../../server/src/app.js';

describe('Health Check Integration', () => {
  it('GET /api/v1/health should return 200 with status ok', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.timestamp).toBeDefined();
    expect(res.body.data.environment).toBeDefined();
  });

  it('GET /api/v1/health should return valid ISO timestamp', async () => {
    const res = await request(app).get('/api/v1/health');

    const timestamp = new Date(res.body.data.timestamp);
    expect(timestamp.toISOString()).toBe(res.body.data.timestamp);
  });

  it('GET /api/v1/health/detailed should return checks object', async () => {
    const res = await request(app).get('/api/v1/health/detailed');

    // May be 200 or 503 depending on DB availability
    expect([200, 503]).toContain(res.status);
    expect(res.body.data.checks).toBeDefined();
    expect(res.body.data.checks.database).toBeDefined();
    expect(res.body.data.checks.redis).toBeDefined();
    expect(res.body.data.uptime).toBeTypeOf('number');
  });

  it('GET /api/v1/nonexistent should return 404', async () => {
    const res = await request(app).get('/api/v1/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('should include security headers from Helmet', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
  });

  it('should return JSON content type', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
