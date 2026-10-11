import { z } from 'zod';
import prisma from '../config/database.js';
import { NotFoundError, BadRequestError } from '../utils/AppError.js';
import logger from '../utils/logger.js';

export const ProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
  clubSlug: z.string().optional().nullable(),
  clubId: z.string().optional().nullable(),
  price: z.union([z.number(), z.string()]).optional(),
  memberPrice: z.union([z.number(), z.string()]).optional(),
  stock: z.union([z.number(), z.string()]).optional(),
  category: z.string().optional().nullable(),
});

class ProductService {
  /**
   * Create a new product (e.g. "Club T-Shirt" or "Summit Hoodie").
   */
  async createProduct(data, variants = []) {
    const parsed = ProductSchema.parse(data);

    // Resolve club
    let club = null;
    if (parsed.clubId) {
      club = await prisma.club.findUnique({ where: { id: parsed.clubId } });
    }
    if (!club && parsed.clubSlug) {
      club = await prisma.club.findUnique({ where: { slug: parsed.clubSlug } });
    }
    if (!club) {
      club = await prisma.club.findFirst({ where: { isActive: true } });
    }
    if (!club) {
      club = await prisma.club.findFirst();
    }
    if (!club) {
      throw new NotFoundError('No club available to attach merchandise to');
    }

    // Default image if missing or empty
    const imageUrl =
      parsed.imageUrl && parsed.imageUrl.trim() !== ''
        ? parsed.imageUrl.trim()
        : 'https://images.unsplash.com/photo-1610582144787-eda2e6f293b4?q=80&w=1200&auto=format&fit=crop';

    // Prepare variants
    const basePriceNum = Number(data.price) || 500;
    const memberPriceNum = Number(data.memberPrice) || Math.round(basePriceNum * 0.85);
    const baseStockNum = Number(data.stock) || 20;

    let variantsToCreate = [];
    const slugPrefix = parsed.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 15);

    if (Array.isArray(variants) && variants.length > 0) {
      variantsToCreate = variants.map((v, i) => {
        const pInPaise =
          v.priceInPaise ?? Math.round((Number(v.price) || basePriceNum) * 100);
        const mpInPaise =
          v.memberPriceInPaise ??
          Math.round((Number(v.memberPrice) || memberPriceNum) * 100);
        const varName = v.name || v.label || `Variant ${i + 1}`;
        const skuSafe = (varName || 'var').toLowerCase().replace(/[^a-z0-9]/g, '-');
        return {
          name: varName,
          sku:
            v.sku ||
            `${slugPrefix}-${skuSafe}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          priceInPaise: pInPaise,
          memberPriceInPaise: mpInPaise,
          stock: Number(v.stock) || 0,
          lowStockThreshold: Number(v.lowStockThreshold) || 5,
        };
      });
    } else if (Array.isArray(data.sizes) && data.sizes.length > 0) {
      variantsToCreate = data.sizes.map((s) => {
        const sizeName = s.label || s.name || 'Standard';
        const skuSafe = sizeName.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return {
          name: sizeName,
          sku:
            s.sku ||
            `${slugPrefix}-${skuSafe}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          priceInPaise: Math.round(basePriceNum * 100),
          memberPriceInPaise: Math.round(memberPriceNum * 100),
          stock: Number(s.stock) || 10,
          lowStockThreshold: 5,
        };
      });
    } else {
      variantsToCreate = [
        {
          name: 'Standard',
          sku: `${slugPrefix}-std-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          priceInPaise: Math.round(basePriceNum * 100),
          memberPriceInPaise: Math.round(memberPriceNum * 100),
          stock: baseStockNum,
          lowStockThreshold: 5,
        },
      ];
    }

    const product = await prisma.product.create({
      data: {
        clubId: club.id,
        name: parsed.name,
        description: parsed.description || null,
        imageUrl,
        isActive: parsed.isActive ?? true,
        variants: {
          create: variantsToCreate,
        },
      },
      include: {
        club: { select: { id: true, name: true, slug: true } },
        variants: true,
      },
    });

    // If initial stock was provided, create STOCK_IN movements
    const variantsWithStock = product.variants.filter((v) => v.stock > 0);
    if (variantsWithStock.length > 0) {
      await prisma.inventoryMovement.createMany({
        data: variantsWithStock.map((v) => ({
          variantId: v.id,
          type: 'STOCK_IN',
          quantity: v.stock,
          reason: 'Initial merchandise landing',
        })),
      });
    }

    logger.info({ productId: product.id }, 'Product created');
    return product;
  }

  /**
   * List all active products and their variants across all clubs (or filtered).
   */
  async listActiveProducts(clubSlug = null, clubId = null) {
    const where = { isActive: true };
    if (clubId) {
      where.clubId = clubId;
    } else if (clubSlug && clubSlug !== 'all') {
      where.club = { slug: clubSlug };
    }
    return prisma.product.findMany({
      where,
      include: {
        club: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Adjust inventory for a variant manually (e.g. receiving new shipment).
   */
  async adjustInventory(variantId, quantity, type = 'STOCK_IN', reason = '') {
    return prisma.$transaction(async (tx) => {
      const variant = await tx.productVariant.findUnique({
        where: { id: variantId },
      });

      if (!variant) throw new NotFoundError('Variant not found');

      let newStock = variant.stock;
      if (['STOCK_IN', 'RETURN'].includes(type)) {
        newStock += quantity;
      } else if (['STOCK_OUT', 'SALE'].includes(type)) {
        newStock -= quantity;
      } else if (type === 'ADJUSTMENT') {
        newStock = quantity; // Absolute set
      }

      if (newStock < 0) {
        throw new BadRequestError('Cannot adjust stock below zero');
      }

      await tx.productVariant.update({
        where: { id: variantId },
        data: { stock: newStock },
      });

      const movement = await tx.inventoryMovement.create({
        data: {
          variantId,
          type,
          quantity,
          reason,
        },
      });

      logger.info({ variantId, type, quantity }, 'Inventory adjusted');
      return movement;
    });
  }

  /**
   * Update product details, pricing, and variant stocks.
   */
  async updateProduct(id, data) {
    return prisma.$transaction(async (tx) => {
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.imageUrl !== undefined && data.imageUrl !== '') updateData.imageUrl = data.imageUrl;
      if (data.isActive !== undefined) updateData.isActive = Boolean(data.isActive);
      if (data.clubId !== undefined) updateData.clubId = data.clubId;

      const product = await tx.product.update({
        where: { id },
        data: updateData,
        include: {
          variants: true,
          club: { select: { id: true, name: true, slug: true } },
        },
      });

      const priceInPaise =
        data.price !== undefined ? Math.round(Number(data.price) * 100) : undefined;
      const memberPriceInPaise =
        data.memberPrice !== undefined ? Math.round(Number(data.memberPrice) * 100) : undefined;

      // Update variant prices if price or memberPrice was updated
      if (priceInPaise !== undefined || memberPriceInPaise !== undefined) {
        const variantUpdate = {};
        if (priceInPaise !== undefined && !isNaN(priceInPaise)) {
          variantUpdate.priceInPaise = priceInPaise;
        }
        if (memberPriceInPaise !== undefined && !isNaN(memberPriceInPaise)) {
          variantUpdate.memberPriceInPaise = memberPriceInPaise;
        }
        if (Object.keys(variantUpdate).length > 0) {
          await tx.productVariant.updateMany({
            where: { productId: id },
            data: variantUpdate,
          });
        }
      }

      // Update standard stock if provided
      if (data.standardStock !== undefined) {
        const stockVal = Number(data.standardStock);
        if (!isNaN(stockVal)) {
          const stdVariant = product.variants.find((v) =>
            ['standard', 'default', 'one size'].includes(v.name.toLowerCase()),
          ) || product.variants[0];
          if (stdVariant) {
            await tx.productVariant.update({
              where: { id: stdVariant.id },
              data: { stock: stockVal },
            });
          }
        }
      }

      // Update size variant stocks if provided
      if (data.sizesStock && typeof data.sizesStock === 'object') {
        for (const [sizeName, stockVal] of Object.entries(data.sizesStock)) {
          const numStock = Number(stockVal);
          if (!isNaN(numStock)) {
            const matchingVar = product.variants.find(
              (v) => v.name.toLowerCase() === sizeName.toLowerCase(),
            );
            if (matchingVar) {
              await tx.productVariant.update({
                where: { id: matchingVar.id },
                data: { stock: numStock },
              });
            }
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: {
          club: { select: { id: true, name: true, slug: true } },
          variants: true,
        },
      });
    });
  }

  /**
   * Delete a product and its associated variants and movements via database cascade.
   */
  async deleteProduct(id) {
    return prisma.product.delete({
      where: { id },
    });
  }
}

export const productService = new ProductService();

