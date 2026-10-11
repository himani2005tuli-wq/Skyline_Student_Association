import { authService } from '../services/auth.service.js';
import authorityService from '../services/authority.service.js';
import { signToken } from '../utils/jwt.js';
import config from '../config/index.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Register a new user with JWT token issuance
 */
export async function register(req, res, next) {
  try {
    const user = await authService.register(req.body);
    const authorities = await authorityService.getUserEffectiveAuthorities(user.id, user.role);

    // Generate fast stateless JWT
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      authorities,
    });

    // Set JWT cookie
    res.cookie('token', token, COOKIE_OPTIONS);

    // Session fallback if active
    if (req.session) {
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.role = user.role;
    }

    res.status(201).json({
      success: true,
      data: {
        user: { ...user, authorities },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log in an existing user with JWT token issuance
 */
export async function login(req, res, next) {
  try {
    const user = await authService.login(req.body);
    const authorities = await authorityService.getUserEffectiveAuthorities(user.id, user.role);

    // Generate fast stateless JWT
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      clubId: user.clubId || null,
      authorities,
    });

    // Set JWT cookie
    res.cookie('token', token, COOKIE_OPTIONS);

    // Session fallback if active
    if (req.session) {
      req.session.regenerate(() => {
        req.session.userId = user.id;
        req.session.email = user.email;
        req.session.role = user.role;
        req.session.clubId = user.clubId || null;
        req.session.save(() => {});
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: { ...user, authorities },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Log out the current user and clear token cookies
 */
export function logout(req, res, next) {
  try {
    res.clearCookie('token');
    res.clearCookie('sos_sid');

    if (req.session) {
      req.session.destroy(() => {});
    }

    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get the currently authenticated user's profile with token refresh
 */
export async function getMe(req, res, next) {
  try {
    const user = await authService.getUserById(req.user.id);
    const authorities =
      req.user.authorities ||
      (await authorityService.getUserEffectiveAuthorities(user.id, user.role));

    // Refreshed token
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
      clubId: user.clubId || null,
      authorities,
    });

    res.status(200).json({
      success: true,
      data: {
        user: { ...user, authorities },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Request password reset
 */
export async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: { message: 'Email is required' } });
    }
    
    await authService.forgotPassword(email);
    
    res.status(200).json({
      success: true,
      message: `Reset link sent to ${email}`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Reset password
 */
export async function resetPassword(req, res, next) {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: { message: 'Token and new password are required' } });
    }
    
    await authService.resetPassword(token, password);
    
    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully',
    });
  } catch (err) {
    next(err);
  }
}
