import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  CardBody,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  addToast,
  ScrollShadow,
} from "@heroui/react";
import { useStore } from "@nanostores/react";
import { Copy } from "lucide-react";

import { api } from "@/lib/api";
import { API_BASE } from "@/config/env";
import { resolveImageUrl } from "@/lib/images";
import { formatBirrLabel } from "@/lib/money";
import {
  $cartItems,
  clearCart,
  type CartItem,
} from "@/features/cart/store/cartStore";
import { $user } from "@/features/auth/store/authStore";

type BankAccount = {
  id: number;
  bankName: string;
  logoUrl: string | null;
  accountHolderName: string;
  accountNumber: string;
  status: "ACTIVE" | "INACTIVE";
};

export default function OrderModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const cartItems = useStore($cartItems);
  const user = useStore($user);

  const items = useMemo(() => Object.values(cartItems), [cartItems]);
  const total = useMemo(
    () => items.reduce((acc, item) => acc + item.price * item.quantity, 0),
    [items]
  );
  const checkoutProductIds = useMemo(
    () =>
      items
        .map((item) => item.id)
        .sort((a, b) => a - b)
        .join(","),
    [items]
  );

  const [address, setAddress] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreviewUrl, setReceiptPreviewUrl] = useState<string | null>(
    null
  );
  const [isReceiptPreviewOpen, setIsReceiptPreviewOpen] = useState(false);
  const bankAccountsQuery = useQuery({
    queryKey: ["bank-accounts", checkoutProductIds],
    queryFn: async ({ signal }) => {
      const response = await api.get("/bank-accounts", {
        signal,
        params: {
          productIds: checkoutProductIds || undefined,
        },
      });
      return Array.isArray(response.data) ? (response.data as BankAccount[]) : [];
    },
    enabled: isOpen && items.length > 0,
    staleTime: 60_000,
  });

  const orderMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      await api.post("/orders", formData);
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setAddress("");
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      setIsReceiptPreviewOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  const bankAccounts = bankAccountsQuery.data ?? [];
  const isBankAccountsLoading = bankAccountsQuery.isPending;

  useEffect(() => {
    if (!receiptFile || !receiptFile.type.startsWith("image/")) {
      setReceiptPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(receiptFile);
    setReceiptPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [receiptFile]);

  if (!isOpen) return null;

  const activeBankAccounts = bankAccounts.filter(
    (account) => account.status === "ACTIVE"
  );

  const canSubmit =
    Boolean(user) &&
    items.length > 0 &&
    address.trim().length > 0 &&
    Boolean(receiptFile);

  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.top = "0";
        textarea.style.left = "0";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      addToast({
        title: "Copied",
        description: "Account number copied to clipboard.",
        color: "success",
      });
    } catch (error) {
      console.error("Copy failed", error);
      addToast({
        title: "Copy failed",
        description: "Could not copy account number. Please copy it manually.",
        color: "danger",
      });
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    if (!canSubmit) return;
    if (orderMutation.isPending) return;

    try {
      const payloadItems = items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      }));

      const formData = new FormData();
      formData.append("shippingAddress", address.trim());
      formData.append("items", JSON.stringify(payloadItems));
      if (receiptFile) {
        formData.append("receipt", receiptFile);
      }

      await orderMutation.mutateAsync(formData);

      addToast({
        title: "Order placed",
        description: "We will confirm your order on Telegram.",
        color: "success",
      });

      clearCart();
      onClose();
    } catch (error: any) {
      console.error("Order error:", error);
      addToast({
        title: "Order failed",
        description: error?.response?.data?.message || "Please try again.",
        color: "danger",
      });
    }
  };

  const setReceiptFromFileList = (files: FileList | null) => {
    const file = files?.[0] ?? null;
    if (!file) {
      setReceiptFile(null);
      setReceiptPreviewUrl(null);
      return;
    }
    setReceiptFile(file);
  };

  return (
    <div className="fixed inset-0 z-60">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Finalize your order"
        className="absolute left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-3xl border border-black/10 bg-white/95 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-black/5 px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
              Finalize
            </p>
            <p className="text-lg font-semibold">Review & confirm</p>
          </div>
          <Button
            isIconOnly
            variant="light"
            radius="full"
            aria-label="Close order modal"
            onPress={onClose}
          >
            ✕
          </Button>
        </div>

        <div className="grid max-h-[calc(100vh-140px)] gap-5 overflow-y-auto p-5 md:grid-cols-[1.2fr_0.8fr] md:p-6">
          <div className="glass-strong rounded-3xl p-5 md:p-6">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                Your order
              </p>
              <span className="rounded-full border border-black/10 bg-white/80 px-3 py-1 text-[10px] text-ink-muted">
                {items.length} items
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {items.map((item: CartItem) => {
                const image = resolveImageUrl(API_BASE, item.image);

                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-2xl border border-black/5 bg-white/60 px-3 py-3"
                  >
                    <div className="h-14 w-14 overflow-hidden rounded-2xl border border-black/5 bg-white">
                      {image ? (
                        <img
                          src={image}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug line-clamp-1">
                        {item.name}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[11px] text-ink-muted">
                          {item.quantity} × {formatBirrLabel(item.price)}
                        </p>
                        <p className="text-sm font-semibold sm:hidden">
                          {formatBirrLabel(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                    <p className="hidden shrink-0 text-sm font-semibold sm:block">
                      {formatBirrLabel(item.price * item.quantity)}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span className="text-[#12141a]">{formatBirrLabel(total)}</span>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                  Bank details
                </p>
              </div>

              <div className="mt-3">
                {isBankAccountsLoading ? (
                  <p className="text-xs text-ink-muted">
                    Loading bank accounts...
                  </p>
                ) : activeBankAccounts.length === 0 ? (
                  <p className="text-xs text-ink-muted">
                    No bank accounts available.
                  </p>
                ) : (
                  <ScrollShadow
                    orientation="vertical"
                    hideScrollBar
                    size={32}
                    offset={8}
                    className="max-h-56 space-y-2 pr-1"
                  >
                    {activeBankAccounts.map((account) => (
                      <div
                        key={account.id}
                        className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-lg border border-black/10 bg-white">
                            {account.logoUrl ? (
                              <img
                                src={account.logoUrl}
                                alt={account.bankName}
                                className="h-full w-full object-cover"
                              />
                            ) : null}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-[#12141a]">
                              {account.bankName}
                            </p>
                            <p className="text-[11px] text-ink-muted">
                              {account.accountHolderName}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-[#12141a]">
                              {account.accountNumber}
                            </p>
                            <p className="text-[11px] text-ink-muted">
                              Account number
                            </p>
                          </div>
                          <Button
                            type="button"
                            isIconOnly
                            size="sm"
                            radius="full"
                            variant="light"
                            aria-label="Copy account number"
                            onPress={() =>
                              copyToClipboard(account.accountNumber)
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </ScrollShadow>
                )}
              </div>
            </div>
          </div>

          <Card shadow="sm" className="glass-strong border-none">
            <CardBody className="p-5 md:p-6">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                    Delivery
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    Where should we send it?
                  </p>
                </div>

                <div className="space-y-4">
                  <Input
                    isRequired
                    label="Full address"
                    placeholder="e.g. Bole, Addis Ababa"
                    value={address}
                    onValueChange={(val) => {
                      if (val.length <= 30) setAddress(val);
                    }}
                    isDisabled={orderMutation.isPending}
                    variant="bordered"
                    maxLength={30}
                  />

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] uppercase tracking-[0.35em] text-ink-muted">
                        Receipt upload
                      </p>
                      <span className="text-[11px] text-ink-muted">
                        Required
                      </span>
                    </div>

                    <input
                      type="file"
                      onChange={(e) => setReceiptFromFileList(e.target.files)}
                      disabled={orderMutation.isPending}
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-[#12141a] file:mr-3 file:rounded-full file:border-0 file:bg-black/5 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-[#12141a]"
                    />

                    {receiptFile ? (
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-black/5 bg-white/70 px-4 py-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#12141a] line-clamp-1">
                            {receiptFile.name}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            {(receiptFile.size / (1024 * 1024)).toFixed(2)} MB
                          </p>
                          {receiptPreviewUrl ? (
                            <button
                              type="button"
                              onClick={() => setIsReceiptPreviewOpen(true)}
                              className="mt-2 flex items-center gap-2 text-[11px] font-semibold text-ink-muted underline underline-offset-4 hover:text-[#12141a]"
                            >
                              View preview
                            </button>
                          ) : null}
                        </div>
                        {receiptPreviewUrl ? (
                          <button
                            type="button"
                            onClick={() => setIsReceiptPreviewOpen(true)}
                            className="h-12 w-12 overflow-hidden rounded-xl border border-black/10 bg-white"
                            aria-label="Open receipt preview"
                          >
                            <img
                              src={receiptPreviewUrl}
                              alt="Receipt preview"
                              className="h-full w-full object-cover"
                            />
                          </button>
                        ) : null}
                        <Button
                          type="button"
                          size="sm"
                          variant="flat"
                          onPress={() => setReceiptFile(null)}
                        >
                          Clear
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-ink-muted">
                        Any file type up to 25MB.
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  color="primary"
                  fullWidth
                  size="lg"
                  isLoading={orderMutation.isPending}
                  isDisabled={!canSubmit || orderMutation.isPending}
                  className="bg-[#12141a] text-white"
                >
                  Confirm order
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>

      <Modal
        isOpen={isReceiptPreviewOpen}
        onClose={() => setIsReceiptPreviewOpen(false)}
        size="lg"
        scrollBehavior="inside"
        classNames={{
          wrapper: "!z-[120]",
          backdrop: "!z-[120]",
          base: "!z-[121]",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            Receipt preview
          </ModalHeader>
          <ModalBody>
            {receiptPreviewUrl ? (
              <div className="max-h-[70vh] overflow-auto rounded-2xl border border-black/10 bg-white p-3">
                <img
                  src={receiptPreviewUrl}
                  alt="Receipt preview"
                  className="mx-auto h-auto max-h-[70vh] w-auto max-w-full"
                />
              </div>
            ) : (
              <p className="text-sm text-ink-muted">
                No image preview available.
              </p>
            )}
          </ModalBody>
          <ModalFooter>
            <Button
              variant="light"
              onPress={() => setIsReceiptPreviewOpen(false)}
            >
              Close
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
