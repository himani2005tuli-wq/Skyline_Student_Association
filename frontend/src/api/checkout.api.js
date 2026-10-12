import ticketsApi from './tickets.api';
import membershipsApi from './memberships.api';
import ordersApi from './orders.api';
import paymentsApi from './payments.api';

export function quote({ kind, price = 0, qty = 1 }, user, redeemPoints) {
  const original = Math.round(price * qty);
  const isMember = (user?.role || '').toLowerCase() === 'member' || Boolean(user?.hasActiveMembership) || Boolean(user?.memberships?.length);
  // Membership plans are not eligible for member discount
  const memberPct = kind === 'plan' ? 0 : (isMember ? 15 : 0);
  const memberDiscount = Math.round((original * memberPct) / 100);
  const afterMember = original - memberDiscount;
  const points = user?.points || 0;
  const maxRedeemable = afterMember > 0 ? Math.min(Math.floor(afterMember * 0.3), points) : 0;
  const pointsRedeemed = redeemPoints ? maxRedeemable : 0;
  const final = Math.max(afterMember - pointsRedeemed, 0);
  const pointsToEarn = final > 0 ? Math.floor(final / 10) : 0;

  return {
    original,
    memberDiscount,
    memberPct,
    pointsRedeemed,
    maxRedeemable,
    final,
    pointsToEarn,
    pointsBalance: points,
  };
}

function ensureRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout SDK'));
    document.body.appendChild(script);
  });
}

export const checkoutApi = {
  async pay({ kind, redeem, ...payload }, user) {
    const breakdown = quote({ kind, ...payload, redeem }, user, redeem);

    // Prepare createOrder request for the backend
    let orderPayload = { kind, pointsToRedeem: breakdown.pointsRedeemed };

    if (kind === 'ticket') {
      orderPayload = {
        ...orderPayload,
        eventId: payload.eventId,
        ticketTypeId: payload.typeId || payload.ticketTypeId,
        quantity: payload.qty || 1,
      };
    } else if (kind === 'plan') {
      orderPayload = {
        ...orderPayload,
        planId: payload.planId,
      };
    } else if (kind === 'merch') {
      const items =
        Array.isArray(payload.items) && payload.items.length > 0
          ? payload.items.map((it) => ({
              variantId: it.variantId || it.productId,
              quantity: it.qty || 1,
            }))
          : [
              {
                variantId: payload.variantId || payload.productId,
                quantity: payload.qty || 1,
              },
            ];
      orderPayload = {
        ...orderPayload,
        items,
      };
    }

    // Call server to initialize order
    const orderData = await paymentsApi.createOrder(orderPayload);

    // Case 1: Zero payable (free ticket / 100% points coverage)
    if (orderData?.free) {
      return {
        ref: orderData.refId || `FREE-${Date.now()}`,
        breakdown: orderData.breakdown || breakdown,
        paidAt: new Date().toISOString(),
      };
    }


    // Case 3: Mock mode fallback (when Razorpay is disabled or in unit tests)
    if (orderData?.mock) {
      if (kind === 'ticket') {
        await paymentsApi.mockConfirm({ bookingId: orderData.refId });
      } else if (kind === 'merch') {
        await paymentsApi.mockConfirm({ orderId: orderData.refId });
      } else if (kind === 'plan') {
        await paymentsApi.mockConfirm({ membershipId: orderData.refId });
      }
      return {
        ref: orderData.refId || `MOCK-${Date.now()}`,
        breakdown: orderData.breakdown || breakdown,
        paidAt: new Date().toISOString(),
      };
    }

    // Case 4: Official Razorpay Checkout flow
    if (orderData?.orderId && orderData?.keyId) {
      await ensureRazorpayScript();

      return new Promise((resolve, reject) => {
        let isHandled = false;
        const title =
          kind === 'plan'
            ? 'Club Membership Subscription'
            : kind === 'ticket'
              ? 'Event Ticket Booking'
              : 'Merchandise Order';

        const options = {
          key: orderData.keyId,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'Skyline Student Association',
          description: title,
          image: '/favicon.svg',
          order_id: orderData.orderId,
          prefill: {
            name: user?.name || user?.fullName || '',
            email: user?.email || '',
            contact: user?.phone || '',
          },
          theme: {
            color: '#0B0E17',
          },
          modal: {
            ondismiss: () => {
              if (isHandled) return;
              const cancelErr = new Error('Payment cancelled');
              cancelErr.friendly = 'Payment was cancelled. You have not been charged.';
              reject(cancelErr);
            },
            escape: true,
            backdropclose: false,
          },
          handler: async (response) => {
            isHandled = true;
            try {
              const verifyRes = await paymentsApi.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                kind,
                refId: orderData.refId,
              });

              resolve({
                ref: verifyRes?.ref || orderData.refId,
                breakdown: orderData.breakdown || breakdown,
                paidAt: verifyRes?.paidAt || new Date().toISOString(),
              });
            } catch (err) {
              reject(err);
            }
          },
        };

        try {
          const rzp = new window.Razorpay(options);
          rzp.on('payment.failed', function (errResp) {
            const failErr = new Error(errResp?.error?.description || 'Payment failed');
            failErr.friendly = errResp?.error?.description || 'Payment transaction failed.';
            reject(failErr);
          });
          rzp.open();
        } catch (err) {
          reject(err);
        }
      });
    }

    // Ultimate fallback if response structure was unexpected
    return { ref: `TX-${Date.now()}`, breakdown, paidAt: new Date().toISOString() };
  },

  pointsAfterPayment(user, breakdown) {
    return (user?.points || 0) + (breakdown?.pointsToEarn || 0) - (breakdown?.pointsRedeemed || 0);
  },

  async beginPlan(planId) {
    return { ok: true, planId };
  },
};

export default checkoutApi;
