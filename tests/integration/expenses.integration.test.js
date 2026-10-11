import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../server/src/app.js';
import prisma from '../../server/src/config/database.js';
import { cleanDatabase } from '../helpers/cleanDb.js';

describe('Expenses & Fundraisers Integration', () => {
  let adminCookie;
  let adminCsrfToken;
  let adminUserId;

  const adminUser = {
    email: 'finance_admin@example.com',
    password: 'securePassword123',
    firstName: 'Finance',
    lastName: 'Admin',
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
    adminCsrfToken = resCsrf.body.data.csrfToken;
    let initialCookie = resCsrf.headers['set-cookie'];

    // Register user
    const resReg = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', initialCookie)
      .set('x-csrf-token', adminCsrfToken)
      .send(adminUser);

    adminCookie = resReg.headers['set-cookie'];
    adminUserId = resReg.body.data.user.id;

    // Promote to Admin
    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: 'CLUB_ADMIN' },
    });

    // Get fresh CSRF
    const resFreshCsrf = await request(app).get('/api/v1/auth/csrf').set('Cookie', adminCookie);
    adminCsrfToken = resFreshCsrf.body.data.csrfToken;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should allow user to submit expense, and admin to review and pay', async () => {
    // 1. Submit Expense
    const expensePayload = {
      description: 'Pizza for volunteer meeting',
      amountInPaise: 450000, // 4500.00
      receiptUrl: 'https://storage.example.com/receipts/pizza.pdf',
    };

    const submitRes = await request(app)
      .post('/api/v1/expenses')
      .set('Cookie', adminCookie)
      .set('x-csrf-token', adminCsrfToken)
      .send(expensePayload);

    expect(submitRes.status).toBe(201);
    expect(submitRes.body.data.expense.status).toBe('SUBMITTED');
    const expenseId = submitRes.body.data.expense.id;

    // 2. Admin Review (Approve)
    const reviewRes = await request(app)
      .post(`/api/v1/expenses/${expenseId}/review`)
      .set('Cookie', adminCookie)
      .set('x-csrf-token', adminCsrfToken)
      .send({ status: 'APPROVED', note: 'Looks good' });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.data.expense.status).toBe('APPROVED');

    // Verify Reimbursement record created
    const reimbursement = await prisma.reimbursement.findUnique({
      where: { expenseId },
    });
    expect(reimbursement).not.toBeNull();
    expect(reimbursement.approvedBy).toBe(adminUserId);

    // 3. Mark as Paid (Treasurer/Admin)
    // Needs TREASURER or SUPER_ADMIN role as per routes
    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: 'TREASURER' },
    });

    const payRes = await request(app)
      .post(`/api/v1/expenses/${expenseId}/pay`)
      .set('Cookie', adminCookie)
      .set('x-csrf-token', adminCsrfToken)
      .send();

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.expense.status).toBe('PAID');
    expect(payRes.body.data.reimbursement.paidAt).not.toBeNull();
  });
});
