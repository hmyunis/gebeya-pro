import AddToCart from "@/features/cart/components/AddToCart";
import { formatBirrAmount } from "@/lib/money";
import { resolveImageUrl } from "@/lib/images";
import type { Product } from "@/features/products/types";

export function ProductCard({
  product,
  imageBase,
}: {
  product: Product;
  imageBase: string;
}) {
  const image = resolveImageUrl(imageBase, product.imageUrl);

  return (
    <div className="group glass-strong relative flex h-full flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-4/5 overflow-hidden">
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
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-sm font-semibold leading-snug line-clamp-1 md:text-base">
          {product.name}
        </h3>
        <div className="mt-auto flex items-center justify-between">
          <p className="text-sm font-semibold text-[#12141a] md:text-base">
            {formatBirrAmount(product.price)}
          </p>
        </div>
        <div className="mt-2">
          <AddToCart product={product} />
        </div>
      </div>
    </div>
  );
}

