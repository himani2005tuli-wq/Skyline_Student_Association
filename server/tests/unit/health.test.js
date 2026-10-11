import { describe, it, expect } from 'vitest';

describe('Health Check Unit', () => {
  it('should export getHealth and getDetailedHealth functions', async () => {
    // Dynamic import to avoid config loading issues in isolated unit tests
    const mod = await import('../../src/controllers/health.controller.js');
    expect(typeof mod.getHealth).toBe('function');
    expect(typeof mod.getDetailedHealth).toBe('function');
  });
});
