import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ProductImageCarousel({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const canSlide = images.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  useEffect(() => {
    if (!canSlide) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, [canSlide, images.length]);

  const currentImage = useMemo(() => images[activeIndex] ?? null, [activeIndex, images]);

  if (!currentImage) {
    return <div className="h-full w-full rounded-2xl bg-black/10" />;
  }

  return (
    <div className="flex h-full w-full min-w-0 max-w-full flex-col gap-2 overflow-x-hidden">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black/5">
        <img
          src={currentImage}
          alt={`${productName} image ${activeIndex + 1}`}
          className="h-full w-full object-cover"
        />

        {canSlide ? (
          <>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((current) =>
                  current === 0 ? images.length - 1 : current - 1,
                )
              }
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/60"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveIndex((current) => (current + 1) % images.length)
              }
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/60"
              aria-label="Next image"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <div className="w-full max-w-full overflow-x-auto pb-1">
          <div className="flex w-max max-w-full gap-2">
          {images.map((image, index) => (
            <button
              key={`product-image-thumb-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={[
                "relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 transition",
                index === activeIndex ? "border-primary" : "border-transparent",
              ].join(" ")}
              aria-label={`Preview image ${index + 1}`}
            >
              <img
                src={image}
                alt={`${productName} preview ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
