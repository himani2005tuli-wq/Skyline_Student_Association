import { ticketService } from '../services/ticket.service.js';

export async function bookTickets(req, res, next) {
  try {
    const { eventId, ticketTypeId, quantity, pointsToRedeem } = req.body;

    const { booking, pricing } = await ticketService.bookTickets(
      req.user.id,
      eventId,
      ticketTypeId,
      quantity,
      pointsToRedeem,
    );

    res.status(201).json({
      success: true,
      data: {
        booking,
        pricing,
        message: 'Proceed to payment gateway',
        checkoutUrl: 'https://mock.gateway/checkout',
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function simulatePaymentWebhook(req, res, next) {
  try {
    const { bookingId } = req.body;
    // In production, this would be a secure webhook from Stripe/Razorpay.
    const booking = await ticketService.activateBooking(bookingId);

    res.json({
      success: true,
      data: { booking },
    });
  } catch (err) {
    next(err);
  }
}

export async function getMyTickets(req, res, next) {
  try {
    const tickets = await ticketService.getUserTickets(req.user.id);
    res.json({
      success: true,
      data: { tickets },
    });
  } catch (err) {
    next(err);
  }
}
