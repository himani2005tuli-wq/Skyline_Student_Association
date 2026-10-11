import jwt from 'jsonwebtoken';
import config from '../config/index.js';

const JWT_SECRET = config.jwt.secret;
const JWT_EXPIRES_IN = config.jwt.expiresIn;

/**
 * Sign a fast, stateless JWT payload
 */
export function signToken(payload, options = {}) {
  const expiresIn = options.expiresIn || JWT_EXPIRES_IN;
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    issuer: 'Skyline-Student-Association',
  });
}

/**
 * Verify and decode JWT token (instant in-memory operation)
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'Skyline-Student-Association',
    });
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header or cookie
 */
export function extractToken(req) {
  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. x-access-token header
  if (req.headers['x-access-token']) {
    return req.headers['x-access-token'];
  }

  // 3. Cookie fallback
  if (req.cookies && (req.cookies.token || req.cookies.jwt)) {
    return req.cookies.token || req.cookies.jwt;
  }

  return null;
}

export default {
  signToken,
  verifyToken,
  extractToken,
};
