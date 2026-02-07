export type Product = {
  id: number;
  name: string;
  price: number | string;
  imageUrl?: string;
  imageUrls?: string[] | null;
  description?: string;
  category?: { id?: number; name?: string };
  stock?: number;
  merchantId?: number | null;
  createdById?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Category = {
  id: number;
  name: string;
  productCount?: number;
};

export type PriceRange = {
  id: string;
  min: number;
  max: number;
  label?: string;
};
