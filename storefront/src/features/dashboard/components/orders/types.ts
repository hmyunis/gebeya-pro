export type OrderStatus =
  | "PENDING"
  | "APPROVED"
  | "SHIPPED"
  | "CANCELLED"
  | "REJECTED";

export type CustomerOrderItemApi = {
  id: number;
  productName: string;
  quantity: number;
  price: number;
  product?: {
    imageUrl?: string | null;
  } | null;
};

export type CustomerOrderApi = {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: string | null;
  receiptUrl: string | null;
  createdAt: string;
  items: CustomerOrderItemApi[];
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

export type CustomerOrderItem = {
  id: number;
  productName: string;
  quantity: number;
  price: number;
  imageUrl: string | null;
};

export type CustomerOrder = {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  shippingAddress: string | null;
  receiptUrl: string | null;
  createdAt: string;
  items: CustomerOrderItem[];
};

export type OrdersResponseApi = {
  data: CustomerOrderApi[];
  meta: PaginationMeta;
};

export type OrdersResponse = {
  data: CustomerOrder[];
  meta: PaginationMeta;
};

export const PAGE_SIZE = 10;

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  SHIPPED: "Shipped",
  CANCELLED: "Cancelled",
  REJECTED: "Rejected",
};

export const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-900 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-900 border-emerald-200",
  SHIPPED: "bg-sky-100 text-sky-900 border-sky-200",
  CANCELLED: "bg-zinc-200 text-zinc-800 border-zinc-300",
  REJECTED: "bg-rose-100 text-rose-900 border-rose-200",
};

export const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

