import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
  addToast,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useInfiniteScroll } from "@heroui/use-infinite-scroll";
import { Plus, Trash, X } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import type { PaginatedResponse, Product, User } from "../../types";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type OrderItemForm = {
  productId?: number;
  quantity: number;
};

export default function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [shippingAddress, setShippingAddress] = useState("");
  const [items, setItems] = useState<OrderItemForm[]>([{ quantity: 1 }]);
  const [productItems, setProductItems] = useState<Product[]>([]);
  const [productPage, setProductPage] = useState(1);
  const [productHasMore, setProductHasMore] = useState(true);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isProductSelectOpen, setIsProductSelectOpen] = useState(false);

  const PRODUCTS_LIMIT = 10;
  const loadProducts = async (page: number) => {
    if (isProductsLoading) return;
    setIsProductsLoading(true);
    try {
      const response = await api.get<PaginatedResponse<Product>>('/products', {
        params: { page, limit: PRODUCTS_LIMIT },
      });
      const nextItems = response.data.data ?? [];
      setProductItems((prev) => {
        const existing = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        for (const item of nextItems) {
          if (!existing.has(item.id)) {
            merged.push(item);
          }
        }
        return merged;
      });
      setProductHasMore(response.data.meta?.hasNext ?? false);
    } finally {
      setIsProductsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setProductItems([]);
    setProductPage(1);
    setProductHasMore(true);
    loadProducts(1);
  }, [isOpen]);

  const onLoadMoreProducts = () => {
    if (!productHasMore || isProductsLoading) return;
    const nextPage = productPage + 1;
    setProductPage(nextPage);
    loadProducts(nextPage);
  };

  const [, productScrollRef] = useInfiniteScroll({
    hasMore: productHasMore,
    isEnabled: isProductSelectOpen,
    shouldUseLoader: false,
    onLoadMore: onLoadMoreProducts,
  });

  const productOptions = useMemo(
    () =>
      productItems.map((product) => ({
        id: product.id,
        name: product.name,
      })),
    [productItems]
  );

  const { data: usersResponse, isFetching: isUsersLoading } = useQuery<PaginatedResponse<User>>({
    queryKey: ['admin', 'users', userSearch],
    queryFn: async () =>
      (
        await api.get('/admin/users', {
          params: { search: userSearch, page: 1, limit: 20 },
        })
      ).data,
    enabled: userSearch.trim().length > 1,
  });

  const users = usersResponse?.data ?? [];

  const mutation = useMutation({
    mutationFn: async () => {
      const parsedUserId = Number.parseInt(userId, 10);
      if (!Number.isFinite(parsedUserId)) {
        throw new Error("Invalid user ID");
      }

      const payloadItems = items
        .filter((item) => item.productId && item.quantity > 0)
        .map((item) => ({
          productId: item.productId as number,
          quantity: item.quantity,
        }));

      if (!payloadItems.length) {
        throw new Error("Add at least one product");
      }

      return api.post('/orders/admin', {
        userId: parsedUserId,
        shippingAddress: shippingAddress.trim(),
        items: payloadItems,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders', 'status-counts'] });
      addToast({
        title: "Order Created",
        description: "The order has been created successfully.",
        color: "success",
      });
      setUserId("");
      setUserSearch("");
      setSelectedUser(null);
      setShippingAddress("");
      setItems([{ quantity: 1 }]);
      onClose();
    },
    onError: (err: any) => {
      console.error(err);
      addToast({
        title: "Failed to create order",
        description: err.response?.data?.message || err.message || "Try again.",
        color: "danger",
      });
    },
  });

  const updateItem = (index: number, next: Partial<OrderItemForm>) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, ...next } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">Create Manual Order</ModalHeader>
        <ModalBody>
          <div className="space-y-6">
            <section className="space-y-3">
              <div className="space-y-2">
                <Input
                  label="Search User"
                  value={userSearch}
                  onValueChange={(value) => {
                    setUserSearch(value);
                    if (!value) {
                      setSelectedUser(null);
                      setUserId("");
                    }
                  }}
                  placeholder="Search by name, username, or telegram id"
                  isRequired
                />
                {selectedUser ? (
                  <div className="text-sm text-default-500">
                    Selected: <span className="font-medium text-default-700">{selectedUser.firstName}</span>{" "}
                    <span className="text-default-400">@{selectedUser.username || "no_username"}</span>
                  </div>
                ) : null}
                {userSearch.trim().length > 1 && !selectedUser ? (
                  <div className="max-h-44 overflow-auto rounded-lg border border-default-200 bg-content1 p-2">
                    {isUsersLoading ? (
                      <p className="text-xs text-default-400 px-2 py-1">Searching...</p>
                    ) : users.length ? (
                      users.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(user);
                            setUserId(String(user.id));
                            setUserSearch(user.firstName ?? "");
                          }}
                          className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-default-100"
                        >
                          <div className="font-medium">{user.firstName || "Unnamed user"}</div>
                          <div className="text-xs text-default-400">
                            @{user.username || "no_username"} · ID {user.id}
                          </div>
                        </button>
                      ))
                    ) : (
                      <p className="text-xs text-default-400 px-2 py-1">No matching users.</p>
                    )}
                  </div>
                ) : null}
              </div>
              <Textarea
                label="Shipping Address"
                value={shippingAddress}
                onValueChange={setShippingAddress}
                placeholder="Customer address..."
                minRows={3}
                isRequired
              />
            </section>

            <Divider />

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Items</p>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() => setItems((prev) => [...prev, { quantity: 1 }])}
                  startContent={<Plus className="h-3.5 w-3.5" />}
                >
                  Add Item
                </Button>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={`item-${index}`} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                    <Select
                      className="sm:col-span-8"
                      label={index === 0 ? "Product" : undefined}
                      placeholder="Select product"
                      isLoading={isProductsLoading}
                      scrollRef={productScrollRef}
                      onOpenChange={setIsProductSelectOpen}
                      selectedKeys={
                        item.productId ? new Set([String(item.productId)]) : new Set([])
                      }
                      onSelectionChange={(keys) => {
                        const selected = Array.from(keys)[0];
                        updateItem(index, {
                          productId: selected ? Number(selected) : undefined,
                        });
                      }}
                    >
                      {productOptions.map((product) => (
                        <SelectItem key={String(product.id)} textValue={product.name}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </Select>
                    <Input
                      className="sm:col-span-3"
                      label={index === 0 ? "Qty" : undefined}
                      type="number"
                      min={1}
                      value={String(item.quantity)}
                      onValueChange={(value) =>
                        updateItem(index, { quantity: Number.parseInt(value || "1", 10) || 1 })
                      }
                    />
                    <div className="sm:col-span-1 flex items-end">
                      <Button
                        isIconOnly
                        variant="light"
                        color="danger"
                        isDisabled={items.length === 1}
                        onPress={() => removeItem(index)}
                        aria-label="Remove item"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose} startContent={<X className="h-4 w-4" />}>
            Cancel
          </Button>
          <Button
            color="primary"
            onPress={() => mutation.mutate()}
            isLoading={mutation.isPending}
          >
            Create Order
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
