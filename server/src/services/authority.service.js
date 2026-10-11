import prisma from '../config/database.js';
import logger from '../utils/logger.js';
import { invalidateCache } from '../utils/cache.js';

// Default system authority definitions (14 modules)
export const SYSTEM_AUTHORITIES = [
  // 1. Authentication
  { id: 'auth:profile:view', name: 'View Profile', category: 'Authentication', description: 'View own profile and session' },
  { id: 'auth:profile:update', name: 'Update Profile', category: 'Authentication', description: 'Update own details and preferences' },
  { id: 'auth:users:manage', name: 'Manage Users & Roles', category: 'Authentication', description: 'Manage user accounts, roles, and status' },
  // 2. Clubs
  { id: 'clubs:view', name: 'View Clubs', category: 'Clubs', description: 'View club directory and info' },
  { id: 'clubs:manage', name: 'Manage Club Operations', category: 'Clubs', description: 'Manage club profile, settings, and branding' },
  { id: 'clubs:create', name: 'Create Clubs', category: 'Clubs', description: 'Create new clubs on the platform' },
  // 3. Memberships
  { id: 'memberships:view', name: 'View Memberships', category: 'Memberships', description: 'View membership plans and status' },
  { id: 'memberships:purchase', name: 'Purchase Membership', category: 'Memberships', description: 'Subscribe and renew membership' },
  { id: 'memberships:manage', name: 'Manage Memberships', category: 'Memberships', description: 'Create and edit membership plans, fees, and benefits' },
  // 4. Events
  { id: 'events:view', name: 'View Events', category: 'Events', description: 'Browse upcoming and public events' },
  { id: 'events:manage', name: 'Manage Events', category: 'Events', description: 'Create, update, reschedule, and publish events' },
  // 5. Ticketing
  { id: 'tickets:book', name: 'Book Tickets', category: 'Ticketing', description: 'Reserve and purchase event tickets' },
  { id: 'tickets:manage', name: 'Manage Tickets', category: 'Ticketing', description: 'Configure ticket tiers, capacities, and sales windows' },
  { id: 'tickets:checkin', name: 'Check-in Tickets', category: 'Ticketing', description: 'Scan QR codes and validate entry at door' },
  // 6. Merchandise
  { id: 'products:view', name: 'View Products', category: 'Merchandise', description: 'Browse merchandise catalog' },
  { id: 'products:manage', name: 'Manage Products', category: 'Merchandise', description: 'Add/update products, inventory, and stock variants' },
  { id: 'orders:create', name: 'Create Orders', category: 'Merchandise', description: 'Order merchandise through the store' },
  { id: 'orders:manage', name: 'Manage Orders', category: 'Merchandise', description: 'Fulfill, pack, cancel, and inspect customer orders' },
  // 7. Loyalty
  { id: 'loyalty:view', name: 'View Loyalty', category: 'Loyalty', description: 'View points balance and history' },
  { id: 'loyalty:manage', name: 'Manage Loyalty', category: 'Loyalty', description: 'Adjust point balances and define earn/burn rules' },
  // 8. Fundraisers
  { id: 'fundraisers:view', name: 'View Fundraisers', category: 'Fundraisers', description: 'View fundraising campaigns' },
  { id: 'fundraisers:manage', name: 'Manage Fundraisers', category: 'Fundraisers', description: 'Create and run fundraising campaigns and goals' },
  // 9. Volunteers
  { id: 'volunteers:tasks:view', name: 'View Volunteer Tasks', category: 'Volunteers', description: 'View assigned volunteer shifts and tasks' },
  { id: 'volunteers:tasks:update', name: 'Update Volunteer Tasks', category: 'Volunteers', description: 'Update task progress and log hours' },
  { id: 'volunteers:manage', name: 'Manage Volunteers', category: 'Volunteers', description: 'Recruit and assign volunteers to shifts and tasks' },
  // 10. Payments
  { id: 'payments:process', name: 'Process Payments', category: 'Payments', description: 'Initiate checkout and payments' },
  { id: 'payments:refund', name: 'Issue Refunds', category: 'Payments', description: 'Issue payment refunds and handle cancellations' },
  // 11. Finance
  { id: 'expenses:submit', name: 'Submit Expenses', category: 'Finance', description: 'Submit reimbursement claims' },
  { id: 'expenses:review', name: 'Review Expenses', category: 'Finance', description: 'Approve or reject reimbursement claims' },
  { id: 'expenses:pay', name: 'Pay Expenses', category: 'Finance', description: 'Disburse and mark reimbursement claims as paid' },
  { id: 'ledger:view', name: 'View Ledger', category: 'Finance', description: 'Access full club ledger, inflows, and balance reports' },
  { id: 'finance:reconcile', name: 'Reconcile Finance', category: 'Finance', description: 'Reconcile payouts, accounts, and gateway statements' },
  // 12. Announcements
  { id: 'announcements:view', name: 'View Announcements', category: 'Announcements', description: 'View notifications and public broadcasts' },
  { id: 'announcements:publish', name: 'Publish Announcements', category: 'Announcements', description: 'Broadcast emails and messages to members' },
  // 13. Reports
  { id: 'reports:financial:view', name: 'View Financial Reports', category: 'Reports', description: 'View income, balance sheet, and expense analytics' },
  { id: 'reports:attendance:view', name: 'View Attendance Reports', category: 'Reports', description: 'View event turnouts, scan logs, and demographics' },
  { id: 'reports:export', name: 'Export Reports', category: 'Reports', description: 'Export CSV/PDF audit and compliance reports' },
  // 14. System Administration
  { id: 'system:config:manage', name: 'Manage System Config', category: 'System Administration', description: 'Configure system environment, providers, and cache' },
  { id: 'system:audit:view', name: 'View Audit Trail', category: 'System Administration', description: 'Inspect platform audit trail and security events' },
  { id: '*', name: 'Super Administrator', category: 'System', description: 'Unrestricted wildcard access to all operations' },
];

export const DEFAULT_ROLE_AUTHORITIES = {
  SUPER_ADMIN: ['*'],
  CLUB_ADMIN: [
    '*',
    'clubs:view',
    'clubs:create',
    'clubs:manage',
    'memberships:view',
    'memberships:purchase',
    'memberships:manage',
    'events:view',
    'events:manage',
    'tickets:book',
    'tickets:manage',
    'tickets:checkin',
    'products:view',
    'products:manage',
    'orders:create',
    'orders:manage',
    'announcements:view',
    'announcements:publish',
    'fundraisers:view',
    'fundraisers:manage',
    'volunteers:tasks:view',
    'volunteers:tasks:update',
    'volunteers:manage',
    'expenses:submit',
    'expenses:review',
    'expenses:pay',
    'ledger:view',
    'finance:reconcile',
    'payments:process',
    'payments:refund',
    'loyalty:view',
    'loyalty:manage',
    'reports:attendance:view',
    'reports:financial:view',
    'reports:export',
    'auth:profile:view',
    'auth:profile:update',
    'auth:users:manage',
    'system:config:manage',
    'system:audit:view',
  ],
  TREASURER: [
    'finance:reconcile',
    'ledger:view',
    'expenses:review',
    'expenses:pay',
    'expenses:submit',
    'payments:refund',
    'orders:manage',
    'reports:financial:view',
    'reports:export',
  ],
  EVENT_MANAGER: [
    'events:manage',
    'tickets:manage',
    'tickets:checkin',
    'fundraisers:manage',
    'volunteers:manage',
    'volunteers:tasks:update',
    'announcements:publish',
    'expenses:submit',
    'reports:attendance:view',
  ],
  VOLUNTEER: [
    'tickets:checkin',
    'volunteers:tasks:update',
    'expenses:submit',
  ],
  MEMBER: [
    'auth:profile:view',
    'auth:profile:update',
    'clubs:view',
    'memberships:view',
    'memberships:purchase',
    'events:view',
    'tickets:book',
    'products:view',
    'orders:create',
    'loyalty:view',
    'announcements:view',
    'fundraisers:view',
    'volunteers:tasks:view',
    'payments:process',
    'expenses:submit',
  ],
};

// In-memory cache for role authorities (TTL 60s)
let roleAuthorityCache = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60000;

export const authorityService = {
  /**
   * Initialize and seed default role authorities in DB if not present
   */
  async ensureRoleAuthorities() {
    try {
      for (const [role, authorities] of Object.entries(DEFAULT_ROLE_AUTHORITIES)) {
        await prisma.roleAuthority.upsert({
          where: { role },
          update: { authorities },
          create: {
            role,
            authorities,
            description: `Default system authorities for ${role}`,
          },
        });
      }
      this.invalidateCache();
      logger.info('✅ Dynamic role authorities initialized in database');
    } catch (err) {
      logger.warn({ err: err.message }, 'Could not ensure role authorities in database');
    }
  },

  invalidateCache() {
    roleAuthorityCache = null;
    cacheTimestamp = 0;
  },

  /**
   * Fetch all role authorities mapping from DB with caching
   */
  async getAllRoleAuthorities() {
    const now = Date.now();
    if (roleAuthorityCache && now - cacheTimestamp < CACHE_TTL_MS) {
      return roleAuthorityCache;
    }

    const records = await prisma.roleAuthority.findMany();
    const map = {};
    for (const r of records) {
      map[r.role] = r.authorities;
    }

    // Fallback for any unseeded roles
    for (const [role, auths] of Object.entries(DEFAULT_ROLE_AUTHORITIES)) {
      if (!map[role]) map[role] = auths;
    }

    roleAuthorityCache = map;
    cacheTimestamp = now;
    return map;
  },

  /**
   * Compute dynamic authorities for a specific user
   * Combines: Role authorities (from DB) + Granular UserAuthority overrides (from DB)
   */
  async getUserEffectiveAuthorities(userId, role) {
    const [roleMap, userAuthRecords] = await Promise.all([
      this.getAllRoleAuthorities(),
      userId
        ? prisma.userAuthority.findMany({
            where: { userId },
            select: { authority: true },
          })
        : [],
    ]);

    const roleAuthorities = roleMap[role] || DEFAULT_ROLE_AUTHORITIES[role] || [];
    const directAuthorities = userAuthRecords.map((a) => a.authority);

    return Array.from(new Set([...roleAuthorities, ...directAuthorities]));
  },

  /**
   * Check if a set of authorities satisfies a required authority
   */
  hasAuthority(userAuthorities = [], requiredAuthority) {
    if (!requiredAuthority) return true;
    if (userAuthorities.includes('*')) return true;
    if (userAuthorities.includes(requiredAuthority)) return true;

    // Support domain wildcards, e.g. "events:*" matches "events:manage"
    const [domain] = requiredAuthority.split(':');
    if (domain && userAuthorities.includes(`${domain}:*`)) return true;

    return false;
  },

  /**
   * Check if user has ANY of the specified authorities
   */
  hasAnyAuthority(userAuthorities = [], requiredList = []) {
    if (userAuthorities.includes('*')) return true;
    return requiredList.some((auth) => this.hasAuthority(userAuthorities, auth));
  },

  /**
   * Update authorities for a role dynamically in DB
   */
  async updateRoleAuthorities(role, authorities, description) {
    const result = await prisma.roleAuthority.upsert({
      where: { role },
      update: {
        authorities,
        ...(description ? { description } : {}),
      },
      create: {
        role,
        authorities,
        description: description || `Custom authorities for ${role}`,
      },
    });
    this.invalidateCache();
    return result;
  },

  /**
   * Grant a specific dynamic authority to a user in DB
   */
  async grantUserAuthority(userId, authority) {
    const record = await prisma.userAuthority.upsert({
      where: {
        userId_authority: { userId, authority },
      },
      update: {},
      create: { userId, authority },
    });
    await invalidateCache(`user:profile:${userId}`);
    return record;
  },

  /**
   * Revoke a specific dynamic authority from a user in DB
   */
  async revokeUserAuthority(userId, authority) {
    const res = await prisma.userAuthority.deleteMany({
      where: { userId, authority },
    });
    await invalidateCache(`user:profile:${userId}`);
    return res;
  },

  /**
   * Change user role in DB
   */
  async updateUserRole(userId, newRole) {
    const res = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });
    await invalidateCache(`user:profile:${userId}`);
    return res;
  },
};

export default authorityService;
