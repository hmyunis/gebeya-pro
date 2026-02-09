import { Button, addToast } from "@heroui/react";
import { useStore } from "@nanostores/react";
import {
  addToCart,
  decrementFromCart,
  $cartItems,
  type CartProduct,
} from "../store/cartStore";

export default function AddToCart({ product }: { product: CartProduct }) {
  const cartItems = useStore($cartItems);
  const quantity = cartItems[product.id]?.quantity ?? 0;

  return (
    <div className="flex items-center gap-2">
      {quantity > 0 ? (
        <>
          <Button
            isIconOnly
            size="sm"
            radius="full"
            variant="flat"
            aria-label="Decrease quantity"
            className="theme-action-soft"
            onPress={() => decrementFromCart(product.id)}
          >
            −
          </Button>
          <div className="min-w-[28px] text-center text-sm font-semibold">
            {quantity}
          </div>
          <Button
            isIconOnly
            size="sm"
            radius="full"
            variant="flat"
            aria-label="Increase quantity"
            className="theme-action-soft"
            onPress={() => addToCart(product)}
          >
            +
          </Button>
        </>
      ) : (
        <Button
          fullWidth
          color="primary"
          radius="full"
          size="sm"
          className="theme-cta shadow-[0_14px_30px_-18px_rgba(30,60,109,0.7)] transition-transform duration-300 hover:-translate-y-0.5"
          onPress={() => {
            addToCart(product);
            addToast({
              title: "Added to cart!",
              color: "success",
              timeout: 2000,
            });
          }}
        >
          Add
        </Button>
      )}
    </div>
  );
}
