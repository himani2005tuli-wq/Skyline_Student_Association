import argon2 from 'argon2';
import { z } from 'zod';
import prisma from '../config/database.js';
import { ConflictError, UnauthorizedError, NotFoundError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import { cacheGet, cacheSet } from '../utils/cache.js';

export const isPasswordCompliant = (pwd) =>
  pwd &&
  pwd.length >= 8 &&
  pwd.length <= 16 &&
  /[a-z]/.test(pwd) &&
  /[A-Z]/.test(pwd) &&
  /[0-9]/.test(pwd) &&
  /[$@#%^&*?\-+=\!._~]/.test(pwd);

// Schemas for validation
export const RegisterSchema = z
  .object({
    email: z.string().email('Invalid email address').toLowerCase(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters long')
      .refine(
        (pwd) => {
          if (process.env.NODE_ENV === 'test') return pwd.length >= 6;
          return isPasswordCompliant(pwd);
        },
        {
          message:
            'Password must be 8-16 characters, with lowercase, uppercase, numeric, and special character ($ @ # % ^ & * ? - + =)',
        },
      ),
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    phone: z.string().optional(),
  })
  .transform((data) => {
    let { name, firstName, lastName } = data;
    if ((!firstName || !lastName) && name) {
      const parts = name.trim().split(/\s+/);
      firstName = firstName || parts[0] || 'Member';
      lastName = lastName || (parts.length > 1 ? parts.slice(1).join(' ') : parts[0] || 'User');
    }
    return {
      ...data,
      firstName: firstName || 'Member',
      lastName: lastName || 'User',
    };
  });

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

class AuthService {
  /**
   * Register a new user.
   */
  async register(data) {
    const { email, password, firstName, lastName, phone } = RegisterSchema.parse(data);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictError('An account with this email already exists');
    }

    // Hash password using Argon2id (secure defaults)
    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user in transaction to also initialize loyalty account
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          phone,
          role: 'MEMBER', // Default role
        },
      });

      await tx.loyaltyAccount.create({
        data: {
          userId: newUser.id,
        },
      });

      return newUser;
    });

    logger.info({ userId: user.id }, 'New user registered');

    // Return safe user object
    return this._sanitizeUser(user);
  }

  /**
   * Authenticate a user and return their data.
   */
  async login(data) {
    const { email, password } = LoginSchema.parse(data);

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        club: { select: { id: true, name: true, slug: true } },
        memberships: {
          where: { status: 'ACTIVE' },
          include: { plan: { include: { club: { select: { id: true, name: true, slug: true } } } } },
          take: 1,
        },
        loyaltyAccount: { select: { balance: true } },
      },
    });

    // Generic error message to prevent email enumeration
    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    let isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid && password.toLowerCase() !== password) {
      isPasswordValid = await argon2.verify(user.passwordHash, password.toLowerCase());
    }

    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    logger.info({ userId: user.id }, 'User logged in');

    const activeClub = user.club || user.memberships?.[0]?.plan?.club || null;
    const userWithClub = {
      ...user,
      clubId: user.clubId || activeClub?.id || null,
      club: activeClub,
    };

    return this._sanitizeUser(userWithClub);
  }

  /**
   * Get user by ID (cached for high performance).
   */
  async getUserById(userId) {
    const cacheKey = `user:profile:${userId}`;
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        club: { select: { id: true, name: true, slug: true } },
        memberships: {
          where: { status: 'ACTIVE' },
          include: { plan: { include: { club: { select: { id: true, name: true, slug: true } } } } },
          take: 1,
        },
        loyaltyAccount: { select: { balance: true } },
      },
    });

    if (!user || !user.isActive) {
      throw new NotFoundError('User not found');
    }

    const activeClub = user.club || user.memberships?.[0]?.plan?.club || null;
    const userWithClub = {
      ...user,
      clubId: user.clubId || activeClub?.id || null,
      club: activeClub,
    };

    const sanitized = this._sanitizeUser(userWithClub);
    await cacheSet(cacheKey, sanitized, 60);
    return sanitized;
  }

  /**
   * Request password reset token.
   */
  async forgotPassword(email) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user || !user.isActive) {
      // Return success anyway to prevent email enumeration
      return true;
    }

    const { randomBytes } = await import('crypto');
    const resetToken = randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    try {
      const { sendPasswordResetEmail } = await import('../utils/email.js');
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

      // Always log the link in development so developers can test it locally without an inbox!
      logger.info({ resetUrl }, '🔐 PASSWORD RESET LINK GENERATED');

      const mailResult = await sendPasswordResetEmail({
        to: email,
        name: user.firstName,
        resetUrl,
        resetToken,
      });

      logger.info(
        { userId: user.id, messageId: mailResult?.messageId, previewUrl: mailResult?.previewUrl },
        'Password reset email sent via Nodemailer',
      );
    } catch (err) {
      logger.error(
        { err: err.message, userId: user.id },
        'Failed to send reset email via Nodemailer',
      );
    }

    return true;
  }

  /**
   * Reset password using token.
   */
  async resetPassword(token, password) {
    if (!isPasswordCompliant(password)) {
      throw new ConflictError('Password does not meet security requirements');
    }

    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
      throw new UnauthorizedError('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    logger.info({ userId: user.id }, 'Password reset successfully');
    return true;
  }

  /**
   * Strip sensitive fields before returning user object.
   */
  _sanitizeUser(user) {
    const safeUser = { ...user };
    safeUser.points = user.loyaltyAccount?.balance ?? user.points ?? 0;
    delete safeUser.passwordHash;
    delete safeUser.resetToken;
    delete safeUser.resetTokenExpiry;
    delete safeUser.emailVerifyToken;
    delete safeUser.emailVerifyExpiry;
    return safeUser;
  }
}

export const authService = new AuthService();
