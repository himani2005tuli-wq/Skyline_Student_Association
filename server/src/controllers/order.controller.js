import { orderService } from '../services/order.service.js';

export async function createOrder(req, res, next) {
  try {
    const { items, pointsToRedeem } = req.body;

    const { order, pricing } = await orderService.createOrder(req.user.id, items, pointsToRedeem);

    res.status(201).json({
      success: true,
      data: {
        order,
        pricing,
        message: 'Proceed to payment gateway',
        checkoutUrl: 'https://mock.gateway/checkout',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function simulateOrderPaymentWebhook(req, res, next) {
  try {
    const { orderId } = req.body;
    // In production, this would be a secure webhook from Stripe/Razorpay.
    const order = await orderService.confirmOrder(orderId);

    res.json({
      success: true,
      data: { order },
    });
  } catch (err) {
    next(err);
  }
}

export async function cancelOrder(req, res, next) {
  try {
    const { orderId } = req.body;
    const order = await orderService.cancelOrder(orderId);

    res.json({
      success: true,
      data: { order },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyOrders(req, res, next) {
  try {
    const orders = await orderService.getUserOrders(req.user.id);
    res.json({
      success: true,
      data: { orders },
    });
  } catch (err) {
    next(err);
  }
}
