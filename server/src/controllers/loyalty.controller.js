import { loyaltyService } from '../services/loyalty.service.js';

export async function getMyBalance(req, res, next) {
  try {
    const account = await loyaltyService.getBalance(req.user.id);
    res.json({ success: true, data: { account } });
  } catch (err) {
    next(err);
  }
}

export async function simulateEarn(req, res, next) {
  try {
    const { points, referenceType, referenceId, idempotencyKey } = req.body;
    // SECURITY: In production, earning points should be an internal microservice call triggered by payment webhooks, not a public REST endpoint.
    // For Phase 3 demonstration, this is exposed to Admins or for testing.

    const transaction = await loyaltyService.earnPoints(
      req.user.id,
      points,
      referenceType || 'SIMULATION',
      referenceId || 'N/A',
      idempotencyKey,
    );

    res.json({ success: true, data: { transaction } });
  } catch (err) {
    next(err);
  }
}
