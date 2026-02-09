import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Input, addToast } from "@heroui/react";
import { useStore } from "@nanostores/react";
import { SlidersHorizontal } from "lucide-react";

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
import { I18nProvider, useI18n } from "@/features/i18n";

import { ProductFilters } from "./ProductFilters";
import { ProductGrid } from "./ProductGrid";
import { ProductPreviewModal } from "./ProductPreviewModal";
import type { Product } from "@/features/products/types";

export default function ProductCatalog({
  apiBase,
  imageBase,
}: {
  apiBase: string;
  imageBase: string;
}) {
  return (
    <I18nProvider>
      <QueryProvider>
        <ProductCatalogContent apiBase={apiBase} imageBase={imageBase} />
      </QueryProvider>
    </I18nProvider>
  );
}

function ProductCatalogContent({
  apiBase,
  imageBase,
}: {
  apiBase: string;
  imageBase: string;
}) {
  const { t } = useI18n();
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
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [isCompactFiltersViewport, setIsCompactFiltersViewport] =
    useState(false);
  const cartButtonAnchorRef = useRef<HTMLDivElement | null>(null);
  const [isCartButtonAnchorVisible, setIsCartButtonAnchorVisible] =
    useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const syncViewport = () => setIsCompactFiltersViewport(mediaQuery.matches);

    syncViewport();

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }

    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!isCompactFiltersViewport) {
      setIsFilterDrawerOpen(false);
    }
  }, [isCompactFiltersViewport]);

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
        title: t("navbar.toast.loginRequired.title"),
        description: t("navbar.toast.loginRequired.description"),
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
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
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
          <p className="text-[11px] uppercase tracking-[0.35em] text-[color:var(--accent-2)]">
            {t("product.browse")}
          </p>
          <h2 className="font-display mt-2 text-2xl md:text-3xl">
            {t("product.findFits")}
          </h2>
        </div>
        <div className="flex w-full max-w-2xl items-center gap-2">
          {isCompactFiltersViewport ? (
            <Button
              isIconOnly
              variant="flat"
              radius="full"
              aria-label={t("product.openFilters")}
              className="theme-action-soft shrink-0"
              onPress={() => setIsFilterDrawerOpen(true)}
            >
              <SlidersHorizontal size={18} />
            </Button>
          ) : null}
          <div className="min-w-0 flex-1">
            <Input
              size="md"
              value={search}
              onValueChange={setSearch}
              placeholder={t("product.searchPlaceholder")}
              variant="bordered"
              radius="full"
              classNames={{
                inputWrapper: "theme-field shadow-[var(--shadow-soft)]",
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
        {!isCompactFiltersViewport ? (
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
        ) : null}

        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="theme-pill rounded-full px-3 py-1 text-[11px]">
              {isLoading
                ? t("common.loading")
                : t("product.results", { count: resultCount })}
            </span>
            {search ? (
              <span className="theme-pill rounded-full px-3 py-1 text-[11px]">
                {t("product.searchTag", { query: search })}
              </span>
            ) : null}
          </div>

          <ProductGrid
            products={products}
            isLoading={isLoading}
            error={error}
            imageBase={imageBase}
            onRetry={reload}
            onPreview={setPreviewProduct}
          />
        </div>
      </div>

      {isCompactFiltersViewport ? (
        <div
          className={`fixed inset-0 z-50 ${isFilterDrawerOpen ? "pointer-events-auto" : "pointer-events-none"}`}
          aria-hidden={!isFilterDrawerOpen}
        >
          <div
            className={`theme-overlay absolute inset-0 transition-opacity ${isFilterDrawerOpen ? "opacity-100" : "opacity-0"}`}
            onClick={() => setIsFilterDrawerOpen(false)}
          ></div>

          <div
            className={`theme-drawer absolute left-0 top-0 h-full w-[80%] max-w-105 transform overflow-hidden shadow-2xl backdrop-blur-xl transition-transform sm:w-[40%] ${isFilterDrawerOpen ? "translate-x-0" : "-translate-x-full"}`}
          >
            <div className="theme-divider flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                  {t("common.filters")}
                </p>
                <p className="text-lg font-semibold">{t("product.refine")}</p>
              </div>
              <Button
                isIconOnly
                variant="light"
                radius="full"
                aria-label={t("product.closeFilters")}
                className="theme-action-soft"
                onPress={() => setIsFilterDrawerOpen(false)}
              >
                ✕
              </Button>
            </div>

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
              className="h-[calc(100%-81px)] overflow-y-auto rounded-none border-0 bg-transparent p-5 shadow-none backdrop-blur-none"
            />
          </div>
        </div>
      ) : null}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={items}
        total={total}
        imageBase={imageBase}
        onCheckout={handleCheckout}
      />

      <OrderModal isOpen={isOrderOpen} onClose={() => setIsOrderOpen(false)} />
      <ProductPreviewModal
        isOpen={Boolean(previewProduct)}
        onClose={() => setPreviewProduct(null)}
        product={previewProduct}
        imageBase={imageBase}
      />
    </section>
  );
}
