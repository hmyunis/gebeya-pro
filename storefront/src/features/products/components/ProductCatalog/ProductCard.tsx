import AddToCart from "@/features/cart/components/AddToCart";
import { formatBirrLabel } from "@/lib/money";
import { resolveImageUrl } from "@/lib/images";
import type { Product } from "@/features/products/types";

export function ProductCard({
  product,
  imageBase,
  onPreview,
}: {
  product: Product;
  imageBase: string;
  onPreview?: (product: Product) => void;
}) {
  const previewImagePath =
    product.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls[0]
      : product.imageUrl;
  const image = resolveImageUrl(imageBase, previewImagePath);
  const numericPrice =
    typeof product.price === "number" ? product.price : Number(product.price);
  const isFree = Number.isFinite(numericPrice) && numericPrice <= 0;

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
      <div className="relative aspect-4/5 overflow-hidden text-left">
        {image ? (
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="h-full w-full bg-black/10" />
        )}

        {product.category?.name ? (
          <span className="absolute left-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-[10px] uppercase tracking-[0.3em] text-[#12141a]">
            {product.category.name}
          </span>
        ) : null}
        <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-white">
          Preview
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold leading-snug line-clamp-1 md:text-base">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between">
          {isFree ? (
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-600 md:text-base">
              FREE
            </p>
          ) : (
            <p className="text-sm font-semibold text-[#12141a] md:text-base">
              {formatBirrLabel(product.price)}
            </p>
          )}
        </div>
        <div className="mt-2" onClick={(event) => event.stopPropagation()}>
          <AddToCart product={product} />
        </div>
      </div>
    </div>
  );
}
