import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server/src/app.js';
import prisma from '../../server/src/config/database.js';
import { cleanDatabase } from '../helpers/cleanDb.js';

describe('Loyalty & Pricing Integration', () => {
  let cookie;
  let csrfToken;
  let userId;

  const testUser = {
    email: 'loyaltytest@example.com',
    password: 'securePassword123',
    firstName: 'Loyalty',
    lastName: 'Tester',
  };

  beforeEach(async () => {
    // Clear DB
    await cleanDatabase();

    // Setup initial CSRF
    const resCsrf = await request(app).get('/api/v1/auth/csrf');
    csrfToken = resCsrf.body.data.csrfToken;
    let initialCookie = resCsrf.headers['set-cookie'];

    // Register user
    const resReg = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', initialCookie)
      .set('x-csrf-token', csrfToken)
      .send(testUser);

    cookie = resReg.headers['set-cookie'];
    userId = resReg.body.data.user.id;

    // Get a fresh CSRF token for the authenticated session
    const resFreshCsrf = await request(app).get('/api/v1/auth/csrf').set('Cookie', cookie);
    csrfToken = resFreshCsrf.body.data.csrfToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should initialize a loyalty account upon registration', async () => {
    const res = await request(app).get('/api/v1/loyalty/me').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.account.balance).toBe(0);
  });

  it('should prevent non-admins from simulating point earnings', async () => {
    const res = await request(app)
      .post('/api/v1/loyalty/simulate-earn')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send({ points: 100 });

    // User is created with MEMBER role by default
    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/permission/);
  });

  it('should allow admins to simulate earnings and handle idempotency', async () => {
    // Manually elevate to ADMIN
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'CLUB_ADMIN' },
    });

    const payload = {
      points: 100,
      referenceType: 'SIMULATION',
      idempotencyKey: 'idemp-1234',
    };

    // 1st request
    const res1 = await request(app)
      .post('/api/v1/loyalty/simulate-earn')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send(payload);

    expect(res1.status).toBe(200);
    expect(res1.body.data.transaction.points).toBe(100);

    // 2nd request with same idempotency key
    const res2 = await request(app)
      .post('/api/v1/loyalty/simulate-earn')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send(payload);

    expect(res2.status).toBe(200);
    // Should return the exact same transaction ID
    expect(res2.body.data.transaction.id).toBe(res1.body.data.transaction.id);

    // Verify final balance
    const balanceRes = await request(app).get('/api/v1/loyalty/me').set('Cookie', cookie);

    expect(balanceRes.body.data.account.balance).toBe(100);
  });

  it('should list membership plans publicly', async () => {
    const res = await request(app).get('/api/v1/memberships/plans');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Should be an array, length depends on seed data (which is not loaded in tests by default unless seeded)
    expect(Array.isArray(res.body.data.plans)).toBe(true);
  });
});
