import {
  Button,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ScrollShadow,
} from "@heroui/react";
import AddToCart from "@/features/cart/components/AddToCart";
import type { Product } from "@/features/products/types";
import { resolveImageUrl } from "@/lib/images";
import { formatBirrLabel } from "@/lib/money";
import { formatLocaleDate, useI18n } from "@/features/i18n";
import { ProductImageCarousel } from "./ProductImageCarousel";

export function ProductPreviewModal({
  isOpen,
  onClose,
  product,
  imageBase,
}: {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  imageBase: string;
}) {
  const { locale, t } = useI18n();
  const rawImagePaths =
    product?.imageUrls && product.imageUrls.length > 0
      ? product.imageUrls
      : product?.imageUrl
        ? [product.imageUrl]
        : [];

  const images = rawImagePaths
    .map((path) => resolveImageUrl(imageBase, path))
    .filter((path): path is string => Boolean(path));
  const numericPrice =
    typeof product?.price === "number" ? product.price : Number(product?.price ?? 0);
  const isFree = Number.isFinite(numericPrice) && numericPrice <= 0;
  const lastUpdatedSource = product?.updatedAt || product?.createdAt;
  const lastUpdatedDate = lastUpdatedSource ? new Date(lastUpdatedSource) : null;
  const hasValidLastUpdatedDate =
    lastUpdatedDate !== null && !Number.isNaN(lastUpdatedDate.getTime());
  const lastUpdatedLabel = hasValidLastUpdatedDate
    ? t("product.lastUpdated", {
        date: formatLocaleDate(lastUpdatedDate, locale, {
          year: "numeric",
          month: "short",
          day: "2-digit",
        }),
      })
    : t("product.lastUpdatedRecently");
  const descriptionText =
    product?.description && product.description.trim().length > 0
      ? product.description
      : t("product.noDescription");

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex items-center justify-between gap-3">
          <p className="text-base font-semibold md:text-lg">
            {product?.name ?? t("product.previewTitleFallback")}
          </p>
        </ModalHeader>
        <ModalBody className="min-w-0 overflow-x-hidden pt-0">
            {product ? (
              <div className="grid min-w-0 gap-5 pb-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="min-w-0 aspect-square">
                  <ProductImageCarousel images={images} productName={product.name} />
                </div>
                <div className="min-w-0 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {product.category?.name ? (
                      <Chip size="sm" variant="flat">
                        {product.category.name}
                      </Chip>
                    ) : null}
                    <Chip size="sm" variant="flat">
                      {lastUpdatedLabel}
                    </Chip>
                  </div>
                  {isFree ? (
                    <p className="text-2xl font-semibold uppercase tracking-[0.2em] text-green-600">
                      {t("product.free")}
                    </p>
                  ) : (
                    <p className="text-2xl font-semibold">{formatBirrLabel(product.price)}</p>
                  )}
                  <ScrollShadow
                    hideScrollBar
                    size={5}
                    className="h-56"
                  >
                    <p className="text-ink-muted whitespace-pre-wrap wrap-break-word text-sm leading-relaxed">
                      {descriptionText}
                    </p>
                  </ScrollShadow>
                  <div className="pt-2">
                    <AddToCart product={product} />
                  </div>
                </div>
              </div>
            ) : null}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            {t("common.close")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
