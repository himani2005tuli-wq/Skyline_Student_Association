import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import { cleanDatabase } from '../helpers/cleanDb.js';

describe('Auth Integration', () => {
  let csrfToken;
  let cookie;

  beforeEach(async () => {
    await cleanDatabase();

    // Get a fresh CSRF token and cookie for each test
    const res = await request(app).get('/api/v1/auth/csrf');
    csrfToken = res.body.data.csrfToken;
    cookie = res.headers['set-cookie'];
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const testUser = {
    email: 'student@example.com',
    password: 'securePassword123',
    firstName: 'Test',
    lastName: 'Student',
  };

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
    expect(res.body.data.user.passwordHash).toBeUndefined(); // Sensitive fields stripped
    expect(res.headers['set-cookie']).toBeDefined(); // Session created
  });

  it('should fail registration without CSRF token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', cookie)
      .send(testUser);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toMatch(/Invalid CSRF token/);
  });

  it('should fail registration with duplicate email', async () => {
    // First registration
    await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send(testUser);

    // Get new CSRF for second attempt
    const newCsrfRes = await request(app).get('/api/v1/auth/csrf');
    const newCsrfToken = newCsrfRes.body.data.csrfToken;
    const newCookie = newCsrfRes.headers['set-cookie'];

    // Second registration
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', newCookie)
      .set('x-csrf-token', newCsrfToken)
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('should login successfully and rotate session', async () => {
    // Register
    await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send(testUser);

    // Get fresh CSRF for login
    const csrfRes = await request(app).get('/api/v1/auth/csrf');
    const loginCsrf = csrfRes.body.data.csrfToken;
    const loginCookie = csrfRes.headers['set-cookie'];

    // Login
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Cookie', loginCookie)
      .set('x-csrf-token', loginCsrf)
      .send({ email: testUser.email, password: testUser.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);

    // Check that a new session cookie was issued
    const newSessionCookie = res.headers['set-cookie'][0];
    expect(newSessionCookie).toBeDefined();
    expect(newSessionCookie).not.toEqual(loginCookie[0]);
  });

  it('should fail login with incorrect password', async () => {
    // Register
    await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send(testUser);

    // Get fresh CSRF for login
    const csrfRes = await request(app).get('/api/v1/auth/csrf');
    const loginCsrf = csrfRes.body.data.csrfToken;
    const loginCookie = csrfRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Cookie', loginCookie)
      .set('x-csrf-token', loginCsrf)
      .send({ email: testUser.email, password: 'wrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should access protected route /me when authenticated', async () => {
    // Register
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send(testUser);

    const authCookie = regRes.headers['set-cookie'];

    // Access /me
    const res = await request(app).get('/api/v1/auth/me').set('Cookie', authCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testUser.email);
  });

  it('should reject unauthenticated access to /me', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('should logout successfully', async () => {
    // Register
    const regRes = await request(app)
      .post('/api/v1/auth/register')
      .set('Cookie', cookie)
      .set('x-csrf-token', csrfToken)
      .send(testUser);

    const authCookie = regRes.headers['set-cookie'];

    // Need CSRF for logout (POST)
    const csrfRes = await request(app).get('/api/v1/auth/csrf').set('Cookie', authCookie);

    const logoutCsrf = csrfRes.body.data.csrfToken;
    // Keep auth cookie but append new CSRF token if necessary, or just use auth cookie

    const logoutRes = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', authCookie)
      .set('x-csrf-token', logoutCsrf);

    expect(logoutRes.status).toBe(200);

    // Try accessing /me again
    const meRes = await request(app).get('/api/v1/auth/me').set('Cookie', authCookie);

    expect(meRes.status).toBe(401);
  });
});
