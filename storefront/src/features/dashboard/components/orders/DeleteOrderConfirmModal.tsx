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
import { useI18n } from "@/features/i18n";

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
  const { t } = useI18n();

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
          {t("ordersDelete.title")}
        </ModalHeader>
        <ModalBody>
          <p className="text-sm text-ink-muted">
            {t("ordersDelete.description")}
          </p>
          {candidate ? (
            <div className="rounded-2xl border border-black/10 bg-white/70 p-4 text-sm">
              <p className="font-semibold">{t("overview.order", { id: candidate.id })}</p>
              <p className="mt-1 text-ink-muted">
                {candidate.itemCount === 1
                  ? t("overview.itemCount", { count: candidate.itemCount })
                  : t("overview.itemCountPlural", { count: candidate.itemCount })}{" "}
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
            {t("common.cancel")}
          </Button>
          <Button
            color="danger"
            radius="full"
            isLoading={isDeleting}
            startContent={<Trash2 size={16} />}
            onPress={onConfirm}
          >
            {t("ordersDelete.deleteOrder")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
