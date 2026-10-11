import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import { cleanDatabase } from '../helpers/cleanDb.js';

describe('Payments & Ledger Integration', () => {
  let adminCookie;
  let adminCsrfToken;

  const adminUser = {
    email: 'treasurer@example.com',
    password: 'securePassword123',
    firstName: 'Finance',
    lastName: 'Admin',
  };

  beforeEach(async () => {
    // Clear tables
    await cleanDatabase();

    // Create a dummy club
    await prisma.club.upsert({
      where: { slug: 'skyline-sa' },
      update: {},
      create: { name: 'Skyline SA', slug: 'skyline-sa' },
    });

    // Setup initial CSRF
    const resCsrf = await request(app).get('/api/v1/auth/csrf');
    adminCsrfToken = resCsrf.body.data.csrfToken;
    let initialCookie = resCsrf.headers['set-cookie'];

    // Register user
    const resReg = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', initialCookie)
      .set('x-csrf-token', adminCsrfToken)
      .send(adminUser);

    adminCookie = resReg.headers['set-cookie'];
    const adminUserId = resReg.body.data.user.id;

    // Promote to Admin
    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: 'TREASURER' },
    });

    // Get fresh CSRF
    const resFreshCsrf = await request(app).get('/api/v1/auth/csrf').set('Cookie', adminCookie);
    adminCsrfToken = resFreshCsrf.body.data.csrfToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should process a mock payment webhook idempotently and log to ledger', async () => {
    // Create a mock order and pending payment
    const user = await prisma.user.findFirst();

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: 'PENDING_PAYMENT',
        totalInPaise: 50000,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        amountInPaise: 50000,
        currency: 'INR',
        status: 'PENDING',
        providerName: 'MOCK_STRIPE',
        idempotencyKey: 'test-key-1',
      },
    });

    const webhookPayload = {
      providerEventId: 'evt_123',
      eventType: 'payment_intent.succeeded',
      payload: {
        payment_id: payment.id,
        provider_ref: 'pi_123',
      },
    };

    // First Webhook Call
    const res1 = await request(app).post('/api/v1/payments/webhook').send(webhookPayload); // Not protected by auth, relies on providerEventId

    expect(res1.status).toBe(200);
    expect(res1.body.data.status).toBe('PROCESSED');

    // Second Webhook Call (Idempotent replay)
    const res2 = await request(app).post('/api/v1/payments/webhook').send(webhookPayload);

    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe('SKIPPED');

    // Verify order is PAID
    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    expect(updatedOrder.status).toBe('PAID');

    // Verify ledger
    const ledgerRes = await request(app).get('/api/v1/ledger').set('Cookie', adminCookie);

    expect(ledgerRes.status).toBe(200);
    expect(ledgerRes.body.data.summary.totalIncome).toBe(50000);
    expect(ledgerRes.body.data.transactions[0].category).toBe('MERCHANDISE_SALES');
  });
});
