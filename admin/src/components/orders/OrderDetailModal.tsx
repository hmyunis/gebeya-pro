import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Button,
  Divider,
  addToast,
  Chip,
} from "@heroui/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Package, Truck, XCircle, X } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { getImageUrl, type Order, type OrderStatus } from "../../types";
import { useRef, useState, type JSX } from "react";

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions: { label: string; value: OrderStatus; color: "default" | "primary" | "success" | "warning" | "danger"; icon: JSX.Element }[] = [
  { label: "Pending", value: "PENDING", color: "warning", icon: <Package className="h-4 w-4" /> },
  { label: "Approve", value: "APPROVED", color: "primary", icon: <CheckCircle className="h-4 w-4" /> },
  { label: "Shipped", value: "SHIPPED", color: "success", icon: <Truck className="h-4 w-4" /> },
  { label: "Rejected", value: "REJECTED", color: "danger", icon: <XCircle className="h-4 w-4" /> },
  { label: "Cancelled", value: "CANCELLED", color: "default", icon: <X className="h-4 w-4" /> },
];

const statusColorMap: Record<OrderStatus, "default" | "primary" | "success" | "warning" | "danger"> = {
  PENDING: "warning",
  APPROVED: "primary",
  SHIPPED: "success",
  REJECTED: "danger",
  CANCELLED: "default",
};

const formatBirr = (value: number | string) => {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return "0.00";
  }
  return numeric.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export default function OrderDetailModal({ order, isOpen, onClose }: OrderDetailModalProps) {
  const queryClient = useQueryClient();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isDraggingReceipt, setIsDraggingReceipt] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement | null>(null);
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);

  const receiptUrl = order?.receiptUrl ? getImageUrl(order.receiptUrl) : null;
  const receiptExtension = receiptUrl ? new URL(receiptUrl).pathname.split('.').pop()?.toLowerCase() : null;
  const isImageReceipt = receiptExtension ? ["png", "jpg", "jpeg", "webp", "gif"].includes(receiptExtension) : false;
  const isPdfReceipt = receiptExtension === "pdf";

  const downloadReceipt = async () => {
    if (!receiptUrl) return;
    try {
      const response = await fetch(receiptUrl, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to download receipt");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = receiptUrl.split("/").pop() || "receipt";
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      addToast({
        title: "Download failed",
        description: error?.message || "Could not download receipt.",
        color: "danger",
      });
    }
  };

  const mutation = useMutation({
    mutationFn: async (newStatus: OrderStatus) => {
      if (!order) {
        throw new Error("Order not found");
      }
      return api.patch(`/orders/${order.id}/status`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      addToast({
        title: "Status Updated",
        description: "User has been notified via Telegram.",
        color: "success",
      });
      onClose();
    },
    onError: (err: any) => {
      console.error(err);
      addToast({
        title: "Update Failed",
        description: err.response?.data?.message || "Failed to update order status.",
        color: "danger",
      });
    },
  });

  const receiptMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!order) {
        throw new Error("Order not found");
      }
      const formData = new FormData();
      formData.append("receipt", file);
      return api.patch(`/orders/${order.id}/receipt`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      addToast({
        title: "Receipt Updated",
        description: "Receipt file has been attached to the order.",
        color: "success",
      });
      setReceiptFile(null);
      setIsDraggingReceipt(false);
    },
    onError: (err: any) => {
      console.error(err);
      addToast({
        title: "Upload Failed",
        description: err.response?.data?.message || "Failed to upload receipt.",
        color: "danger",
      });
    },
  });

  const setReceiptFromFileList = (files: FileList | null) => {
    const file = files?.[0] ?? null;
    if (!file) {
      setReceiptFile(null);
      return;
    }
    setReceiptFile(file);
  };

  if (!order) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          Order Details #00{order.id}
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <section>
                <p className="text-xs font-bold uppercase text-default-400">Customer</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-default-200 flex items-center justify-center font-bold">
                    {order.user.firstName?.[0] || "U"}
                  </div>
                  <div>
                    <p className="font-semibold">{order.user.firstName}</p>
                    <p className="text-sm text-default-500">@{order.user.username || "no_username"}</p>
                  </div>
                </div>
              </section>

              <section>
                <p className="text-xs font-bold uppercase text-default-400">Shipping Address</p>
                <p className="mt-2 text-sm text-default-700 bg-default-100 p-2 rounded-lg italic">
                  "{order.shippingAddress}"
                </p>
              </section>
            </div>

            <Divider />

            <section>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-default-400">Items</p>
                <Chip size="sm" variant="flat" color={statusColorMap[order.status]}>
                  {order.status}
                </Chip>
              </div>
              <div className="mt-2 space-y-2">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-center bg-default-50 p-2 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{item.productName}</p>
                      <p className="text-xs text-default-500">
                        Qty: {item.quantity} × {formatBirr(item.price)} Birr
                      </p>
                    </div>
                    <p className="font-bold text-sm">
                      {formatBirr(item.price * item.quantity)} Birr
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-between items-center px-1">
                <p className="font-semibold">Total Amount</p>
                <p className="font-semibold text-primary">
                  {formatBirr(order.totalAmount)} Birr
                </p>
              </div>
            </section>

            <Divider />

            <section>
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-default-400">Receipt</p>
                {order.receiptUrl ? (
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setIsReceiptPreviewOpen(true)}
                  >
                    View / Download
                  </Button>
                ) : (
                  <span className="text-xs text-default-500">No receipt yet</span>
                )}
              </div>

              <input
                ref={receiptInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setReceiptFromFileList(e.target.files)}
                disabled={mutation.isPending || receiptMutation.isPending}
              />

              <div
                role="button"
                tabIndex={0}
                aria-label="Upload receipt"
                onClick={() => receiptInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    receiptInputRef.current?.click();
                  }
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!receiptMutation.isPending) setIsDraggingReceipt(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!receiptMutation.isPending) setIsDraggingReceipt(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingReceipt(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingReceipt(false);
                  if (receiptMutation.isPending) return;
                  setReceiptFromFileList(e.dataTransfer.files);
                }}
                className={[
                  "mt-2 rounded-xl border border-dashed px-3 py-3 transition",
                  "bg-default-50",
                  isDraggingReceipt ? "border-default-500" : "border-default-300",
                  receiptMutation.isPending ? "opacity-60 pointer-events-none" : "",
                ].join(" ")}
              >
                {receiptFile ? (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-default-700 line-clamp-1">
                        {receiptFile.name}
                      </p>
                      <p className="text-xs text-default-500">
                        {(receiptFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="flat"
                        onPress={() => setReceiptFile(null)}
                      >
                        Clear
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        color="primary"
                        isLoading={receiptMutation.isPending}
                        onPress={() => receiptFile && receiptMutation.mutate(receiptFile)}
                      >
                        Upload
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-default-700">
                      Drop a file here, or click to browse
                    </p>
                    <p className="text-xs text-default-500">
                      Any file type up to 25MB.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <Modal
              isOpen={isReceiptPreviewOpen}
              onClose={() => setIsReceiptPreviewOpen(false)}
              size="2xl"
              scrollBehavior="inside"
            >
              <ModalContent>
                <ModalHeader className="flex flex-col gap-1">Receipt Preview</ModalHeader>
                <ModalBody>
                  {receiptUrl ? (
                    <div className="flex flex-col gap-4">
                      <div className="rounded-lg border border-default-200 bg-default-50 p-3">
                        {isImageReceipt ? (
                          <img
                            src={receiptUrl}
                            alt="Receipt"
                            className="max-h-[70vh] w-full object-contain"
                          />
                        ) : isPdfReceipt ? (
                          <iframe
                            src={receiptUrl}
                            title="Receipt PDF"
                            className="h-[70vh] w-full rounded-md"
                          />
                        ) : (
                          <p className="text-sm text-default-500">
                            Preview not available for this file type.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </ModalBody>
                <ModalFooter>
                  <Button variant="light" onPress={() => setIsReceiptPreviewOpen(false)}>
                    Close
                  </Button>
                  <Button color="primary" onPress={downloadReceipt} isDisabled={!receiptUrl}>
                    Download
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>

            <Divider />

            <section>
              <p className="text-xs font-bold uppercase text-default-400 mb-2">Update Order Status</p>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {statusOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={order.status === option.value ? "solid" : "flat"}
                    color={option.color}
                    size="sm"
                    isLoading={mutation.isPending}
                    onPress={() => mutation.mutate(option.value)}
                    startContent={option.icon}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </section>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} startContent={<X className="h-4 w-4" />}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
