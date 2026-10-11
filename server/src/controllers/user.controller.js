import prisma from '../config/database.js';
import authorityService, { SYSTEM_AUTHORITIES } from '../services/authority.service.js';
import { BadRequestError, NotFoundError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

const VALID_ROLES = [
  'SUPER_ADMIN',
  'CLUB_ADMIN',
  'TREASURER',
  'EVENT_MANAGER',
  'VOLUNTEER',
  'MEMBER',
];

/**
 * List all users with their memberships, roles, and effective authorities from DB
 */
export async function listUsers(req, res, next) {
  try {
    const { role, search, clubId: queryClubId } = req.query;

    let isClubAdmin = false;
    let userClubId = null;

    if (req.user) {
      if (req.user.role === 'CLUB_ADMIN' || req.user.role === 'ADMIN') {
        isClubAdmin = true;
        userClubId = req.user.clubId;
      }
    } else if (req.session?.userId && (req.session.role === 'CLUB_ADMIN' || req.session.role === 'ADMIN')) {
      isClubAdmin = true;
      userClubId = req.session.clubId;
    }

    if (isClubAdmin && !userClubId && (req.user?.id || req.session?.userId)) {
      const u = await prisma.user.findUnique({
        where: { id: req.user?.id || req.session?.userId },
        select: {
          clubId: true,
          memberships: {
            where: { status: 'ACTIVE' },
            select: { plan: { select: { clubId: true } } },
            take: 1,
          },
        },
      });
      userClubId = u?.clubId || u?.memberships?.[0]?.plan?.clubId || null;
    }

    const targetClubId = isClubAdmin ? userClubId : queryClubId;
    const andConditions = [];

    if (targetClubId) {
      andConditions.push({
        OR: [
          { clubId: targetClubId },
          { memberships: { some: { plan: { clubId: targetClubId } } } },
        ],
      });
    }

    if (role && VALID_ROLES.includes(role.toUpperCase())) {
      andConditions.push({ role: role.toUpperCase() });
    }

    if (search) {
      andConditions.push({
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const [users, roleMap] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          clubId: true,
          club: { select: { id: true, name: true, slug: true } },
          memberships: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              status: true,
              expiryDate: true,
              plan: { select: { id: true, name: true, club: { select: { name: true, slug: true } } } },
            },
            take: 1,
          },
          loyaltyAccount: {
            select: { balance: true },
          },
          authorities: {
            select: { authority: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      authorityService.getAllRoleAuthorities(),
    ]);

    const formatted = users.map((u) => {
      const directAuths = u.authorities.map((a) => a.authority);
      const roleAuths = roleMap[u.role] || [];
      const effectiveAuths = Array.from(new Set([...roleAuths, ...directAuths]));
      const activeMem = u.memberships[0];

      return {
        id: u.id,
        email: u.email,
        name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role,
        isActive: u.isActive,
        plan: activeMem?.plan?.name || '—',
        status: activeMem ? 'Active' : 'Not a member',
        expires: activeMem?.expiryDate || null,
        points: u.loyaltyAccount?.balance ?? 0,
        directAuthorities: directAuths,
        effectiveAuthorities: effectiveAuths,
        createdAt: u.createdAt,
      };
    });

    res.json({
      success: true,
      data: {
        users: formatted,
        total: formatted.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Dynamically change a user's role in DB
 */
export async function updateUserRole(req, res, next) {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const normalizedRole = role ? role.toUpperCase() : null;
    if (!normalizedRole || !VALID_ROLES.includes(normalizedRole)) {
      throw new BadRequestError(
        `Invalid role: "${role}". Allowed roles: ${VALID_ROLES.join(', ')}`,
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const updated = await authorityService.updateUserRole(id, normalizedRole);
    const effectiveAuthorities = await authorityService.getUserEffectiveAuthorities(
      id,
      normalizedRole,
    );

    logger.info(
      { adminId: req.user.id, targetUserId: id, oldRole: user.role, newRole: normalizedRole },
      'User role updated dynamically in database',
    );

    res.json({
      success: true,
      data: {
        user: {
          ...updated,
          effectiveAuthorities,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Grant a direct granular authority to a user in DB
 */
export async function grantUserAuthority(req, res, next) {
  try {
    const { id } = req.params;
    const { authority } = req.body;

    if (!authority || typeof authority !== 'string') {
      throw new BadRequestError('Authority string is required');
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const record = await authorityService.grantUserAuthority(id, authority.trim());
    const effective = await authorityService.getUserEffectiveAuthorities(id, user.role);

    logger.info(
      { adminId: req.user.id, targetUserId: id, authority },
      'Granted dynamic authority to user',
    );

    res.json({
      success: true,
      data: {
        granted: record.authority,
        effectiveAuthorities: effective,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Revoke a direct granular authority from a user in DB
 */
export async function revokeUserAuthority(req, res, next) {
  try {
    const { id, authority } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    await authorityService.revokeUserAuthority(id, decodeURIComponent(authority));
    const effective = await authorityService.getUserEffectiveAuthorities(id, user.role);

    logger.info(
      { adminId: req.user.id, targetUserId: id, authority },
      'Revoked dynamic authority from user',
    );

    res.json({
      success: true,
      data: {
        revoked: authority,
        effectiveAuthorities: effective,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get the full role-authority matrix and available system authorities
 */
export async function getRoleAuthorityMatrix(req, res, next) {
  try {
    const roleAuthorities = await authorityService.getAllRoleAuthorities();

    res.json({
      success: true,
      data: {
        availableAuthorities: SYSTEM_AUTHORITIES,
        availableRoles: VALID_ROLES,
        roleAuthorities,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Dynamically update the authorities assigned to a role in DB
 */
export async function updateRoleAuthorities(req, res, next) {
  try {
    const { role } = req.params;
    const { authorities, description } = req.body;

    const normalizedRole = role ? role.toUpperCase() : null;
    if (!normalizedRole || !VALID_ROLES.includes(normalizedRole)) {
      throw new BadRequestError(
        `Invalid role: "${role}". Allowed roles: ${VALID_ROLES.join(', ')}`,
      );
    }

    if (!Array.isArray(authorities)) {
      throw new BadRequestError('Authorities must be an array of strings');
    }

    const updated = await authorityService.updateRoleAuthorities(
      normalizedRole,
      authorities,
      description,
    );

    logger.info(
      { adminId: req.user.id, role: normalizedRole, authorities },
      'Role authorities updated dynamically in database',
    );

    res.json({
      success: true,
      data: {
        role: updated.role,
        authorities: updated.authorities,
        description: updated.description,
      },
    });
  } catch (err) {
    next(err);
  }
}
