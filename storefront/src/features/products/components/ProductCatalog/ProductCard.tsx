import AddToCart from "@/features/cart/components/AddToCart";
import { formatBirrLabel } from "@/lib/money";
import { resolveImageUrl } from "@/lib/images";
import type { Product } from "@/features/products/types";
import { useI18n } from "@/features/i18n";

export function ProductCard({
  product,
  imageBase,
  onPreview,
}: {
  product: Product;
  imageBase: string;
  onPreview?: (product: Product) => void;
}) {
  const { t } = useI18n();
  const previewImagePath =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls[0]
      : product.imageUrl;
  const image = resolveImageUrl(imageBase, previewImagePath);
  const numericPrice =
    typeof product.price === "number" ? product.price : Number(product.price);
  const isFree = Number.isFinite(numericPrice) && numericPrice <= 0;
  const descriptionText =
    product.description && product.description.trim().length > 0
      ? product.description
      : t("product.noDescription");

  return (
    <div
      role="button"
      tabIndex={0}
      className="group glass-strong relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl outline-none transition hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-primary/60"
      onClick={() => onPreview?.(product)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onPreview?.(product);
        }
      }}
    >
      <div className="theme-image-placeholder relative aspect-4/3 overflow-hidden p-1 text-left">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full rounded-xl object-fill"
          />
        ) : (
          <div className="theme-image-placeholder h-full w-full" />
        )}

        {product.category?.name ? (
          <span className="theme-chip absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.3em]">
            {product.category.name}
          </span>
        ) : null}
        <span className="theme-chip-contrast absolute bottom-3 right-3 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]">
          {t("product.preview")}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {isFree ? (
          <p className="text-base font-bold uppercase tracking-[0.16em] text-emerald-500 md:text-lg">
            {t("product.free")}
          </p>
        ) : (
          <p className="text-lg font-bold tracking-tight text-(--cta) md:text-xl">
            {formatBirrLabel(product.price)}
          </p>
        )}

        <h3 className="text-sm font-semibold leading-snug line-clamp-1 md:text-base">
          {product.name}
        </h3>

        <p className="line-clamp-3 text-xs leading-relaxed text-ink-muted md:text-sm">
          {descriptionText}
        </p>

        <div className="mt-auto pt-1" onClick={(event) => event.stopPropagation()}>
          <AddToCart product={product} />
        </div>
      </div>
    </div>
  );
}
