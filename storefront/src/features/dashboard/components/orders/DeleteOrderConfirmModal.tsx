import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { Trash2 } from "lucide-react";

import { formatBirrLabel } from "@/lib/money";

export function DeleteOrderConfirmModal({
  candidate,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  candidate: { id: number; totalAmount: number; itemCount: number } | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      isOpen={Boolean(candidate)}
      onClose={() => {
        if (isDeleting) return;
        onCancel();
      }}
      size="md"
      isDismissable={!isDeleting}
      scrollBehavior="inside"
      classNames={{
        wrapper: "!z-[120]",
        backdrop: "!z-[120]",
        base: "!z-[121]",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Delete pending order
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-ink-muted">
            This will permanently remove your order. You can only delete orders
            while they are still pending.
          </p>
          {candidate ? (
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm">
              <p className="font-semibold">Order #{candidate.id}</p>
              <p className="mt-1 text-ink-muted">
                {candidate.itemCount} item{candidate.itemCount === 1 ? "" : "s"}{" "}
                · {formatBirrLabel(candidate.totalAmount)}
              </p>
            </div>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button
            variant="light"
            radius="full"
            isDisabled={isDeleting}
            onPress={onCancel}
          >
            Cancel
          </Button>
          <Button
            color="danger"
            radius="full"
            isLoading={isDeleting}
            startContent={<Trash2 size={16} />}
            onPress={onConfirm}
          >
            Delete order
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

