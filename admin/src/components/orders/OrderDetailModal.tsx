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
import type { Order, OrderStatus } from "../../types";
import type { JSX } from "react";

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
