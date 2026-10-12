import prisma from '../config/database.js';
import { pricingService } from './pricing.service.js';
import { BadRequestError, NotFoundError, ConflictError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

class OrderService {
  /**
   * Create an order from a cart of variants.
   * Decrements stock immediately (reserves it) to prevent overselling.
   */
  async createOrder(userId, items, pointsToRedeem = 0) {
    if (!items || items.length === 0) throw new BadRequestError('Cart is empty');

    return prisma.$transaction(async (tx) => {
      let rawTotalInPaise = 0;
      const orderItemsData = [];

      // Sort items by variantId to avoid deadlocks when locking rows
      const sortedItems = [...items].sort((a, b) => a.variantId.localeCompare(b.variantId));

      for (const item of sortedItems) {
        // Lock the variant
        const [variant] = await tx.$queryRaw`
          SELECT id, "priceInPaise", "memberPriceInPaise", stock 
          FROM "ProductVariant" 
          WHERE id = ${item.variantId} 
          FOR UPDATE
        `;

        if (!variant) throw new NotFoundError(`Variant ${item.variantId} not found`);

        if (variant.stock < item.quantity) {
          throw new ConflictError(`Not enough stock for variant ${item.variantId}`);
        }

        // Deduct stock (Reservation)
        await tx.$executeRaw`
          UPDATE "ProductVariant"
          SET stock = stock - ${item.quantity}, "updatedAt" = NOW()
          WHERE id = ${variant.id}
        `;

        // Log reservation
        await tx.inventoryMovement.create({
          data: {
            variantId: variant.id,
            type: 'RESERVATION',
            quantity: item.quantity,
            reason: 'Order placed pending payment',
          },
        });

        const itemTotal = variant.priceInPaise * item.quantity;
        rawTotalInPaise += itemTotal;

        orderItemsData.push({
          variantId: variant.id,
          quantity: item.quantity,
          unitPriceInPaise: variant.priceInPaise,
          totalInPaise: itemTotal,
        });
      }

      // Determine clubSlug for localized discounts if applicable
      let clubSlug = null;
      if (sortedItems.length > 0) {
        const vWithClub = await tx.productVariant.findUnique({
          where: { id: sortedItems[0].variantId },
          include: { product: { include: { club: { select: { slug: true } } } } },
        });
        clubSlug = vWithClub?.product?.club?.slug || null;
      }

      // Calculate total pricing using pricing engine (merch usually eligible for member discounts)
      const pricing = await pricingService.calculatePriceBreakdown(
        userId,
        rawTotalInPaise,
        true, // eligible for discount
        pointsToRedeem,
        clubSlug,
      );

      // Create the order
      const order = await tx.order.create({
        data: {
          userId,
          status: 'PENDING_PAYMENT',
          totalInPaise: pricing.finalAmountInPaise,
          discountInPaise: pricing.discountAmountInPaise,
          pointsRedeemed: pricing.pointsRedeemed,
          items: {
            create: orderItemsData,
          },
        },
        include: { items: true },
      });

      return { order, pricing };
    });
  }

  /**
   * Finalize order upon successful payment.
   */
  async confirmOrder(orderId) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new NotFoundError('Order not found');
      if (order.status === 'PAID' || order.status === 'PROCESSING') return order;
      if (order.status !== 'PENDING_PAYMENT') {
        throw new BadRequestError(`Cannot confirm order in status ${order.status}`);
      }

      // Convert RESERVATION movements to SALE movements (auditing purposes)
      for (const item of order.items) {
        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            type: 'SALE',
            quantity: item.quantity,
            reason: `Order ${orderId} confirmed`,
            reference: orderId,
          },
        });
      }

      const updated = await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      logger.info({ orderId }, 'Order confirmed and paid');
      return updated;
    });
  }

  /**
   * Cancel an order and release reserved stock.
   */
  async cancelOrder(orderId) {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!order) throw new NotFoundError('Order not found');
      if (order.status === 'CANCELLED') return order;

      // We only allow automated cancelling of pending orders (abandoned carts)
      if (order.status !== 'PENDING_PAYMENT') {
        throw new BadRequestError('Only pending orders can be cancelled automatically');
      }

      // Return stock
      for (const item of order.items) {
        await tx.$executeRaw`
          UPDATE "ProductVariant"
          SET stock = stock + ${item.quantity}, "updatedAt" = NOW()
          WHERE id = ${item.variantId}
        `;

        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            type: 'RESERVATION_RELEASE',
            quantity: item.quantity,
            reason: `Order ${orderId} cancelled`,
            reference: orderId,
          },
        });
      }

      const cancelled = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      logger.info({ orderId }, 'Order cancelled, stock released');
      return cancelled;
    });
  }

  /**
   * Get all orders placed by a user.
   */
  async getUserOrders(userId) {
    return prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export const orderService = new OrderService();
