import { Button } from "@heroui/react";

import { formatBirrLabel } from "@/lib/money";
import { resolveImageUrl } from "@/lib/images";
import {
  addToCart,
  decrementFromCart,
  type CartItem,
} from "@/features/cart/store/cartStore";
import { useI18n } from "@/features/i18n";

export function CartDrawer({
  isOpen,
  onClose,
  items,
  total,
  imageBase,
  onCheckout,
}: {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  total: number;
  imageBase: string;
  onCheckout: () => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`theme-overlay absolute inset-0 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      ></div>

      <div
        className={`theme-drawer absolute right-0 top-0 h-full w-[90%] max-w-sm transform overflow-hidden shadow-2xl backdrop-blur-xl transition-transform ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="theme-divider flex items-center justify-between border-b px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
              {t("cart.cart")}
            </p>
            <p className="text-lg font-semibold">{t("cart.yourItems")}</p>
          </div>
          <Button
            isIconOnly
            variant="light"
            radius="full"
            aria-label={t("cart.close")}
            onPress={onClose}
          >
            ✕
          </Button>
        </div>

        <div className="flex max-h-[calc(100vh-168px)] flex-col gap-3 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-center">
              <div>
                <p className="font-display text-xl">{t("cart.empty")}</p>
                <p className="text-sm text-ink-muted">
                  {t("cart.emptyHint")}
                </p>
              </div>
            </div>
          ) : (
            items.map((item) => {
              const image = resolveImageUrl(imageBase, item.image);

              return (
                <div
                  key={item.id}
                  className="theme-card flex items-center gap-3 rounded-2xl p-3 shadow-[var(--shadow-soft)]"
                >
                  <div className="theme-card-subtle h-14 w-14 overflow-hidden rounded-xl">
                    {image ? (
                      <img
                        src={image}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold line-clamp-1">
                      {item.name}
                    </p>
                    <p className="text-[11px] text-ink-muted">
                      {item.quantity} × {formatBirrLabel(item.price)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm font-semibold whitespace-nowrap">
                      {formatBirrLabel(item.price * item.quantity)}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        isIconOnly
                        size="sm"
                        radius="full"
                        variant="flat"
                        aria-label={t("cart.decrease")}
                        className="theme-action-soft"
                        onPress={() => decrementFromCart(item.id)}
                      >
                        −
                      </Button>
                      <span className="min-w-[20px] text-center text-xs font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        isIconOnly
                        size="sm"
                        radius="full"
                        variant="flat"
                        aria-label={t("cart.increase")}
                        className="theme-action-soft"
                        onPress={() =>
                          addToCart({
                            id: item.id,
                            name: item.name,
                            price: item.price,
                            imageUrl: item.image ?? undefined,
                          })
                        }
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="theme-divider border-t px-5 py-4">
          <div className="flex items-center justify-between text-base font-semibold">
            <span>{t("common.total")}</span>
            <span className="whitespace-nowrap">{formatBirrLabel(total)}</span>
          </div>
          <Button
            fullWidth
            size="lg"
            className="theme-cta mt-4"
            isDisabled={items.length === 0}
            onPress={onCheckout}
          >
            {t("common.checkout")}
          </Button>
        </div>
      </div>
    </div>
  );
}
