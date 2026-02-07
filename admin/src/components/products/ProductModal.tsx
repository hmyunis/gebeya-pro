import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  addToast,
} from "@heroui/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import type {
  Category,
  MerchantUser,
  PaginatedResponse,
  Product,
} from "../../types";
import { getImageUrl } from "../../types";
import ProductImageUploader, {
  type ExistingProductImage,
  type ProductImageSelection,
} from "./ProductImageUploader";

const MAX_PRODUCT_IMAGES = 5;

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
  isAdmin?: boolean;
}

export default function ProductModal({
  isOpen,
  onClose,
  product,
  isAdmin = false,
}: ProductModalProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [existingImages, setExistingImages] = useState<ExistingProductImage[]>([]);
  const [imageSelection, setImageSelection] = useState<ProductImageSelection>({
    retainedImagePaths: [],
    newFiles: [],
    filledSlotsCount: 0,
  });
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [ownerScope, setOwnerScope] = useState<"self" | "merchant">("self");
  const [merchantSearch, setMerchantSearch] = useState("");
  const [merchantId, setMerchantId] = useState<string | null>(null);

  const { data: categoriesResponse } = useQuery<PaginatedResponse<Category>>({
    queryKey: ['categories', 'select-options'],
    queryFn: async () =>
      (
        await api.get('/categories', {
          params: { page: 1, limit: 100 },
        })
      ).data,
  });

  const categories = categoriesResponse?.data ?? [];
  const { data: merchantsResponse, isLoading: isLoadingMerchants } = useQuery<
    PaginatedResponse<MerchantUser>
  >({
    queryKey: ["merchants", "product-modal", merchantSearch],
    queryFn: async () =>
      (
        await api.get("/merchants", {
          params: {
            page: 1,
            limit: 25,
            archive: "active",
            search: merchantSearch.trim() || undefined,
          },
        })
      ).data,
    enabled: isAdmin && isOpen,
  });
  const merchants = merchantsResponse?.data ?? [];

  const actionLabel = product ? "Update Product" : "Create Product";
  const headerLabel = product ? "Edit Product" : "Add New Product";
  const mutationVerb = product ? "updated" : "created";

  const createMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return api.post('/products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!product) return null;
      return api.patch(`/products/${product.id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
  });

  const mutation = product ? updateMutation : createMutation;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData();
    formData.append("name", name.trim());
    formData.append("price", price.trim());
    formData.append("stock", stock.trim());
    formData.append("description", description);
    if (categoryId) {
      formData.append("categoryId", categoryId);
    }
    if (isAdmin) {
      formData.append(
        "merchantId",
        ownerScope === "merchant" ? merchantId ?? "null" : "null",
      );
    }
    if (product) {
      formData.append(
        "retainedImageUrls",
        JSON.stringify(imageSelection.retainedImagePaths),
      );
    }
    imageSelection.newFiles.forEach((file) => {
      formData.append("images", file);
    });

    try {
      await mutation.mutateAsync(formData);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast({
        title: `Product ${mutationVerb}`,
        description: `The product has been ${mutationVerb} successfully.`,
        color: "success",
      });
      onClose();
      setImageSelection({
        retainedImagePaths: [],
        newFiles: [],
        filledSlotsCount: 0,
      });
    } catch (err: any) {
      console.error(err);
      addToast({
        title: "Error",
        description: err.response?.data?.message || `Failed to ${product ? 'update' : 'create'} product`,
        color: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const nextExistingImagePaths = product
      ? product.imageUrls?.length
        ? product.imageUrls
        : product.imageUrl
          ? [product.imageUrl]
          : []
      : [];

    setExistingImages(
      nextExistingImagePaths.map((path) => ({
        path,
        url: getImageUrl(path),
      })),
    );
    setImageSelection({
      retainedImagePaths: nextExistingImagePaths,
      newFiles: [],
      filledSlotsCount: nextExistingImagePaths.length,
    });
    setName(product?.name ?? "");
    setPrice(product?.price !== undefined ? String(product.price) : "");
    setStock(product?.stock !== undefined ? String(product.stock) : "");
    setCategoryId(product?.category?.id ? String(product.category.id) : null);
    setDescription(product?.description ?? "");
    setOwnerScope(product?.merchantId ? "merchant" : "self");
    setMerchantId(
      product?.merchantId !== undefined && product?.merchantId !== null
        ? String(product.merchantId)
        : null,
    );
    setMerchantSearch("");
  }, [isOpen, product]);

  const defaultCategoryKey = useMemo(() => {
    if (!product?.category?.id) return undefined;
    return new Set([String(product.category.id)]);
  }, [product]);

  const isFormValid = useMemo(() => {
    const hasBasics =
      name.trim().length > 0 &&
      price.trim().length > 0 &&
      stock.trim().length > 0 &&
      description.trim().length > 0;
    const hasCategory = Boolean(categoryId);
    const hasRequiredImage = imageSelection.filledSlotsCount > 0;
    const hasValidCount = imageSelection.filledSlotsCount <= MAX_PRODUCT_IMAGES;
    const hasOwnerSelection =
      !isAdmin || ownerScope === "self" || Boolean(merchantId);
    return (
      hasBasics &&
      hasCategory &&
      hasRequiredImage &&
      hasValidCount &&
      hasOwnerSelection
    );
  }, [
    categoryId,
    description,
    imageSelection.filledSlotsCount,
    isAdmin,
    merchantId,
    name,
    ownerScope,
    price,
    stock,
  ]);

  const requiredLabel = (label: string) => (
    <span className="inline-flex items-center gap-1">
      <span>{label}</span>
      <span className="text-danger" aria-hidden="true">*</span>
    </span>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="3xl"
      scrollBehavior="inside"
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">{headerLabel}</ModalHeader>
        
        <ModalBody>
          {/* Form is now INSIDE the scrollable body */}
          <form id="product-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* Image Section - Fixed width on Desktop */}
              <div className="w-full md:w-60 shrink-0">
                <ProductImageUploader
                  key={`${product?.id ?? "new"}-${isOpen ? "open" : "closed"}`}
                  initialExistingImages={existingImages}
                  onSelectionChange={setImageSelection}
                />
              </div>

              {/* Inputs Section - Takes remaining width */}
              <div className="flex-1 flex flex-col gap-4">
                <Input
                  label={requiredLabel("Product Name")}
                  name="name"
                  required
                  value={name}
                  onValueChange={setName}
                  placeholder="e.g. iPhone 15"
                />

                <div className="flex flex-col gap-4 sm:flex-row">
                  <Input
                    type="number"
                    label={requiredLabel("Price")}
                    name="price"
                    required
                    endContent="Birr"
                    step="0.01"
                    value={price}
                    onValueChange={setPrice}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    label={requiredLabel("Stock")}
                    name="stock"
                    required
                    placeholder="10"
                    value={stock}
                    onValueChange={setStock}
                    className="flex-1"
                  />
                </div>

                <Select
                  label={requiredLabel("Category")}
                  name="categoryId"
                  required
                  placeholder="Select a category"
                  defaultSelectedKeys={defaultCategoryKey}
                  selectedKeys={categoryId ? new Set([categoryId]) : new Set([])}
                  onSelectionChange={(keys) => {
                    const selected =
                      keys === "all" ? undefined : Array.from(keys)[0];
                    setCategoryId(selected ? String(selected) : null);
                  }}
                >
                  {categories.map((cat) => (
                    <SelectItem key={String(cat.id)} textValue={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </Select>

                {isAdmin ? (
                  <div className="grid gap-4 rounded-xl border border-default-200 p-4">
                    <Select
                      label={requiredLabel("Owner Scope")}
                      selectedKeys={new Set([ownerScope])}
                      onSelectionChange={(keys) => {
                        const selected =
                          keys === "all" ? undefined : Array.from(keys)[0];
                        if (selected === "self" || selected === "merchant") {
                          setOwnerScope(selected);
                          if (selected === "self") {
                            setMerchantId(null);
                          }
                        }
                      }}
                    >
                      <SelectItem key="self">My product</SelectItem>
                      <SelectItem key="merchant">On behalf of merchant</SelectItem>
                    </Select>

                    {ownerScope === "merchant" ? (
                      <>
                        <Input
                          label="Search Merchant"
                          placeholder="Search by name or username"
                          value={merchantSearch}
                          onValueChange={setMerchantSearch}
                        />
                        <Select
                          label={requiredLabel("Merchant")}
                          placeholder="Select merchant"
                          selectedKeys={
                            merchantId ? new Set([merchantId]) : new Set([])
                          }
                          onSelectionChange={(keys) => {
                            const selected =
                              keys === "all" ? undefined : Array.from(keys)[0];
                            setMerchantId(selected ? String(selected) : null);
                          }}
                          isLoading={isLoadingMerchants}
                        >
                          {merchants.map((merchant) => (
                            <SelectItem key={String(merchant.id)}>
                              {merchant.firstName ||
                                merchant.loginUsername ||
                                `Merchant #${merchant.id}`}
                            </SelectItem>
                          ))}
                        </Select>
                      </>
                    ) : null}
                  </div>
                ) : null}

                <Textarea
                  label={requiredLabel("Description")}
                  name="description"
                  required
                  placeholder="Product details..."
                  value={description}
                  onValueChange={setDescription}
                  minRows={3}
                />
              </div>
            </div>
          </form>
        </ModalBody>
        
        <ModalFooter>
          <Button color="danger" variant="light" onPress={onClose} startContent={<X className="h-4 w-4" />}>
            Cancel
          </Button>
          {/* Linked to the form via form="product-form" attribute */}
          <Button
            color="primary"
            type="submit"
            form="product-form"
            isLoading={isLoading}
            isDisabled={!isFormValid || isLoading}
            startContent={<Check className="h-4 w-4" />}
          >
            {actionLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
