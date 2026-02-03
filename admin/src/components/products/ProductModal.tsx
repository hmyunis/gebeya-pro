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
import type { Category, PaginatedResponse, Product } from "../../types";
import { getImageUrl } from "../../types";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product?: Product | null;
}

export default function ProductModal({ isOpen, onClose, product }: ProductModalProps) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      await mutation.mutateAsync(formData);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast({
        title: `Product ${mutationVerb}`,
        description: `The product has been ${mutationVerb} successfully.`,
        color: "success",
      });
      onClose();
      setPreview(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (product?.imageUrl) {
      setPreview(getImageUrl(product.imageUrl));
    } else {
      setPreview(null);
    }
  }, [isOpen, product]);

  const defaultCategoryKey = useMemo(() => {
    if (!product?.category?.id) return undefined;
    return new Set([String(product.category.id)]);
  }, [product]);

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
                <div className="aspect-square w-full overflow-hidden rounded-xl border-2 border-dashed border-default-300 bg-default-100 relative flex items-center justify-center">
                  {preview ? (
                    <img src={preview} alt="Preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-default-400 text-sm">No Image</span>
                  )}
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileChange}
                    required={!product}
                  />
                </div>
                <p className="text-center text-xs text-default-400 mt-2">
                  {product ? "Change image" : "Upload image"} (Max 25MB)
                </p>
              </div>

              {/* Inputs Section - Takes remaining width */}
              <div className="flex-1 flex flex-col gap-4">
                <Input
                  label="Product Name"
                  name="name"
                  required={!product}
                  defaultValue={product?.name}
                  placeholder="e.g. iPhone 15"
                />

                <div className="flex flex-col gap-4 sm:flex-row">
                  <Input
                    type="number"
                    label="Price"
                    name="price"
                    required={!product}
                    endContent="Birr"
                    step="0.01"
                    defaultValue={product?.price !== undefined ? String(product.price) : undefined}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    label="Stock"
                    name="stock"
                    required={!product}
                    placeholder="10"
                    defaultValue={product?.stock !== undefined ? String(product.stock) : undefined}
                    className="flex-1"
                  />
                </div>

                <Select
                  label="Category"
                  name="categoryId"
                  required={!product}
                  placeholder="Select a category"
                  defaultSelectedKeys={defaultCategoryKey}
                >
                  {categories.map((cat) => (
                    <SelectItem key={String(cat.id)} textValue={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </Select>

                <Textarea
                  label="Description"
                  name="description"
                  placeholder="Product details..."
                  defaultValue={product?.description}
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
            startContent={<Check className="h-4 w-4" />}
          >
            {actionLabel}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}