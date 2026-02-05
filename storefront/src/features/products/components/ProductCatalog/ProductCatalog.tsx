import { useEffect, useMemo, useRef, useState } from "react";
import { Input, addToast } from "@heroui/react";
import { useStore } from "@nanostores/react";

import { stripTrailingSlash } from "@/lib/url";
import { useProducts } from "@/features/products/hooks/useProducts";
import { useProductFilters } from "@/features/products/hooks/useProductFilters";
import { CartDrawer } from "@/features/cart/components/CartDrawer";
import { CartIconButton } from "@/features/cart/components/CartIconButton";
import { $cartCount, $cartItems } from "@/features/cart/store/cartStore";
import OrderModal from "@/features/orders/components/OrderModal";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { requireLogin } from "@/features/auth/store/authStore";
import QueryProvider from "@/app/QueryProvider";

import { ProductFilters } from "./ProductFilters";
import { ProductGrid } from "./ProductGrid";

export default function ProductCatalog({
  apiBase,
  imageBase,
}: {
  apiBase: string;
  imageBase: string;
}) {
  return (
    <QueryProvider>
      <ProductCatalogContent apiBase={apiBase} imageBase={imageBase} />
    </QueryProvider>
  );
}

function ProductCatalogContent({
  apiBase,
  imageBase,
}: {
  apiBase: string;
  imageBase: string;
}) {
  const baseUrl = useMemo(() => stripTrailingSlash(apiBase), [apiBase]);

  const count = useStore($cartCount);
  const cartItems = useStore($cartItems);
  const items = useMemo(() => Object.values(cartItems), [cartItems]);
  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  );

  const { user, authReady } = useAuth();
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const cartButtonAnchorRef = useRef<HTMLDivElement | null>(null);
  const [isCartButtonAnchorVisible, setIsCartButtonAnchorVisible] =
    useState(true);

  const openOrderModal = () => {
    setIsCartOpen(false);
    setIsOrderOpen(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!authReady) return;

    const url = new URL(window.location.href);
    const shouldOpenOrder = url.searchParams.get("openOrder") === "1";
    if (!shouldOpenOrder) return;

    if (items.length === 0) {
      url.searchParams.delete("openOrder");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      return;
    }

    if (user) {
      url.searchParams.delete("openOrder");
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
      openOrderModal();
    }
  }, [authReady, items.length, user]);

  const handleCheckout = () => {
    if (!user) {
      addToast({
        title: "Login required",
        description: "Please login with Telegram to place your order.",
        color: "warning",
      });
      const url = new URL(window.location.href);
      url.searchParams.set("openOrder", "1");
      setIsCartOpen(false);
      requireLogin(url.pathname + url.search + url.hash);
      return;
    }

    openOrderModal();
  };

  useEffect(() => {
    const anchor = cartButtonAnchorRef.current;
    if (!anchor) return;
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCartButtonAnchorVisible(Boolean(entry?.isIntersecting));
      },
      { threshold: 0.2 }
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, []);

  const [search, setSearch] = useState("");
  const [activeCategories, setActiveCategories] = useState<Set<number>>(
    () => new Set()
  );
  const [priceBucket, setPriceBucket] = useState("all");

  const activeCategoryIds = useMemo(
    () => Array.from(activeCategories),
    [activeCategories]
  );

  const filtersQuery = useMemo(() => {
    const params = new URLSearchParams();
    const trimmed = search.trim();

    if (trimmed) {
      params.set("q", trimmed);
    }

    if (activeCategoryIds.length > 0) {
      params.set("categoryIds", activeCategoryIds.join(","));
    }

    return params.toString();
  }, [activeCategoryIds, search]);

  const { categories, priceRanges, isLoading: filtersLoading, error: filtersError, reload: reloadFilters } =
    useProductFilters(baseUrl, filtersQuery);

  const selectedRange = useMemo(
    () => priceRanges.find((range) => range.id === priceBucket),
    [priceBucket, priceRanges]
  );

  useEffect(() => {
    if (priceBucket === "all") return;
    if (!selectedRange) {
      setPriceBucket("all");
    }
  }, [priceBucket, selectedRange]);

  const productQuery = useMemo(() => {
    const params = new URLSearchParams();
    const trimmed = search.trim();

    if (trimmed) {
      params.set("q", trimmed);
    }

    if (activeCategoryIds.length > 0) {
      params.set("categoryIds", activeCategoryIds.join(","));
    }

    if (priceBucket !== "all" && selectedRange) {
      params.set("minPrice", String(selectedRange.min));
      params.set("maxPrice", String(selectedRange.max));
    }

    params.set("page", "1");
    params.set("limit", "100");
    return params.toString();
  }, [activeCategoryIds, priceBucket, search, selectedRange]);

  const { products, resultCount, isLoading, error, reload } = useProducts(
    baseUrl,
    productQuery
  );

  const clearFilters = () => {
    setSearch("");
    setActiveCategories(new Set());
    setPriceBucket("all");
  };

  const handleToggleCategory = (categoryId: number, checked: boolean) => {
    setActiveCategories((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(categoryId);
      } else {
        next.delete(categoryId);
      }
      return next;
    });
  };

  return (
    <section id="collection" className="mt-10">
      <div className="flex flex-col items-center gap-4">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.35em] text-[#1e1b4b]">
            Browse products
          </p>
          <h2 className="font-display mt-2 text-2xl md:text-3xl">
            Find what fits your day
          </h2>
        </div>
        <div className="flex w-full max-w-2xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input
              size="md"
              value={search}
              onValueChange={setSearch}
              placeholder="Search products"
              variant="bordered"
              radius="full"
              classNames={{
                inputWrapper:
                  "bg-white/80 shadow-[0_16px_40px_-28px_rgba(18,20,26,0.55)]",
              }}
            />
          </div>
          <div ref={cartButtonAnchorRef}>
            <CartIconButton count={count} onPress={() => setIsCartOpen(true)} />
          </div>
        </div>
      </div>

      <div
        className={[
          "md:hidden fixed bottom-6 right-4 z-50 transition-opacity duration-200",
          isCartButtonAnchorVisible
            ? "pointer-events-none opacity-0"
            : "opacity-100",
        ].join(" ")}
      >
        <CartIconButton count={count} onPress={() => setIsCartOpen(true)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <ProductFilters
          categories={categories}
          priceRanges={priceRanges}
          activeCategories={activeCategories}
          onToggleCategory={handleToggleCategory}
          priceBucket={priceBucket}
          onPriceBucketChange={setPriceBucket}
          isLoading={filtersLoading}
          error={filtersError}
          onReset={clearFilters}
          onRetry={reloadFilters}
        />

        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] text-ink-muted">
              {isLoading ? "Loading..." : `${resultCount} results`}
            </span>
            {search ? (
              <span className="rounded-full border border-black/10 bg-white/70 px-3 py-1 text-[11px] text-ink-muted">
                Search: {search}
              </span>
            ) : null}
          </div>

          <ProductGrid
            products={products}
            isLoading={isLoading}
            error={error}
            imageBase={imageBase}
            onRetry={reload}
          />
        </div>
      </div>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={items}
        total={total}
        imageBase={imageBase}
        onCheckout={handleCheckout}
      />

      <OrderModal isOpen={isOrderOpen} onClose={() => setIsOrderOpen(false)} />
    </section>
  );
}
