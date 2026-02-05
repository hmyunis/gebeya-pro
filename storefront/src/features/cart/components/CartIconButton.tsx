import { Badge, Button } from "@heroui/react";
import { useEffect, useState } from "react";

export function CartIconButton({
  count,
  onPress,
}: {
  count: number;
  onPress: () => void;
}) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const safeCount = isMounted ? count : 0;
  const isInvisible = !isMounted || safeCount <= 0;

  return (
    <Badge
      color="danger"
      content={safeCount}
      isInvisible={isInvisible}
      shape="circle"
    >
      <Button
        isIconOnly
        variant="light"
        radius="full"
        aria-label="Cart"
        onPress={onPress}
        className="bg-white/70 text-[#12141a] shadow-[0_12px_30px_-22px_rgba(16,19,25,0.7)]"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
      </Button>
    </Badge>
  );
}
