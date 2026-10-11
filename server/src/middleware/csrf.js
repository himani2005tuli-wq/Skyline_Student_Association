import { csrfSync } from 'csrf-sync';

const {
  invalidCsrfTokenError,
  generateToken,
  getTokenFromRequest,
  getTokenFromState,
  storeTokenInState,
  revokeToken,
  csrfSynchronisedProtection,
} = csrfSync({
  getTokenFromRequest: (req) => {
    return req.headers['x-csrf-token'];
  },
});

const rawCsrfProtection = csrfSynchronisedProtection;

/**
 * Smart CSRF protection:
 * - If request has an Authorization Bearer header, CSRF attacks are impossible (SOP prevents cross-site header injection).
 * - Otherwise (cookie/session-based requests), full csrf-sync protection is enforced.
 */
const smartCsrfProtection = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }
  return rawCsrfProtection(req, res, next);
};

export {
  invalidCsrfTokenError,
  generateToken,
  getTokenFromRequest,
  getTokenFromState,
  storeTokenInState,
  revokeToken,
  smartCsrfProtection as csrfSynchronisedProtection,
};

/**
 * Controller to issue a CSRF token to the frontend.
 */
export const getCsrfToken = (req, res) => {
  const token = generateToken(req, true);
  res.json({ success: true, data: { csrfToken: token } });
};
