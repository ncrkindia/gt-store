export interface ProductVariant {
  variantId: number;
  name: string;
  grouping: string;
  price?: number;
  salePrice?: number;
  images?: string[];
  features?: string[];
  inStock?: boolean;
  sequence?: number;
  priceHistory?: any[];
}

export interface Product {
  id: string;
  slug?: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  rating: number;
  reviews: number;
  image: string;
  images: string[];
  brand: string;
  category: string;
  categoryIds?: string[];
  inStock: boolean;
  features: string[];
  ratingBreakdown?: Record<number, number>;
  reviewsList?: Review[];
  promoted?: boolean;
  promotionPriority?: number;
  gstPercentage?: number;
  variants?: ProductVariant[];
}

export interface Review {
  rating: number;
  comment: string;
  userName: string;
  date: string;
  status?: string;
  images?: string[];
}
