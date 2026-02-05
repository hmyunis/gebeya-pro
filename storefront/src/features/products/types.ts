export type Product = {
  id: number;
  name: string;
  price: number | string;
  imageUrl?: string;
  description?: string;
  category?: { id?: number; name?: string };
  stock?: number;
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

