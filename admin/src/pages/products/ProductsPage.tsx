import { useEffect, useMemo, useState } from "react";
import {
  User,
  Chip,
  Tooltip,
  Button,
  Input,
  useDisclosure,
  Tabs,
  Tab,
  Card,
  CardBody,
  addToast,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import { type ColumnDef } from "@tanstack/react-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FloppyDisk, PencilSimple, Plus, Tag, Trash, X } from "@phosphor-icons/react";
import { api } from "../../lib/api";
import { getImageUrl } from "../../types";
import type { Product, Category, PaginatedResponse } from "../../types";
import ProductModal from "../../components/products/ProductModal";
import { DataTable } from "../../components/table/DataTable";
import { DataTablePagination } from "../../components/table/DataTablePagination";

export default function ProductsPage() {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryEditName, setCategoryEditName] = useState("");
  const [categoryEditOriginalName, setCategoryEditOriginalName] = useState("");
  const [productsPage, setProductsPage] = useState(1);
  const [productsLimit, setProductsLimit] = useState(10);
  const [categoriesPage, setCategoriesPage] = useState(1);
  const [categoriesLimit, setCategoriesLimit] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "product" | "category";
    id: number;
    name: string;
  } | null>(null);

  const { data: productsResponse, isLoading } = useQuery<PaginatedResponse<Product>>({
    queryKey: ['products', search, productsPage, productsLimit],
    queryFn: async () => {
      const endpoint = search.length > 2 ? '/products/search' : '/products';
      return (
        await api.get(endpoint, {
          params: { q: search.length > 2 ? search : undefined, page: productsPage, limit: productsLimit },
        })
      ).data;
    },
  });

  const { data: categoriesResponse, isLoading: isLoadingCategories } = useQuery<PaginatedResponse<Category>>({
    queryKey: ['categories', categoriesPage, categoriesLimit],
    queryFn: async () =>
      (
        await api.get('/categories', {
          params: { page: categoriesPage, limit: categoriesLimit },
        })
      ).data,
  });

  const products = productsResponse?.data ?? [];
  const productsMeta = productsResponse?.meta;
  const categories = categoriesResponse?.data ?? [];
  const categoriesMeta = categoriesResponse?.meta;
  const productsTotalPages = Math.max(1, productsMeta?.totalPages ?? 1);
  const categoriesTotalPages = Math.max(1, categoriesMeta?.totalPages ?? 1);

  useEffect(() => {
    setProductsPage(1);
  }, [search]);

  type CategoryRow = Category & { __editing?: boolean };

  const categoriesWithEditState = useMemo<CategoryRow[]>(() => {
    const editingId = editingCategory ? String(editingCategory.id) : null;
    return categories.map((category) => ({
      ...category,
      __editing: editingId !== null && String(category.id) === editingId,
    }));
  }, [categories, editingCategory, categoryEditName]);

  const createCategoryMutation = useMutation({
    mutationFn: async (name: string) => {
      return api.post('/categories', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast({
        title: "Category Created",
        description: "The category has been added.",
        color: "success",
      });
      setCategoryName("");
    },
    onError: (err: any) => {
      console.error(err);
      addToast({
        title: "Error",
        description: err.response?.data?.message || "Failed to create category",
        color: "danger",
      });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      return api.patch(`/categories/${id}`, { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast({
        title: "Category Updated",
        description: "The category has been updated.",
        color: "success",
      });
      setEditingCategory(null);
      setCategoryEditName("");
    },
    onError: (err: any) => {
      console.error(err);
      addToast({
        title: "Error",
        description: err.response?.data?.message || "Failed to update category",
        color: "danger",
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      addToast({
        title: "Category Deleted",
        description: "The category has been removed.",
        color: "success",
      });
    },
    onError: (err: any) => {
      console.error(err);
      addToast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete category",
        color: "danger",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      addToast({
        title: "Product Deleted",
        description: "The product has been removed.",
        color: "success",
      });
    },
    onError: (err: any) => {
      console.error(err);
      addToast({
        title: "Error",
        description: err.response?.data?.message || "Failed to delete product",
        color: "danger",
      });
    },
  });

  const productsOffset = ((productsMeta?.page ?? 1) - 1) * (productsMeta?.limit ?? products.length);
  const categoriesOffset = ((categoriesMeta?.page ?? 1) - 1) * (categoriesMeta?.limit ?? categories.length);

  const handleCreateCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!categoryName.trim()) return;
    await createCategoryMutation.mutateAsync(categoryName.trim());
  };

  const handleOpenCreate = () => {
    setSelectedProduct(null);
    onOpen();
  };

  const handleCloseModal = () => {
    onClose();
    setSelectedProduct(null);
  };

  const handleStartCategoryEdit = (category: Category) => {
    setEditingCategory(category);
    setCategoryEditName(category.name);
    setCategoryEditOriginalName(category.name);
    console.log("Editing category:", category);
  };

  const handleCancelCategoryEdit = () => {
    setCategoryEditName(categoryEditOriginalName);
    setEditingCategory(null);
    setCategoryEditOriginalName("");
  };

  const handleSaveCategoryEdit = async () => {
    if (!editingCategory) return;
    if (!categoryEditName.trim()) return;
    await updateCategoryMutation.mutateAsync({
      id: editingCategory.id,
      name: categoryEditName.trim(),
    });
  };

  const productColumns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        header: "#",
        cell: ({ row }) => (
          <p className="text-sm text-default-500">{productsOffset + row.index + 1}</p>
        ),
      },
      {
        header: "PRODUCT",
        cell: ({ row }) => (
          <User
            avatarProps={{ radius: "lg", src: getImageUrl(row.original.imageUrl) }}
            description={row.original.slug}
            name={row.original.name}
          >
            {row.original.name}
          </User>
        ),
      },
      {
        header: "CATEGORY",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <p className="text-bold text-sm capitalize text-default-400">
              {row.original.category?.name || "Uncategorized"}
            </p>
          </div>
        ),
      },
      {
        header: "PRICE",
        cell: ({ row }) => <p className="text-bold text-sm">{row.original.price} Birr</p>,
      },
      {
        header: "STOCK",
        cell: ({ row }) => (
          <Chip color={row.original.stock > 5 ? "success" : "danger"} size="sm" variant="flat">
            {row.original.stock} in stock
          </Chip>
        ),
      },
      {
        header: "ACTIONS",
        cell: ({ row }) => (
          <div className="relative flex items-center gap-2">
            <Tooltip content="Edit product">
              <span
                className="text-lg text-default-400 cursor-pointer active:opacity-50"
                onClick={() => {
                  setSelectedProduct(row.original);
                  onOpen();
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                </svg>
              </span>
            </Tooltip>
            <Tooltip color="danger" content="Delete product">
              <span
                className="text-lg text-danger cursor-pointer active:opacity-50"
                onClick={() => {
                  setDeleteTarget({
                    type: "product",
                    id: row.original.id,
                    name: row.original.name,
                  });
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              </span>
            </Tooltip>
          </div>
        ),
      },
    ],
    [onOpen, productsOffset]
  );

  const categoryColumns = useMemo<ColumnDef<CategoryRow>[]>(
    () => [
      {
        header: "#",
        cell: ({ row }) => (
          <p className="text-sm text-default-500">{categoriesOffset + row.index + 1}</p>
        ),
      },
      {
        header: "NAME",
        cell: ({ row }) =>
          row.original.__editing ? (
            <Input size="sm" value={categoryEditName} onValueChange={setCategoryEditName} />
          ) : (
            row.original.name
          ),
      },
      {
        header: "SLUG",
        cell: ({ row }) => <span className="text-default-400">{row.original.slug}</span>,
      },
      {
        header: "PRODUCTS",
        cell: ({ row }) => (
          <Chip size="sm" variant="flat" color="primary">
            {row.original.productCount ?? row.original.products?.length ?? 0}
          </Chip>
        ),
      },
      {
        header: "ACTIONS",
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-2">
            {row.original.__editing ? (
              <>
                <Button
                  size="sm"
                  color="primary"
                  onPress={handleSaveCategoryEdit}
                  startContent={<FloppyDisk className="h-3.5 w-3.5" />}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  onPress={handleCancelCategoryEdit}
                  startContent={<X className="h-3.5 w-3.5" />}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="light"
                  type="button"
                  onPress={() => handleStartCategoryEdit(row.original)}
                  startContent={<PencilSimple className="h-3.5 w-3.5" />}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  color="danger"
                  variant="light"
                  onPress={() => {
                    setDeleteTarget({
                      type: "category",
                      id: row.original.id,
                      name: row.original.name,
                    });
                  }}
                  startContent={<Trash className="h-3.5 w-3.5" />}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        ),
      },
    ],
    [
      categoriesOffset,
      categoryEditName,
      handleCancelCategoryEdit,
      handleSaveCategoryEdit,
      handleStartCategoryEdit,
    ]
  );

  return (
    <div className="space-y-4">
      <Tabs aria-label="Products" color="primary" variant="underlined">
        <Tab key="products" title="Products">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-content1 p-4 rounded-xl shadow-sm">
              <Input
                isClearable
                className="w-full sm:max-w-[44%]"
                placeholder="Search by name..."
                startContent={
                  <svg className="text-default-300" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                }
                value={search}
                onValueChange={setSearch}
              />
              <Button
                color="primary"
                onPress={handleOpenCreate}
                startContent={<Plus className="h-4 w-4" />}
                className="w-full sm:w-auto"
              >
                Add New Product
              </Button>
            </div>

            <DataTable columns={productColumns} data={products} isLoading={isLoading} />

            <DataTablePagination
              pagination={{
                count: productsMeta?.total ?? 0,
                page: productsMeta?.page ?? productsPage,
                pageSize: productsMeta?.limit ?? productsLimit,
                totalPages: productsTotalPages,
              }}
              onPageChange={(page) => {
                const next = Math.min(Math.max(1, page), productsTotalPages);
                setProductsPage(next);
              }}
              onPageSizeChange={(size) => {
                setProductsLimit(size);
                setProductsPage(1);
              }}
            />
          </div>
        </Tab>

        <Tab key="categories" title="Categories">
          <Card className="mb-4">
            <CardBody>
              <form onSubmit={handleCreateCategory} className="flex flex-col sm:flex-row gap-3">
                <Input
                  label="Category Name"
                  placeholder="e.g. Smartphones"
                  value={categoryName}
                  onValueChange={setCategoryName}
                  isRequired
                />
                <Button
                  color="primary"
                  type="submit"
                  isLoading={createCategoryMutation.isPending}
                  startContent={<Tag className="h-4 w-4" />}
                >
                  Add Category
                </Button>
              </form>
            </CardBody>
          </Card>

          <DataTable
            columns={categoryColumns}
            data={categoriesWithEditState}
            isLoading={isLoadingCategories}
          />

          <DataTablePagination
            pagination={{
              count: categoriesMeta?.total ?? 0,
              page: categoriesMeta?.page ?? categoriesPage,
              pageSize: categoriesMeta?.limit ?? categoriesLimit,
              totalPages: categoriesTotalPages,
            }}
            onPageChange={(page) => {
              const next = Math.min(Math.max(1, page), categoriesTotalPages);
              setCategoriesPage(next);
            }}
            onPageSizeChange={(size) => {
              setCategoriesLimit(size);
              setCategoriesPage(1);
            }}
          />
        </Tab>
      </Tabs>

      <ProductModal isOpen={isOpen} onClose={handleCloseModal} product={selectedProduct} />

      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} size="md">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">Confirm Delete</ModalHeader>
          <ModalBody>
            <p>
              {deleteTarget
                ? `Are you sure you want to delete "${deleteTarget.name}"? This cannot be undone.`
                : ""}
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={() => setDeleteTarget(null)} startContent={<X className="h-4 w-4" />}>
              Cancel
            </Button>
            <Button
              color="danger"
              onPress={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "product") {
                  deleteProductMutation.mutate(deleteTarget.id);
                } else {
                  deleteCategoryMutation.mutate(deleteTarget.id);
                }
                setDeleteTarget(null);
              }}
              startContent={<Trash className="h-4 w-4" />}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
