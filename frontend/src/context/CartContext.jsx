import { createContext, useContext, useMemo, useState } from 'react';

const KEY = 'altitude.cart';
const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY))?.items || [];
    } catch {
      return [];
    }
  });
  const [intent, setIntent] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(KEY))?.intent || null;
    } catch {
      return null;
    }
  });

  const persist = (nextItems, nextIntent) => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({ items: nextItems, intent: nextIntent }));
    } catch {}
  };

  const addMerch = (product, size, qty = 1) => {
    const selectedVariant = product.sizes?.find((s) => s.label === size);
    let next;
    setItems((prev) => {
      const i = prev.findIndex((x) => x.productId === product.id && x.size === size);
      if (i >= 0) next = prev.map((x, j) => (j === i ? { ...x, qty: x.qty + qty } : x));
      else
        next = [
          ...prev,
          {
            kind: 'merch',
            productId: product.id,
            variantId: selectedVariant?.variantId || null,
            name: product.name,
            image: product.image,
            price: product.price,
            size,
            qty,
          },
        ];
      persist(next, intent);
      return next;
    });
  };

  const setTicketIntent = (eventId, eventTitle, typeId, typeLabel, price, qty) => {
    const next = { kind: 'ticket', eventId, eventTitle, typeId, typeLabel, price, qty };
    setIntent(next);
    persist(items, next);
  };

  const setPlanIntent = (planId, planName, price) => {
    const next = { kind: 'plan', planId, planName, price };
    setIntent(next);
    persist(items, next);
  };

  const setQty = (productId, size, qty) => {
    let next;
    setItems((prev) => {
      next =
        qty <= 0
          ? prev.filter((x) => !(x.productId === productId && x.size === size))
          : prev.map((x) => (x.productId === productId && x.size === size ? { ...x, qty } : x));
      persist(next, intent);
      return next;
    });
  };

  const removeItem = (productId, size) => {
    let next;
    setItems((prev) => {
      next = prev.filter((x) => !(x.productId === productId && x.size === size));
      persist(next, intent);
      return next;
    });
  };

  const clear = () => {
    setItems([]);
    setIntent(null);
    persist([], null);
  };

  const count = items.reduce((s, x) => s + x.qty, 0);
  const merchTotal = items.reduce((s, x) => s + x.price * x.qty, 0);

  const value = useMemo(
    () => ({
      items,
      intent,
      addMerch,
      setTicketIntent,
      setPlanIntent,
      setQty,
      removeItem,
      clear,
      count,
      merchTotal,
    }),
    [items, intent, count, merchTotal],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
