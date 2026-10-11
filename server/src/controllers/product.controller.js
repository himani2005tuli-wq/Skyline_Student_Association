import { productService } from '../services/product.service.js';
import prisma from '../config/database.js';

export async function listProducts(req, res, next) {
  try {
    let { clubSlug, clubId } = req.query;

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

    if (isClubAdmin && userClubId) {
      clubId = userClubId;
    }

    const products = await productService.listActiveProducts(clubSlug, clubId);
    res.json({ success: true, data: { products } });
  } catch (err) {
    next(err);
  }
}

export async function createProduct(req, res, next) {
  try {
    const { variants, ...productData } = req.body;
    let targetClubId = productData.clubId;
    if (req.user?.role === 'CLUB_ADMIN' || req.user?.role === 'ADMIN') {
      targetClubId = req.user.clubId;
      if (!targetClubId) {
        const u = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: {
            clubId: true,
            memberships: {
              where: { status: 'ACTIVE' },
              select: { plan: { select: { clubId: true } } },
              take: 1,
            },
          },
        });
        targetClubId = u?.clubId || u?.memberships?.[0]?.plan?.clubId || null;
      }
      if (targetClubId) {
        productData.clubId = targetClubId;
      }
    }
    const product = await productService.createProduct(productData, variants);
    res.status(201).json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}

export async function updateProduct(req, res, next) {
  try {
    const { id } = req.params;
    const product = await productService.updateProduct(id, req.body);
    res.json({ success: true, data: { product } });
  } catch (err) {
    next(err);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    const { id } = req.params;
    await productService.deleteProduct(id);
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
}

export async function adjustInventory(req, res, next) {
  try {
    const { variantId } = req.params;
    let { quantity, type, reason, delta } = req.body;

    // Support frontend sending { delta } instead of { quantity, type }
    if (delta !== undefined && quantity === undefined) {
      quantity = Math.abs(delta);
      type = delta >= 0 ? 'STOCK_IN' : 'STOCK_OUT';
    }

    const movement = await productService.adjustInventory(variantId, quantity, type, reason);
    res.json({ success: true, data: { movement } });
  } catch (err) {
    next(err);
  }
}

