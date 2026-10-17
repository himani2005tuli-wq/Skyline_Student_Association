import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Minus, Check, Sparkles } from 'lucide-react';
import { productsApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { SmartImage } from '@/components/ui/SmartImage';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { inr } from '@/lib/format';
import { MERCHANDISE_CATALOG } from '@/data/merchandise';

function ProductModal({ product, onClose }) {
  const { user } = useAuth();
  const { addMerch } = useCart();

  // If the product has colors, keep track of selected color
  const [selectedColor, setSelectedColor] = useState(
    product.colors && product.colors.length > 0 ? product.colors[0] : null,
  );

  const [size, setSize] = useState(product.sizes?.find((s) => s.stock > 0)?.label || 'Standard');
  const [qty, setQty] = useState(1);

  const selected = product.sizes?.find((s) => s.label === size);
  const isMember = user?.role === 'member';
  const merchPct = isMember ? (user.plan === 'Alumni Circle' ? 20 : 15) : 0;
  const currentPrice = selected?.price || product.price;
  const memberPrice = selected?.memberPrice || Math.round(currentPrice * (1 - merchPct / 100));

  const currentDisplayImage = selectedColor?.image || product.image;

  const add = () => {
    const sizeWithColor = selectedColor ? `${size} • ${selectedColor.name}` : size;
    const productToAdd = {
      ...product,
      image: currentDisplayImage,
      price: currentPrice,
    };

    addMerch(productToAdd, sizeWithColor, qty);
    toast.success(`${product.name} (${sizeWithColor}) added to cart`, {
      description: isMember
        ? `Member price applied at checkout — you save ${inr(currentPrice - memberPrice)} per item.`
        : 'Sign in as a member to save 15% at checkout.',
    });
    setTimeout(onClose, 700);
  };

  return (
    <Modal open onClose={onClose} title={product.name} testid="product-modal">
      <div className="mb-4 overflow-hidden rounded-2xl bg-neutral-100/80 border border-ink/5">
        <SmartImage
          src={currentDisplayImage}
          alt={product.name}
          className="aspect-square w-full object-contain p-2 sm:p-4"
        />
      </div>

      <p className="text-sm leading-relaxed text-ink/60">{product.desc}</p>

      <div className="mt-5 flex items-baseline gap-3">
        <p className="font-display text-3xl font-semibold text-ink">
          {isMember ? inr(memberPrice) : inr(currentPrice)}
        </p>
        {isMember && <p className="text-sm text-ink/40 line-through">{inr(currentPrice)}</p>}
        {isMember && <Badge tone="success">Member −{merchPct}%</Badge>}
      </div>

      {/* Color Selector */}
      {product.colors && product.colors.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
            Color: <span className="text-ink font-bold lowercase capitalize">{selectedColor?.name}</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {product.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`relative flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  selectedColor?.name === c.name
                    ? 'border-accent bg-accent-soft text-accent-dark ring-2 ring-accent/30'
                    : 'border-ink/15 text-ink hover:border-ink/40'
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full border border-black/20"
                  style={{ backgroundColor: c.hex }}
                />
                {c.name}
                {selectedColor?.name === c.name && <Check size={12} className="text-accent-dark" />}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size / Variant Selector */}
      <p className="mt-5 mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
        Size / Option
      </p>
      <div className="flex flex-wrap gap-2" data-testid="product-size-selector">
        {product.sizes?.map((s) => (
          <button
            key={s.label}
            disabled={s.stock === 0}
            onClick={() => setSize(s.label)}
            data-testid={`product-size-${s.label.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            className={`min-w-14 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${
              size === s.label
                ? 'border-accent bg-accent-soft text-accent-dark'
                : s.stock === 0
                  ? 'cursor-not-allowed border-ink/10 text-ink/25 line-through'
                  : 'border-ink/15 text-ink hover:border-ink'
            }`}
            title={s.stock === 0 ? 'Out of stock' : `${s.stock} in stock`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {selected && (
        <p
          className={`mt-2 text-xs font-medium ${selected.stock <= 3 ? 'text-warning' : 'text-ink/50'}`}
          data-testid="product-stock-note"
        >
          {selected.stock === 0
            ? 'Out of stock — restock announced soon.'
            : selected.stock <= 3
              ? `Only ${selected.stock} left in ${size}!`
              : `${selected.stock} in stock`}
        </p>
      )}

      {/* Quantity Selector */}
      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">Quantity</span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            aria-label="Decrease"
            data-testid="product-qty-minus"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 hover:bg-ink hover:text-paper"
          >
            <Minus size={14} />
          </button>
          <span className="w-8 text-center font-mono font-bold" data-testid="product-qty-value">
            {qty}
          </span>
          <button
            onClick={() => setQty(qty + 1)}
            aria-label="Increase"
            data-testid="product-qty-plus"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 hover:bg-ink hover:text-paper"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <Button
        onClick={add}
        disabled={!selected || selected.stock === 0}
        loadingText="Adding to cart…"
        successText="Added to cart"
        className="mt-7 w-full"
        size="lg"
        data-testid="product-add-to-cart"
      >
        Add to cart · {inr((isMember ? memberPrice : currentPrice) * qty)}
      </Button>
    </Modal>
  );
}

const CATEGORIES = ['All', 'Hoodies', 'T-Shirts', 'Sippers', 'Bags', 'Caps'];

export default function Store() {
  const { data: apiProducts, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productsApi.list,
  });

  const [activeCategory, setActiveCategory] = useState('All');
  const [active, setActive] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  // Combine database products with curated rich catalog so all hoodies, shirts, sippers, bags, caps are available
  const allProducts = useMemo(() => {
    const list = [];
    const dbList = (apiProducts || []).filter(
      (p) => !['ashes', 'blue t shirts'].includes((p.name || '').toLowerCase().trim()),
    );

    // Add curated items first (Hoodies, Shirts, Sippers, Bags, Caps)
    for (const item of MERCHANDISE_CATALOG) {
      list.push(item);
    }

    // Include existing database items that don't collide
    for (const dbItem of dbList) {
      const match = list.find((x) => x.name.toLowerCase() === dbItem.name.toLowerCase());
      if (!match) {
        // Tag category based on name if not provided
        let cat = dbItem.category || 'Apparel';
        const nameLower = (dbItem.name || '').toLowerCase();
        if (nameLower.includes('hoodie') || nameLower.includes('sweatshirt')) cat = 'Hoodies';
        else if (nameLower.includes('tee') || nameLower.includes('shirt')) cat = 'T-Shirts';
        else if (nameLower.includes('sipper') || nameLower.includes('flask') || nameLower.includes('bottle'))
          cat = 'Sippers';
        else if (nameLower.includes('bag') || nameLower.includes('duffel') || nameLower.includes('tote'))
          cat = 'Bags';
        else if (nameLower.includes('cap') || nameLower.includes('hat') || nameLower.includes('beanie'))
          cat = 'Caps';

        list.push({
          ...dbItem,
          category: cat,
        });
      }
    }

    return list;
  }, [apiProducts]);

  // Filter products by active category
  const filteredProducts = useMemo(() => {
    if (activeCategory === 'All') return allProducts;
    return allProducts.filter((p) => p.category === activeCategory);
  }, [allProducts, activeCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = filteredProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8" data-testid="store-page">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-3 text-accent-dark">
            <span className="rule-line" /> Official Club Merchandise
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-ink sm:text-6xl">
            Wear the peak.
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/55">
            Authentic association gear — hoodies, tees, sippers, duffels, and caps in multiple colours and sizes. Members save 15% automatically at checkout.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-paper-card px-4 py-2 text-xs font-mono text-ink/70 shadow-sm self-start sm:self-auto">
          <Sparkles size={14} className="text-accent" />
          <span>{filteredProducts.length} items available</span>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="mt-8 flex flex-wrap gap-2 border-b border-ink/10 pb-4">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`rounded-full px-5 py-2 text-xs font-bold transition-all ${
              activeCategory === cat
                ? 'bg-ink text-paper shadow-md'
                : 'bg-paper-card text-ink/70 border border-ink/10 hover:border-ink/30 hover:text-ink'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading && allProducts.length === 0 ? (
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-3xl" />
          ))}
        </div>
      ) : (
        <>
          <div
            className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3"
            data-testid="store-grid"
          >
            {paginatedProducts.map((p) => {
              const total = p.sizes ? p.sizes.reduce((s, x) => s + (x.stock || 0), 0) : p.stock || 20;
              const low = p.sizes ? p.sizes.some((s) => s.stock > 0 && s.stock <= 3) : false;

              return (
                <button
                  key={p.id}
                  onClick={() => setActive(p)}
                  data-testid={`store-product-${p.id}`}
                  className="group relative overflow-hidden rounded-3xl border border-ink/10 bg-paper-card text-left shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-ink/20 flex flex-col justify-between"
                >
                  <div className="relative overflow-hidden bg-neutral-100/90 aspect-square flex items-center justify-center p-3">
                    <SmartImage
                      src={p.image}
                      alt={p.name}
                      hoverZoom
                      className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Top status badges */}
                    <div className="absolute left-3 top-3 flex flex-col gap-1.5 z-10">
                      {p.category && (
                        <span className="rounded-full bg-paper/95 backdrop-blur-md px-2.5 py-1 text-[10px] font-mono uppercase font-bold tracking-wider text-ink shadow-sm border border-ink/5">
                          {p.category}
                        </span>
                      )}
                      {low && <Badge tone="warning">Low stock</Badge>}
                      {total === 0 && <Badge tone="danger">Sold out</Badge>}
                    </div>

                    {/* Available colors indicator */}
                    {p.colors && p.colors.length > 0 && (
                      <div className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-paper/90 backdrop-blur-md px-2.5 py-1.5 shadow-sm border border-ink/5 z-10">
                        {p.colors.slice(0, 4).map((c) => (
                          <span
                            key={c.name}
                            className="h-3 w-3 rounded-full border border-black/25 shadow-inner"
                            style={{ backgroundColor: c.hex }}
                            title={c.name}
                          />
                        ))}
                        {p.colors.length > 4 && (
                          <span className="text-[10px] font-mono font-bold text-ink/60">
                            +{p.colors.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 p-4 sm:p-5">
                    <div className="min-w-0 flex-1">
                      {p.club && (
                        <p className="text-[11px] font-mono uppercase tracking-wider text-ink/45 truncate mb-0.5">
                          {p.club}
                        </p>
                      )}
                      <h3 className="truncate text-sm sm:text-base font-bold text-ink group-hover:text-accent transition-colors">
                        {p.name}
                      </h3>
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <p className="font-mono text-sm sm:text-base font-bold text-ink">{inr(p.price)}</p>
                        {p.memberPrice && (
                          <span className="font-mono text-xs text-accent font-semibold bg-accent-soft px-1.5 py-0.5 rounded-md">
                            {inr(p.memberPrice)} member
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-ink/15 bg-paper text-ink transition-all duration-300 group-hover:bg-ink group-hover:border-ink group-hover:text-white shadow-sm">
                      <Plus size={16} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length > 0 && (
            <div className="mt-10 rounded-3xl border border-ink/10 bg-paper-card px-6 py-2 shadow-card">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={filteredProducts.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
                summaryLabel="items"
              />
            </div>
          )}
        </>
      )}

      {active && <ProductModal product={active} onClose={() => setActive(null)} />}
    </div>
  );
}
