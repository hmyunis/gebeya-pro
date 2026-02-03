export interface Category {
  id: number;
  name: string;
  slug: string;
  products?: Product[];
  productCount?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  category?: Category;
  createdAt: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export type OrderStatus = 'PENDING' | 'APPROVED' | 'SHIPPED' | 'CANCELLED' | 'REJECTED';

export interface OrderItem {
  id: number;
  productName: string;
  price: number;
  quantity: number;
}

export interface User {
  id: number;
  firstName: string;
  username?: string;
  telegramId: string;
  avatarUrl?: string;
}

export interface Order {
  id: number;
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: string;
  createdAt: string;
  user: User;
  items: OrderItem[];
}

export interface ActivityLog {
  id: number;
  userId: number | null;
  userRole: string | null;
  method: string;
  path: string;
  payload: string | null;
  ipAddress: string | null;
  timestamp: string;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getImageUrl(path: string | null) {
  if (!path) return "https://via.placeholder.com/150";
  if (path.startsWith('http')) return path;
  const domain = API_BASE.replace('/v1', '');
  return `${domain}${path}`;
}
