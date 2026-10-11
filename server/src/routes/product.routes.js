import { Router } from 'express';
import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustInventory,
} from '../controllers/product.controller.js';
import { requireAuth, requireRoles, optionalAuth } from '../middleware/auth.js';
import { csrfSynchronisedProtection } from '../middleware/csrf.js';

import { cacheMiddleware, invalidateCache } from '../utils/cache.js';

import { uploadMerchandiseImage } from '../middleware/upload.js';

const router = Router();

// Public routes (cached in Redis / memory for <3ms response time, auth-aware)
router.get('/', optionalAuth, cacheMiddleware('products', 120), listProducts);

// Image upload route (admin only)
router.post(
  '/upload',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'TREASURER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  uploadMerchandiseImage.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'No image file uploaded' },
      });
    }
    const relativeUrl = `/uploads/merchandise/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        url: relativeUrl,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  },
);

// Admin routes (invalidates product cache on update)
router.post(
  '/',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'TREASURER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('products');
    next();
  },
  createProduct,
);
router.put(
  '/:id',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'TREASURER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('products');
    next();
  },
  updateProduct,
);
router.patch(
  '/:id',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'TREASURER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('products');
    next();
  },
  updateProduct,
);
router.delete(
  '/:id',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'TREASURER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('products');
    next();
  },
  deleteProduct,
);
router.post(
  '/variants/:variantId/adjust',
  requireAuth,
  requireRoles(['CLUB_ADMIN', 'TREASURER', 'SUPER_ADMIN']),
  csrfSynchronisedProtection,
  async (req, res, next) => {
    await invalidateCache('products');
    next();
  },
  adjustInventory,
);

export default router;

