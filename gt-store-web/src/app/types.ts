export interface Product {
  id: string;
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
  inStock: boolean;
  features: string[];
  ratingBreakdown?: Record<number, number>;
  reviewsList?: { rating: number, comment: string, userName: string, date: string }[];
}
