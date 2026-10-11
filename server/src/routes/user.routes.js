import { Router } from 'express';
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  updateUserRole,
  grantUserAuthority,
  revokeUserAuthority,
  getRoleAuthorityMatrix,
  updateRoleAuthorities,
} from '../controllers/user.controller.js';
import { requireAuth, requireAnyAuthority } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// 1. Get role authorities matrix & system authorities list
router.get('/roles/matrix', requireAnyAuthority(['users:manage', 'auth:users:manage', '*']), getRoleAuthorityMatrix);

// 2. Dynamically update permissions of a role in database
router.put(
  '/roles/:role/authorities',
  csrfSynchronisedProtection,
  requireAnyAuthority(['users:manage', 'auth:users:manage', '*']),
  updateRoleAuthorities,
);

// 3. List users with their roles, direct authorities, and effective authorities from DB
router.get('/', requireAnyAuthority(['users:manage', 'auth:users:manage', '*']), listUsers);

// 4. Admin create new user
router.post(
  '/',
  csrfSynchronisedProtection,
  requireAnyAuthority(['users:manage', 'auth:users:manage', '*']),
  createUser,
);

// 5. Update user's role dynamically in database
router.patch(
  '/:id/role',
  csrfSynchronisedProtection,
  requireAnyAuthority(['users:manage', 'auth:users:manage', '*']),
  updateUserRole,
);

// 6. Admin update user
router.put(
  '/:id',
  csrfSynchronisedProtection,
  requireAnyAuthority(['users:manage', 'auth:users:manage', '*']),
  updateUser,
);
router.patch(
  '/:id',
  csrfSynchronisedProtection,
  requireAnyAuthority(['users:manage', 'auth:users:manage', '*']),
  updateUser,
);

// 7. Admin delete user
router.delete(
  '/:id',
  csrfSynchronisedProtection,
  requireAnyAuthority(['users:manage', 'auth:users:manage', '*']),
  deleteUser,
);

// 8. Grant dynamic granular authority to user in DB
router.post(
  '/:id/authorities',
  csrfSynchronisedProtection,
  requireAnyAuthority(['users:manage', 'auth:users:manage', '*']),
  grantUserAuthority,
);

// 9. Revoke dynamic granular authority from user in DB
router.delete(
  '/:id/authorities/:authority',
  csrfSynchronisedProtection,
  requireAnyAuthority(['users:manage', 'auth:users:manage', '*']),
  revokeUserAuthority,
);

export default router;
