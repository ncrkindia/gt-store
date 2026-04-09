import type { Product } from '../types';

export interface Category {
  id: string;
  name: string;
  image: string;
  itemCount: number;
}

export const categories: Category[] = [
  { id: "electronics", name: "Electronics", image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=300&h=300&fit=crop", itemCount: 1240 },
  { id: "fashion", name: "Fashion", image: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=300&fit=crop", itemCount: 3450 },
  { id: "home", name: "Home & Furniture", image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=300&h=300&fit=crop", itemCount: 890 },
  { id: "books", name: "Books", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=300&h=300&fit=crop", itemCount: 2100 },
  { id: "beauty", name: "Beauty", image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=300&h=300&fit=crop", itemCount: 760 },
  { id: "sports", name: "Sports & Fitness", image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=300&h=300&fit=crop", itemCount: 540 },
  { id: "toys", name: "Toys & Games", image: "https://images.unsplash.com/photo-1558060370-d644479cb6f7?w=300&h=300&fit=crop", itemCount: 980 },
  { id: "grocery", name: "Grocery", image: "https://images.unsplash.com/photo-1543168256-418811576931?w=300&h=300&fit=crop", itemCount: 1560 },
];

export const products: Product[] = [
  {
    id: "1",
    name: "iPhone 15 Pro Max",
    price: 1399,
    originalPrice: 1599,
    discount: 13,
    rating: 4.8,
    reviews: 2453,
    image: "https://images.unsplash.com/photo-1678652197950-92a74c4f5efd?w=500&h=500&fit=crop",
    images: [],
    category: "electronics",
    brand: "Apple",
    description: "The ultimate iPhone with titanium design, powerful A17 Pro chip, and advanced camera system.",
    features: ["6.7-inch Super Retina XDR display", "A17 Pro chip", "Pro camera system", "Action button"],
    inStock: true
  },
  {
    id: "2",
    name: "Samsung 65\" 4K Smart TV",
    price: 899,
    originalPrice: 1299,
    discount: 31,
    rating: 4.6,
    reviews: 1876,
    image: "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&h=500&fit=crop",
    images: [],
    category: "electronics",
    brand: "Samsung",
    description: "Crystal-clear 4K resolution with smart features and stunning picture quality.",
    features: ["4K UHD Resolution", "Smart TV with Tizen OS", "HDR10+", "Voice Assistant"],
    inStock: true
  },
  {
    id: "3",
    name: "Sony WH-1000XM5 Headphones",
    price: 349,
    originalPrice: 399,
    discount: 13,
    rating: 4.9,
    reviews: 3421,
    image: "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&h=500&fit=crop",
    images: [],
    category: "electronics",
    brand: "Sony",
    description: "Industry-leading noise canceling headphones with exceptional sound quality.",
    features: ["Active Noise Cancellation", "30-hour battery life", "Premium sound quality", "Comfortable design"],
    inStock: true
  },
  {
    id: "4",
    name: "Men's Casual Denim Jacket",
    price: 59,
    originalPrice: 89,
    discount: 34,
    rating: 4.3,
    reviews: 892,
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=500&fit=crop",
    images: [],
    category: "fashion",
    brand: "Levi's",
    description: "Classic denim jacket perfect for any casual occasion.",
    features: ["100% Cotton", "Button closure", "Multiple pockets", "Classic fit"],
    inStock: true
  },
  {
    id: "5",
    name: "Women's Running Shoes",
    price: 79,
    originalPrice: 120,
    discount: 34,
    rating: 4.7,
    reviews: 1543,
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
    images: [],
    category: "sports",
    brand: "Nike",
    description: "Lightweight and comfortable running shoes for your daily workouts.",
    features: ["Breathable mesh upper", "Cushioned sole", "Lightweight design", "Durable rubber outsole"],
    inStock: true
  },
  {
    id: "6",
    name: "Modern Laptop Desk",
    price: 199,
    originalPrice: 299,
    discount: 33,
    rating: 4.5,
    reviews: 678,
    image: "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=500&h=500&fit=crop",
    images: [],
    category: "home",
    brand: "IKEA",
    description: "Sleek and functional desk perfect for your home office setup.",
    features: ["Solid wood construction", "Cable management", "Spacious surface", "Easy assembly"],
    inStock: true
  },
  {
    id: "7",
    name: "Bestseller Novel Collection",
    price: 24,
    originalPrice: 35,
    discount: 31,
    rating: 4.8,
    reviews: 2341,
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&h=500&fit=crop",
    images: [],
    category: "books",
    brand: "Penguin",
    description: "Collection of award-winning novels from contemporary authors.",
    features: ["Hardcover edition", "Premium paper quality", "5 book collection", "Gift packaging"],
    inStock: true
  },
  {
    id: "8",
    name: "Professional Makeup Kit",
    price: 89,
    originalPrice: 129,
    discount: 31,
    rating: 4.6,
    reviews: 1234,
    image: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&h=500&fit=crop",
    images: [],
    category: "beauty",
    brand: "MAC",
    description: "Complete makeup kit with everything you need for a flawless look.",
    features: ["40+ products", "Professional quality", "Travel-friendly case", "Cruelty-free"],
    inStock: true
  },
  {
    id: "9",
    name: "MacBook Pro 14-inch",
    price: 1999,
    originalPrice: 2299,
    discount: 13,
    rating: 4.9,
    reviews: 3876,
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop",
    images: [],
    category: "electronics",
    brand: "Apple",
    description: "Powerful laptop with M3 Pro chip for professional workflows.",
    features: ["M3 Pro chip", "14-inch Liquid Retina XDR display", "Up to 18 hours battery", "Three Thunderbolt 4 ports"],
    inStock: true
  },
  {
    id: "10",
    name: "Wireless Gaming Mouse",
    price: 79,
    originalPrice: 99,
    discount: 20,
    rating: 4.7,
    reviews: 1567,
    image: "https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&h=500&fit=crop",
    images: [],
    category: "electronics",
    brand: "Logitech",
    description: "High-performance wireless gaming mouse with customizable RGB lighting.",
    features: ["25K DPI sensor", "Wireless connectivity", "RGB lighting", "Programmable buttons"],
    inStock: true
  },
  {
    id: "11",
    name: "Yoga Mat & Accessories Set",
    price: 45,
    originalPrice: 69,
    discount: 35,
    rating: 4.4,
    reviews: 892,
    image: "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&h=500&fit=crop",
    images: [],
    category: "sports",
    brand: "Gaiam",
    description: "Premium yoga mat with carrying strap and accessories for your practice.",
    features: ["6mm thick cushioning", "Non-slip surface", "Eco-friendly material", "Includes blocks and strap"],
    inStock: true
  },
  {
    id: "12",
    name: "Smart Watch Series 9",
    price: 429,
    originalPrice: 499,
    discount: 14,
    rating: 4.8,
    reviews: 2987,
    image: "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&h=500&fit=crop",
    images: [],
    category: "electronics",
    brand: "Apple",
    description: "Advanced health and fitness tracking with always-on Retina display.",
    features: ["Always-on Retina display", "Blood oxygen sensor", "ECG app", "Water resistant"],
    inStock: true
  }
];

export interface Order {
  id: string;
  date: string;
  status: "delivered" | "shipped" | "processing" | "cancelled";
  total: number;
  items: { product: Product; quantity: number; }[];
}

export const mockOrders: Order[] = [
  {
    id: "ORD-2024-001",
    date: "2024-03-15",
    status: "delivered",
    total: 1399,
    items: [{ product: products[0], quantity: 1 }]
  },
  {
    id: "ORD-2024-002",
    date: "2024-03-20",
    status: "shipped",
    total: 428,
    items: [{ product: products[2], quantity: 1 }, { product: products[4], quantity: 1 }]
  },
  {
    id: "ORD-2024-003",
    date: "2024-03-25",
    status: "processing",
    total: 199,
    items: [{ product: products[5], quantity: 1 }]
  }
];
