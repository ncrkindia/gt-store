db = db.getSiblingDB('gtstore_catalog');
db.products.deleteMany({});

db.products.insertMany([
  {
    "_id": ObjectId(),
    "name": "iPhone 15 Pro Max",
    "price": 1599,
    "salePrice": 1399,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1678652197950-92a74c4f5efd?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1678652197950-92a74c4f5efd?w=800&h=800&fit=crop",
      "https://images.unsplash.com/photo-1695048133142-1a20a5bf616f?w=500&h=500&fit=crop"
    ],
    "categoryIds": ["electronics"],
    "brand": "Apple",
    "description": "The ultimate iPhone with titanium design, powerful A17 Pro chip, and advanced camera system.",
    "features": ["6.7-inch Super Retina XDR display", "A17 Pro chip", "Pro camera system", "Action button"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "Samsung 65\" 4K Smart TV",
    "price": 1299,
    "salePrice": 899,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1552802875-1e3d06eb4c02?w=500&h=500&fit=crop"
    ],
    "categoryIds": ["electronics"],
    "brand": "Samsung",
    "description": "Crystal-clear 4K resolution with smart features and stunning picture quality.",
    "features": ["4K UHD Resolution", "Smart TV with Tizen OS", "HDR10+", "Voice Assistant"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "Sony WH-1000XM5 Headphones",
    "price": 399,
    "salePrice": 349,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=500&h=500&fit=crop"
    ],
    "categoryIds": ["electronics"],
    "brand": "Sony",
    "description": "Industry-leading noise canceling headphones with exceptional sound quality.",
    "features": ["Active Noise Cancellation", "30-hour battery life", "Premium sound quality", "Comfortable design"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "Men's Casual Denim Jacket",
    "price": 89,
    "salePrice": 59,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=600&fit=crop"
    ],
    "categoryIds": ["fashion"],
    "brand": "Levi's",
    "description": "Classic denim jacket perfect for any casual occasion.",
    "features": ["100% Cotton", "Button closure", "Multiple pockets", "Classic fit"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "Women's Running Shoes",
    "price": 120,
    "salePrice": 79,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop"
    ],
    "categoryIds": ["sports"],
    "brand": "Nike",
    "description": "Lightweight and comfortable running shoes for your daily workouts.",
    "features": ["Breathable mesh upper", "Cushioned sole", "Lightweight design", "Durable rubber outsole"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "Modern Laptop Desk",
    "price": 299,
    "salePrice": 199,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=500&h=500&fit=crop"
    ],
    "categoryIds": ["home"],
    "brand": "IKEA",
    "description": "Sleek and functional desk perfect for your home office setup.",
    "features": ["Solid wood construction", "Cable management", "Spacious surface", "Easy assembly"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "Bestseller Novel Collection",
    "price": 35,
    "salePrice": 24,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&h=500&fit=crop"
    ],
    "categoryIds": ["books"],
    "brand": "Penguin",
    "description": "Collection of award-winning novels from contemporary authors.",
    "features": ["Hardcover edition", "Premium paper quality", "5 book collection", "Gift packaging"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "Professional Makeup Kit",
    "price": 129,
    "salePrice": 89,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=500&h=500&fit=crop"
    ],
    "categoryIds": ["beauty"],
    "brand": "MAC",
    "description": "Complete makeup kit with everything you need for a flawless look.",
    "features": ["40+ products", "Professional quality", "Travel-friendly case", "Cruelty-free"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "MacBook Pro 14-inch",
    "price": 2299,
    "salePrice": 1999,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=500&h=500&fit=crop"
    ],
    "categoryIds": ["electronics"],
    "brand": "Apple",
    "description": "Powerful laptop with M3 Pro chip for professional workflows.",
    "features": ["M3 Pro chip", "14-inch Liquid Retina XDR display", "Up to 18 hours battery", "Three Thunderbolt 4 ports"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "Wireless Gaming Mouse",
    "price": 99,
    "salePrice": 79,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=500&h=500&fit=crop"
    ],
    "categoryIds": ["electronics"],
    "brand": "Logitech",
    "description": "High-performance wireless gaming mouse with customizable RGB lighting.",
    "features": ["25K DPI sensor", "Wireless connectivity", "RGB lighting", "Programmable buttons"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "Yoga Mat & Accessories Set",
    "price": 69,
    "salePrice": 45,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=500&h=500&fit=crop"
    ],
    "categoryIds": ["sports"],
    "brand": "Gaiam",
    "description": "Premium yoga mat with carrying strap and accessories for your practice.",
    "features": ["6mm thick cushioning", "Non-slip surface", "Eco-friendly material", "Includes blocks and strap"],
    "inStock": true,
    "_class": "com.gtstore.productservice.document.Product"
  },
  {
    "_id": ObjectId(),
    "name": "Smart Watch Series 9",
    "price": 499,
    "salePrice": 429,
    "rating": 0,
    "reviewCount": 0,
    "reviews": [],
    "ratingBreakdown": {},
    "images": [
      "https://images.unsplash.com/photo-1579586337278-3befd40fd17a?w=500&h=500&fit=crop",
      "https://images.unsplash.com/photo-1434493789847-2f02bbf1bf11?w=500&h=500&fit=crop"
    ],
    "categoryIds": ["electronics"],
    "brand": "Apple",
    "description": "Advanced health and fitness tracking with always-on Retina display.",
    "features": ["Always-on Retina display", "Blood oxygen sensor", "ECG app", "Water resistant"],
    "inStock": false,
    "_class": "com.gtstore.productservice.document.Product"
  }
]);
