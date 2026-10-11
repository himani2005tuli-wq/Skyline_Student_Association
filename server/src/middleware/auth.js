import { UnauthorizedError, ForbiddenError } from '../utils/AppError.js';
import prisma from '../config/database.js';
import authorityService from '../services/authority.service.js';
import { extractToken, verifyToken } from '../utils/jwt.js';

/**
 * Ensures the user is authenticated via stateless JWT (ultra-fast <1ms) or session.
 * Adds user info to req.user with roles and dynamic authorities.
 */
export const requireAuth = async (req, _res, next) => {
  // 1. Ultra-fast stateless JWT token check
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.id) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        clubId: decoded.clubId || null,
        authorities: decoded.authorities || [],
      };
      return next();
    }
  }

  // 2. Graceful Session fallback
  if (!req.session || !req.session.userId) {
    return next(new UnauthorizedError('Please log in or provide a valid authorization token'));
  }

  // Enforce absolute session expiry
  if (req.session.absoluteExpiry && Date.now() > req.session.absoluteExpiry) {
    return req.session.destroy(() => {
      next(new UnauthorizedError('Session expired. Please log in again'));
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: { id: true, email: true, role: true, isActive: true, clubId: true },
    });

    if (!user || !user.isActive) {
      return next(new UnauthorizedError('User account not found or deactivated'));
    }

    // Retrieve dynamic authorities directly from DB
    const authorities = await authorityService.getUserEffectiveAuthorities(user.id, user.role);

    req.session.role = user.role;
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      clubId: user.clubId || null,
      authorities,
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Populates req.user if authorization token or session is present,
 * but does not throw errors if unauthenticated.
 */
export const optionalAuth = async (req, _res, next) => {
  const token = extractToken(req);
  if (token) {
    const decoded = verifyToken(token);
    if (decoded && decoded.id) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        clubId: decoded.clubId || null,
        authorities: decoded.authorities || [],
      };
      return next();
    }
  }

  if (req.session && req.session.userId) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.session.userId },
        select: { id: true, email: true, role: true, isActive: true, clubId: true },
      });

      if (user && user.isActive) {
        const authorities = await authorityService.getUserEffectiveAuthorities(user.id, user.role);
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          clubId: user.clubId || null,
          authorities,
        };
      }
    } catch {
      // non-blocking
    }
  }

  next();
};

/**
 * Ensures the user has a specific dynamic authority from the database.
 * Supports wildcards (*, events:*) and granular permissions.
 */
export const requireAuthority = (authority) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Please log in to access this resource'));
    }

    const role = req.user.role ? String(req.user.role).toUpperCase() : '';
    if (
      role === 'SUPER_ADMIN' ||
      req.user.authorities?.includes('*') ||
      authorityService.hasAuthority(req.user.authorities, authority)
    ) {
      return next();
    }

    return next(
      new ForbiddenError(`You do not have the required authority (${authority}) for this action`),
    );
  };
};

/**
 * Ensures the user has ANY of the specified dynamic authorities.
 */
export const requireAnyAuthority = (authorities = []) => {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Please log in to access this resource'));
    }

    const role = req.user.role ? String(req.user.role).toUpperCase() : '';
    if (
      role === 'SUPER_ADMIN' ||
      req.user.authorities?.includes('*') ||
      authorityService.hasAnyAuthority(req.user.authorities, authorities)
    ) {
      return next();
    }

    return next(
      new ForbiddenError('You do not have any of the required authorities for this action'),
    );
  };
};

/**
 * Ensures the user has one of the specified roles or possesses equivalent DB authorities.
 * Must be used AFTER requireAuth.
 * @param {string[]} roles - Array of allowed roles
 */
export const requireRoles = (roles) => {
  return (req, _res, next) => {
    if (!req.user || !req.user.role) {
      return next(new UnauthorizedError('Please log in to access this resource'));
    }

    const userRole = String(req.user.role).toUpperCase();
    const normalizedRoles = roles.map((r) => String(r).toUpperCase());

    // Super Admin has wildcard access to all role-restricted routes
    if (
      userRole === 'SUPER_ADMIN' ||
      normalizedRoles.includes(userRole) ||
      (userRole === 'CLUB_ADMIN' && normalizedRoles.includes('ADMIN')) ||
      req.user.authorities?.includes('*')
    ) {
      return next();
    }

    return next(new ForbiddenError('You do not have permission to perform this action'));
  };
};

/**
 * Wrapper for CSRF error handling to maintain consistent error format.
 */
export const csrfErrorHandler = (err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return next(new ForbiddenError('Invalid CSRF token. Please refresh the page.'));
  }
  next(err);
};
