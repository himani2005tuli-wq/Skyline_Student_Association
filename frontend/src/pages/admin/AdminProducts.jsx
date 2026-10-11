import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Save,
  PackageSearch,
  Plus,
  Trash2,
  Tag,
  Building2,
  Sparkles,
  Layers,
  Image as ImageIcon,
} from 'lucide-react';
import { adminApi, productsApi, clubsApi } from '@/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState, DashboardSkeleton } from '@/components/ui/primitives';
import { SmartImage } from '@/components/ui/SmartImage';
import Modal from '@/components/ui/Modal';
import { inr } from '@/lib/format';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';

const PRESET_IMAGES = [
  {
    label: 'Hoodie',
    url: 'https://images.unsplash.com/photo-1610582144787-eda2e6f293b4?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'T-Shirt',
    url: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'Cap',
    url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'Tote Bag',
    url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?q=80&w=1200&auto=format&fit=crop',
  },
  {
    label: 'Bottle',
    url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?q=80&w=1200&auto=format&fit=crop',
  },
];

export default function AdminProducts() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const isSuperAdmin = user?.role === 'super_admin' || user?.rawRole === 'SUPER_ADMIN';

  const { data = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: adminApi.products,
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: clubsApi.list,
  });

  const assignedClubId = user?.clubId || user?.club?.id || (clubs.length > 0 ? clubs[0].id : '');

  const [draft, setDraft] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clubFilter, setClubFilter] = useState('all');

  // Form state for creating a product
  const [form, setForm] = useState({
    name: '',
    clubId: assignedClubId,
    price: 499,
    memberPrice: 399,
    category: 'Apparel',
    description: '',
    imageUrl: PRESET_IMAGES[0].url,
    variantType: 'sizes', // 'sizes' | 'standard'
    standardStock: 30,
    sizesStock: {
      S: 10,
      M: 15,
      L: 15,
      XL: 10,
    },
  });

  const save = async (p, s) => {
    const stock = Number(draft[`${p.id}-${s.label}`] ?? s.stock);
    if (stock < 0 || Number.isNaN(stock)) return;
    const delta = stock - s.stock;
    await productsApi.adjustInventory(s.variantId, delta);
    qc.invalidateQueries({ queryKey: ['products'] });
    toast.success(`${p.name} · ${s.label}: stock set to ${stock}. Storefront updated live.`);
  };

  const handleDelete = async (productId, name) => {
    const ok = await confirm({
      title: 'Delete Product',
      description: `Are you sure you want to delete "${name}"? This will permanently remove all sizes, variants, and inventory tracking.`,
      confirmText: 'Delete Product',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await productsApi.delete(productId);
      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(`"${name}" was deleted from merchandise catalogue.`);
    } catch (err) {
      toast.error(err.friendly || err.response?.data?.error?.message || 'Failed to delete product.');
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }

    setSubmitting(true);
    try {
      let variants = [];
      if (form.variantType === 'sizes') {
        variants = Object.entries(form.sizesStock).map(([size, st]) => ({
          name: size,
          price: Number(form.price),
          memberPrice: Number(form.memberPrice),
          stock: Number(st) || 0,
        }));
      } else {
        variants = [
          {
            name: 'Standard',
            price: Number(form.price),
            memberPrice: Number(form.memberPrice),
            stock: Number(form.standardStock) || 0,
          },
        ];
      }

      await productsApi.create({
        name: form.name.trim(),
        clubId: form.clubId || undefined,
        description: form.description.trim() || undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        category: form.category,
        price: Number(form.price),
        memberPrice: Number(form.memberPrice),
        variants,
      });

      qc.invalidateQueries({ queryKey: ['products'] });
      toast.success(`"${form.name}" was successfully added to merchandise!`);
      setModalOpen(false);

      // Reset form
      setForm({
        name: '',
        clubId: clubs[0]?.id || '',
        price: 499,
        memberPrice: 399,
        category: 'Apparel',
        description: '',
        imageUrl: PRESET_IMAGES[0].url,
        variantType: 'sizes',
        standardStock: 30,
        sizesStock: { S: 10, M: 15, L: 15, XL: 10 },
      });
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to create merchandise';
      toast.error(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  const filteredProducts =
    clubFilter === 'all'
      ? data
      : data.filter((p) => p.clubId === clubFilter || p.club?.slug === clubFilter);

  return (
    <div className="space-y-6" data-testid="admin-products-page">
      {/* Header and Add Button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow text-accent-dark">Commerce</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            Merch & inventory.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink/55">
            Stock lives here, not in anyone's head. The storefront reads it live — members see "only 3
            left" the moment you do.
          </p>
        </div>

        <button
          onClick={() => {
            setForm((prev) => ({
              ...prev,
              clubId: isSuperAdmin ? (form.clubId || clubs[0]?.id || '') : (assignedClubId || clubs[0]?.id || ''),
            }));
            setModalOpen(true);
          }}
          data-testid="add-product-button"
          className="inline-flex items-center gap-2 self-start rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-accent-dark sm:self-center"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Filter by Chapter if clubs exist */}
      {isSuperAdmin && clubs.length > 1 ? (
        <div className="flex items-center gap-3 border-b border-ink/8 pb-4">
          <span className="font-mono text-xs uppercase tracking-wider text-ink/45">
            Chapter:
          </span>
          <select
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
            className="rounded-xl border border-ink/15 bg-paper-card px-3 py-1.5 font-mono text-xs font-semibold text-ink outline-none focus:border-accent"
          >
            <option value="all">All Chapters ({data.length})</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        (clubs[0]?.name || user?.club?.name) && (
          <div className="flex items-center gap-2 border-b border-ink/8 pb-4">
            <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
              Managing Chapter: {clubs[0]?.name || user?.club?.name}
            </span>
          </div>
        )
      )}

      {/* Product List */}
      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={PackageSearch}
          title="No products"
          body="Add your first product to open the store."
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {filteredProducts.map((p) => (
            <Card key={p.id} className="p-5 relative" data-testid={`admin-product-${p.id}`}>
              <div className="flex gap-5">
                <SmartImage
                  src={p.image}
                  alt={p.name}
                  wrapperClassName="h-28 w-28 shrink-0 rounded-2xl"
                  className="h-28 w-28 object-cover"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      {p.club?.name && (
                        <span className="inline-block mb-1 font-mono text-[10px] uppercase tracking-wider text-accent font-semibold">
                          {p.club.name}
                        </span>
                      )}
                      <h2 className="font-display text-xl font-semibold text-ink truncate">
                        {p.name}
                      </h2>
                      <div className="mt-0.5 flex items-baseline gap-2 font-mono text-sm">
                        <span className="font-bold text-ink">{inr(p.price)}</span>
                        {p.memberPrice && p.memberPrice < p.price && (
                          <span className="text-xs text-accent-dark">
                            ({inr(p.memberPrice)} member)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {p.sizes.some((s) => s.stock <= 3) && (
                        <Badge tone="warning">Low stock</Badge>
                      )}
                      <button
                        onClick={() => handleDelete(p.id, p.name)}
                        className="rounded-lg p-1.5 text-ink/30 transition hover:bg-danger/10 hover:text-danger"
                        title="Delete product"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs text-ink/50">{p.desc}</p>
                </div>
              </div>

              {/* Sizes and stock edit */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {p.sizes.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-xl border border-ink/10 bg-white p-3"
                    data-testid={`stock-${p.id}-${s.label.replace(' ', '-')}`}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
                      {s.label}
                    </p>
                    <input
                      type="number"
                      min="0"
                      value={draft[`${p.id}-${s.label}`] ?? s.stock}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [`${p.id}-${s.label}`]: e.target.value }))
                      }
                      aria-label={`${p.name} ${s.label} stock`}
                      data-testid={`stock-input-${p.id}-${s.label.replace(' ', '-')}`}
                      className="mt-1 w-full border-b border-ink/15 bg-transparent pb-1 font-mono text-lg font-bold text-ink outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => save(p, s)}
                      data-testid={`stock-save-${p.id}-${s.label.replace(' ', '-')}`}
                      className="mt-2 flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-dark hover:underline"
                    >
                      <Save size={11} /> Save
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Merchandise Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Merchandise"
        wide
        testid="add-product-modal"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Item Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Skyline Heavyweight Hoodie"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-3 text-sm text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Chapter / Club
              </label>
              {isSuperAdmin ? (
                <select
                  value={form.clubId}
                  onChange={(e) => setForm({ ...form, clubId: e.target.value })}
                  className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-3 text-sm text-ink outline-none focus:border-accent"
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-1.5 flex items-center justify-between rounded-xl border border-accent/20 bg-accent/5 p-3 font-mono text-xs font-semibold text-ink">
                  <span>{clubs[0]?.name || user?.club?.name || 'Assigned Chapter'}</span>
                  <Badge tone="accent">Chapter Merch</Badge>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Regular Price (₹) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-3 text-sm font-bold text-ink outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Member Price (₹)
              </label>
              <input
                type="number"
                min="0"
                value={form.memberPrice}
                onChange={(e) => setForm({ ...form, memberPrice: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-3 text-sm font-bold text-accent-dark outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-3 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="Apparel">Apparel</option>
                <option value="Accessories">Accessories</option>
                <option value="Stationery">Stationery</option>
                <option value="Collectibles">Collectibles</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
              Description
            </label>
            <textarea
              rows={2}
              placeholder="Comfortable 100% organic cotton fleece with embroidered chapter insignia."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          {/* Image URL with preset pills */}
          <div>
            <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
              Product Image URL
            </label>
            <input
              type="url"
              placeholder="https://..."
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-3 text-sm text-ink outline-none focus:border-accent"
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                Quick pick:
              </span>
              {PRESET_IMAGES.map((p) => (
                <button
                  type="button"
                  key={p.label}
                  onClick={() => setForm({ ...form, imageUrl: p.url })}
                  className={`rounded-full border px-2.5 py-1 font-mono text-[11px] transition ${
                    form.imageUrl === p.url
                      ? 'border-ink bg-ink text-white font-bold'
                      : 'border-ink/15 bg-paper/50 text-ink/70 hover:border-ink/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sizing & Variants */}
          <div className="rounded-2xl border border-ink/10 bg-paper/30 p-4">
            <div className="flex items-center justify-between">
              <label className="font-mono text-xs font-semibold uppercase tracking-wider text-ink">
                Sizing & Initial Stock
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, variantType: 'sizes' })}
                  className={`rounded-lg px-3 py-1 font-mono text-xs transition ${
                    form.variantType === 'sizes'
                      ? 'bg-ink text-white font-semibold'
                      : 'bg-white border border-ink/10 text-ink/60'
                  }`}
                >
                  Multi-size (S, M, L, XL)
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, variantType: 'standard' })}
                  className={`rounded-lg px-3 py-1 font-mono text-xs transition ${
                    form.variantType === 'standard'
                      ? 'bg-ink text-white font-semibold'
                      : 'bg-white border border-ink/10 text-ink/60'
                  }`}
                >
                  One Size / Standard
                </button>
              </div>
            </div>

            {form.variantType === 'sizes' ? (
              <div className="mt-4 grid grid-cols-4 gap-3">
                {['S', 'M', 'L', 'XL'].map((sz) => (
                  <div key={sz} className="rounded-xl border border-ink/10 bg-white p-3">
                    <span className="font-mono text-xs font-bold text-ink">{sz}</span>
                    <input
                      type="number"
                      min="0"
                      value={form.sizesStock[sz]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          sizesStock: {
                            ...form.sizesStock,
                            [sz]: e.target.value,
                          },
                        })
                      }
                      className="mt-1 w-full border-b border-ink/15 bg-transparent font-mono text-base font-bold text-ink outline-none focus:border-accent"
                    />
                    <span className="font-mono text-[9px] uppercase text-ink/40">units</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 max-w-xs">
                <label className="font-mono text-xs text-ink/60">Units in Stock</label>
                <input
                  type="number"
                  min="0"
                  value={form.standardStock}
                  onChange={(e) => setForm({ ...form, standardStock: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 font-mono text-base font-bold text-ink outline-none focus:border-accent"
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-ink/10">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-full border border-ink/15 px-5 py-2.5 text-xs font-semibold text-ink transition hover:bg-ink/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-accent px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-accent-dark disabled:opacity-50"
            >
              {submitting ? 'Creating Item…' : 'Publish to Store'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
