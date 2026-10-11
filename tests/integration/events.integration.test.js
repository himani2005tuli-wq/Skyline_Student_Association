import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server/src/app.js';
import prisma from '../../server/src/config/database.js';
import { cleanDatabase } from '../helpers/cleanDb.js';

describe('Events & Ticketing Integration', () => {
  let cookie;
  let csrfToken;
  let userId;

  const adminUser = {
    email: 'admin_events@example.com',
    password: 'securePassword123',
    firstName: 'Admin',
    lastName: 'Events',
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
      .send(adminUser);

    cookie = resReg.headers['set-cookie'];
    userId = resReg.body.data.user.id;

    // Promote to Admin
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'CLUB_ADMIN' },
    });

    // Get fresh CSRF
    const resFreshCsrf = await request(app).get('/api/v1/auth/csrf').set('Cookie', cookie);
    csrfToken = resFreshCsrf.body.data.csrfToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create an event with ticket types as an admin', async () => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const eventPayload = {
      title: 'Spring Festival',
      description: 'Annual spring fest',
      location: 'Main Campus',
      startDate: new Date().toISOString(),
      endDate: nextWeek.toISOString(),
      capacity: 500,
      status: 'PUBLISHED',
      ticketTypes: [
        {
          name: 'General Admission',
          priceInPaise: 100000, // 1000.00
          memberPriceInPaise: 50000, // 500.00
          quantity: 200,
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/events')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send(eventPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.event.title).toBe('Spring Festival');
    expect(res.body.data.event.ticketTypes.length).toBe(1);
  });

  it('should prevent non-admins from creating events', async () => {
    // Demote to member
    await prisma.user.update({
      where: { id: userId },
      data: { role: 'MEMBER' },
    });

    const res = await request(app)
      .post('/api/v1/events')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send({
        title: 'Hacked Event',
        startDate: new Date().toISOString(),
        endDate: new Date().toISOString(),
      });

    expect(res.status).toBe(403);
  });
});
