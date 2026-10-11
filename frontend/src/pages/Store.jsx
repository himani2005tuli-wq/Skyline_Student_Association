import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Minus } from 'lucide-react';
import { productsApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Badge, Skeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { SmartImage } from '@/components/ui/SmartImage';
import Modal from '@/components/ui/Modal';
import Pagination from '@/components/ui/Pagination';
import { inr } from '@/lib/format';

function ProductModal({ product, onClose }) {
  const { user } = useAuth();
  const { addMerch } = useCart();
  const [size, setSize] = useState(product.sizes.find((s) => s.stock > 0)?.label);
  const [qty, setQty] = useState(1);
  const selected = product.sizes.find((s) => s.label === size);
  const isMember = user?.role === 'member';
  const merchPct = isMember ? (user.plan === 'Alumni Circle' ? 20 : 15) : 0;
  const memberPrice = Math.round(product.price * (1 - merchPct / 100));

  const add = () => {
    addMerch(product, size, qty);
    toast.success(`${product.name} (${size}) added to cart`, {
      description: isMember
        ? `Member price applied at checkout — you save ${inr(product.price - memberPrice)} per item.`
        : 'Sign in as a member to save 15% at checkout.',
    });
    setTimeout(onClose, 700);
  };

  return (
    <Modal open onClose={onClose} title={product.name} testid="product-modal">
      <p className="text-sm leading-relaxed text-ink/60">{product.desc}</p>
      <div className="mt-5 flex items-baseline gap-3">
        <p className="font-display text-3xl font-semibold text-ink">
          {isMember ? inr(memberPrice) : inr(product.price)}
        </p>
        {isMember && <p className="text-sm text-ink/40 line-through">{inr(product.price)}</p>}
        {isMember && <Badge tone="success">Member −{merchPct}%</Badge>}
      </div>
      <p className="mt-6 mb-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
        Size
      </p>
      <div className="flex flex-wrap gap-2" data-testid="product-size-selector">
        {product.sizes.map((s) => (
          <button
            key={s.label}
            disabled={s.stock === 0}
            onClick={() => setSize(s.label)}
            data-testid={`product-size-${s.label.toLowerCase().replace(' ', '-')}`}
            className={`min-w-14 rounded-xl border px-4 py-2.5 text-sm font-bold transition ${size === s.label ? 'border-accent bg-accent-soft text-accent-dark' : s.stock === 0 ? 'cursor-not-allowed border-ink/10 text-ink/25 line-through' : 'border-ink/15 text-ink hover:border-ink'}`}
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
        Add to cart · {inr((isMember ? memberPrice : product.price) * qty)}
      </Button>
    </Modal>
  );
}

export default function Store() {
  const { data, isLoading } = useQuery({ queryKey: ['products'], queryFn: productsApi.list });
  const [active, setActive] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);

  const products = data || [];
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = products.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8" data-testid="store-page">
      <p className="eyebrow flex items-center gap-3 text-accent-dark">
        <span className="rule-line" /> The store
      </p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-ink sm:text-6xl">
        Wear the peak.
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/55">
        Sizes and stock are live from the club's inventory. Members save 15% at checkout —
        automatically.
      </p>
      {isLoading ? (
        <div className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-3xl" />
          ))}
        </div>
      ) : (
        <>
          <div
            className="mt-12 grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6"
            data-testid="store-grid"
          >
            {paginatedProducts.map((p) => {
              const total = p.sizes.reduce((s, x) => s + x.stock, 0);
              const low = p.sizes.some((s) => s.stock > 0 && s.stock <= 3);
              return (
                <button
                  key={p.id}
                  onClick={() => setActive(p)}
                  data-testid={`store-product-${p.id}`}
                  className="group overflow-hidden rounded-3xl border border-ink/10 bg-paper-card text-left shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
                >
                  <div className="relative">
                    <SmartImage
                      src={p.image}
                      alt={p.name}
                      hoverZoom
                      className="aspect-square w-full object-cover"
                    />
                    {low && (
                      <span className="absolute left-3 top-3">
                        <Badge tone="warning">Low stock</Badge>
                      </span>
                    )}
                    {total === 0 && (
                      <span className="absolute left-3 top-3">
                        <Badge tone="danger">Sold out</Badge>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 p-3 sm:p-4 lg:p-5">
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-bold text-ink lg:text-base">{p.name}</h3>
                      <p className="mt-0.5 font-mono text-xs text-ink/50">{inr(p.price)}</p>
                    </div>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 text-ink transition group-hover:bg-accent group-hover:text-white">
                      <Plus size={15} />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {products.length > 0 && (
            <div className="mt-10 rounded-3xl border border-ink/10 bg-paper-card px-6 py-2 shadow-card">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={products.length}
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
