import { describe, it, expect } from 'vitest';
import authorityService, {
  SYSTEM_AUTHORITIES,
  DEFAULT_ROLE_AUTHORITIES,
} from '../../server/src/services/authority.service.js';

describe('Dynamic Role & Authority Service', () => {
  it('defines standard system authorities and default roles', () => {
    expect(SYSTEM_AUTHORITIES.length).toBeGreaterThan(5);
    expect(DEFAULT_ROLE_AUTHORITIES.SUPER_ADMIN).toContain('*');
    expect(DEFAULT_ROLE_AUTHORITIES.CLUB_ADMIN).toContain('events:manage');
    expect(DEFAULT_ROLE_AUTHORITIES.TREASURER).toContain('ledger:view');
    expect(DEFAULT_ROLE_AUTHORITIES.VOLUNTEER).toContain('tickets:checkin');
  });

  it('matches wildcards correctly', () => {
    // Super admin wildcard
    expect(authorityService.hasAuthority(['*'], 'ledger:view')).toBe(true);
    expect(authorityService.hasAuthority(['*'], 'events:manage')).toBe(true);
    expect(authorityService.hasAuthority(['*'], 'anything:random')).toBe(true);

    // Domain wildcard
    expect(authorityService.hasAuthority(['events:*'], 'events:manage')).toBe(true);
    expect(authorityService.hasAuthority(['events:*'], 'events:delete')).toBe(true);
    expect(authorityService.hasAuthority(['events:*'], 'ledger:view')).toBe(false);

    // Exact match
    expect(authorityService.hasAuthority(['ledger:view'], 'ledger:view')).toBe(true);
    expect(authorityService.hasAuthority(['ledger:view'], 'ledger:edit')).toBe(false);
  });

  it('matches any authority in a list', () => {
    const userAuths = ['events:manage', 'tickets:checkin'];
    expect(authorityService.hasAnyAuthority(userAuths, ['ledger:view', 'events:manage'])).toBe(
      true,
    );
    expect(authorityService.hasAnyAuthority(userAuths, ['ledger:view', 'expenses:pay'])).toBe(
      false,
    );
  });
});
