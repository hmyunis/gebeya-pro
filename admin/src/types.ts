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
  isActive: boolean;
  imageUrl?: string;
  imageUrls?: string[] | null;
  merchantId?: number | null;
  createdById?: number | null;
  bankAccountId?: number | null;
  createdBy?: {
    id: number;
    firstName?: string | null;
    loginUsername?: string | null;
    username?: string | null;
  } | null;
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

export type OrderStatusCounts = Record<OrderStatus, number>;

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
  telegramId?: string | null;
  role?: "admin" | "merchant" | "customer";
  avatarUrl?: string;
  loginUsername?: string | null;
  isBanned?: boolean;
}

export interface CustomerOrderStats {
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  statusCounts: OrderStatusCounts;
}

export interface CustomerListItem extends User {
  role: 'customer';
  createdAt: string;
  updatedAt: string;
  orderStats: CustomerOrderStats;
}

export interface CustomerReportPoint {
  month: string;
  label: string;
  orderCount: number;
  totalSpent: number;
}

export interface CustomerDetailReport {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  statusCounts: OrderStatusCounts;
  monthlyTrend: CustomerReportPoint[];
  topShippingAddresses: Array<{
    shippingAddress: string;
    count: number;
  }>;
}

export interface CustomerDetailResponse {
  customer: CustomerListItem;
  report: CustomerDetailReport;
}

export interface CreatedCustomerCredentials {
  username: string;
  password: string;
}

export interface CreateCustomerResponse {
  customer: User;
  credentials: CreatedCustomerCredentials;
}

export interface Order {
  id: number;
  totalAmount: number;
  status: OrderStatus;
  shippingAddress: string;
  receiptUrl?: string;
  createdAt: string;
  user: User;
  items: OrderItem[];
}

export type BankAccountStatus = 'ACTIVE' | 'INACTIVE';

export interface BankAccount {
  id: number;
  bankName: string;
  logoUrl?: string | null;
  accountHolderName: string;
  accountNumber: string;
  status: BankAccountStatus;
  createdAt: string;
  updatedAt: string;
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

export interface MerchantProfile {
  id: number;
  userId: number;
  phoneNumber: string;
  itemTypes: string[];
  address: string;
  profilePictureUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface MerchantUser extends User {
  role: "merchant";
  merchantProfile?: MerchantProfile;
}

export interface MerchantDetailUser extends MerchantUser {
  createdAt: string;
  updatedAt: string;
}

export interface MerchantDetailReportPoint {
  month: string;
  label: string;
  orderCount: number;
  totalRevenue: number;
}

export interface MerchantTopCustomer {
  customerId: number;
  firstName: string;
  username?: string | null;
  loginUsername?: string | null;
  totalOrders: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

export interface MerchantProductSummary {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  outOfStockProducts: number;
  lastProductCreatedAt: string | null;
}

export interface MerchantDetailReport {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  firstOrderAt: string | null;
  lastOrderAt: string | null;
  customerCount: number;
  statusCounts: OrderStatusCounts;
  monthlyTrend: MerchantDetailReportPoint[];
  topShippingAddresses: Array<{
    shippingAddress: string;
    count: number;
  }>;
  topCustomers: MerchantTopCustomer[];
  productSummary: MerchantProductSummary;
}

export interface MerchantDetailResponse {
  merchant: MerchantDetailUser;
  report: MerchantDetailReport;
}

export type MerchantApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MerchantApplication {
  id: number;
  fullName: string;
  phoneNumber: string;
  itemTypes: string[];
  address: string;
  profilePictureUrl?: string | null;
  telegramId: string;
  telegramUsername?: string | null;
  telegramFirstName?: string | null;
  telegramPhotoUrl?: string | null;
  status: MerchantApplicationStatus;
  merchantUserId?: number | null;
  processedByUserId?: number | null;
  processedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  merchantUser?: User | null;
  processedBy?: User | null;
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getImageUrl(path: string | null) {
  if (!path) return "https://via.placeholder.com/150";
  if (path.startsWith('http')) return path;
  const domain = API_BASE.replace('/v1', '');
  return `${domain}${path}`;
}
