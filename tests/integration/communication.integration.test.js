import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server/src/app.js';
import prisma from '../../server/src/config/database.js';
import { cleanDatabase } from '../helpers/cleanDb.js';

describe('Communication Integration', () => {
  let cookie;
  let csrfToken;

  const user = {
    email: 'comm_user@example.com',
    password: 'securePassword123',
    firstName: 'Comm',
    lastName: 'User',
  };

  beforeEach(async () => {
    // Clear relevant tables
    await cleanDatabase();

    // Create a dummy club
    await prisma.club.upsert({
      where: { slug: 'skyline-sa' },
      update: {},
      create: { name: 'Skyline SA', slug: 'skyline-sa' },
    });

    // Setup initial CSRF
    const resCsrf = await request(app).get('/api/v1/auth/csrf');
    csrfToken = resCsrf.body.data.csrfToken;
    let initialCookie = resCsrf.headers['set-cookie'];

    // Register user
    const resReg = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', initialCookie)
      .set('x-csrf-token', csrfToken)
      .send(user);

    cookie = resReg.headers['set-cookie'];

    // Get fresh CSRF
    const resFreshCsrf = await request(app).get('/api/v1/auth/csrf').set('Cookie', cookie);
    csrfToken = resFreshCsrf.body.data.csrfToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow user to update mailing preferences', async () => {
    const preferences = [
      { channel: 'EMAIL', isSubscribed: true },
      { channel: 'WHATSAPP', isSubscribed: false },
    ];

    const res = await request(app)
      .post('/api/v1/communication/preferences/me')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send({ preferences });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.preferences.length).toBe(2);

    // Verify they persist
    const getRes = await request(app)
      .get('/api/v1/communication/preferences/me')
      .set('Cookie', cookie);

    expect(getRes.status).toBe(200);
    expect(getRes.body.data.preferences.find((p) => p.channel === 'EMAIL').isSubscribed).toBe(true);
    expect(getRes.body.data.preferences.find((p) => p.channel === 'WHATSAPP').isSubscribed).toBe(
      false,
    );
  });

  it('should prevent non-admins from creating announcements', async () => {
    const res = await request(app)
      .post('/api/v1/communication/announcements')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send({
        title: 'Important News',
        content: 'This is a test announcement',
        isPublished: true,
      });

    // Default user is MEMBER
    expect(res.status).toBe(403);
  });
});
