import { atom, map, onMount } from "nanostores";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
}

export type CartProduct = {
  id: number;
  name: string;
  price: number | string;
  imageUrl?: string | null;
};

export const $cartItems = map<Record<number, CartItem>>({});

onMount($cartItems, () => {
  if (typeof window === "undefined") return;

  const saved = localStorage.getItem("cart");
  if (saved) {
    try {
      const parsed: unknown = JSON.parse(saved);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        $cartItems.set(parsed as Record<number, CartItem>);
      }
    } catch {
      // Ignore corrupted storage and start fresh.
      $cartItems.set({});
    }
  }

  const unlisten = $cartItems.listen((value) => {
    localStorage.setItem("cart", JSON.stringify(value));
  });

  return () => {
    unlisten();
  };
});

function toFiniteNumber(value: number | string): number {
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function removeItem(productId: number) {
  const current = $cartItems.get();
  if (!(productId in current)) return;

  const next = { ...current };
  delete next[productId];
  $cartItems.set(next);
}

export function addToCart(product: CartProduct) {
  const existing = $cartItems.get()[product.id];
  if (existing) {
    $cartItems.setKey(product.id, {
      ...existing,
      quantity: existing.quantity + 1,
    });
    return;
  }

  $cartItems.setKey(product.id, {
    id: product.id,
    name: product.name,
    price: toFiniteNumber(product.price),
    image: product.imageUrl ?? null,
    quantity: 1,
  });
}

export function decrementFromCart(productId: number) {
  const existing = $cartItems.get()[productId];
  if (!existing) return;

  if (existing.quantity <= 1) {
    removeItem(productId);
    return;
  }

  $cartItems.setKey(productId, {
    ...existing,
    quantity: existing.quantity - 1,
  });
}

export function setCartQuantity(productId: number, quantity: number) {
  const existing = $cartItems.get()[productId];
  if (!existing) return;

  if (quantity <= 0) {
    removeItem(productId);
    return;
  }

  $cartItems.setKey(productId, {
    ...existing,
    quantity,
  });
}

export function clearCart() {
  $cartItems.set({});
}

export const $cartCount = atom(0);
$cartItems.subscribe((items) => {
  const count = Object.values(items).reduce(
    (acc, item) => acc + item.quantity,
    0
  );
  $cartCount.set(count);
});
