import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import { cleanDatabase } from '../helpers/cleanDb.js';

describe('Merchandise & Orders Integration', () => {
  let cookie;
  let csrfToken;

  const adminUser = {
    email: 'merch_admin@example.com',
    password: 'securePassword123',
    firstName: 'Merch',
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
    csrfToken = resCsrf.body.data.csrfToken;
    let initialCookie = resCsrf.headers['set-cookie'];

    // Register user
    const resReg = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', initialCookie)
      .set('x-csrf-token', csrfToken)
      .send(adminUser);

    cookie = resReg.headers['set-cookie'];
    const userId = resReg.body.data.user.id;

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

  it('should create a product with variants and initial stock', async () => {
    const productPayload = {
      name: 'Club Hoodie',
      description: 'Cozy hoodie for winter',
      variants: [
        {
          name: 'Medium',
          sku: 'HOODIE-M-01',
          priceInPaise: 250000, // 2500.00
          memberPriceInPaise: 200000, // 2000.00
          stock: 50,
        },
        {
          name: 'Large',
          sku: 'HOODIE-L-01',
          priceInPaise: 250000,
          memberPriceInPaise: 200000,
          stock: 30,
        },
      ],
    };

    const res = await request(app)
      .post('/api/v1/products')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send(productPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.product.name).toBe('Club Hoodie');
    expect(res.body.data.product.variants.length).toBe(2);

    // Verify initial stock movement was created
    const movements = await prisma.inventoryMovement.findMany({
      where: { variantId: res.body.data.product.variants[0].id },
    });

    expect(movements.length).toBe(1);
    expect(movements[0].type).toBe('STOCK_IN');
    expect(movements[0].quantity).toBe(50);
  });
});
