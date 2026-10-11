import { http } from './client';

export const productsApi = {
  async list(clubSlug) {
    const res = await http.get('/products', {
      params: clubSlug ? { clubSlug } : {},
    });
    const products = res.data?.data?.products || [];
    return products.map((p) => {
      const variants = p.variants || [];
      const defaultVariant = variants[0] || {};
      const price = (defaultVariant.priceInPaise || 0) / 100;
      const memberPrice = defaultVariant.memberPriceInPaise
        ? defaultVariant.memberPriceInPaise / 100
        : price;
      const totalStock = variants.reduce((sum, v) => sum + (v.stock || 0), 0);

      return {
        id: p.id,
        clubId: p.clubId,
        club: p.club,
        name: p.name,
        category: p.category || 'Apparel',
        price,
        memberPrice,
        image:
          p.imageUrl ||
          'https://images.unsplash.com/photo-1610582144787-eda2e6f293b4?q=80&w=1600&auto=format&fit=crop',
        desc: p.description || '',
        stock: totalStock,
        sizes:
          variants.length > 0
            ? variants.map((v) => ({
                label: v.name || 'Standard',
                stock: v.stock || 0,
                variantId: v.id,
                price: (v.priceInPaise || 0) / 100,
                memberPrice: (v.memberPriceInPaise || v.priceInPaise || 0) / 100,
              }))
            : [{ label: 'Standard', stock: 10, variantId: p.id, price, memberPrice }],
        variants: variants.map((v) => ({
          id: v.id,
          size: v.name || 'Standard',
          stock: v.stock || 0,
          sku: v.sku,
          price: (v.priceInPaise || 0) / 100,
        })),
      };
    });
  },

  async create(payload) {
    const res = await http.post('/products', payload);
    return res.data?.data?.product;
  },

  async update(id, payload) {
    const res = await http.put(`/products/${id}`, payload);
    return res.data?.data?.product;
  },

  async delete(id) {
    const res = await http.delete(`/products/${id}`);
    return res.data?.data;
  },

  async adjustInventory(variantId, delta) {
    const res = await http.post(`/products/variants/${variantId}/adjust`, { delta });
    return res.data?.data?.movement;
  },
};

export default productsApi;

